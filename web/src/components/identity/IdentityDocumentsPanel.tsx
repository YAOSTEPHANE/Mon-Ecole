'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studentApi, adminApi, uploadIdentityDocument } from '../../services/api';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import toast from 'react-hot-toast';
import {
  FiFileText,
  FiImage,
  FiTrash2,
  FiUpload,
  FiExternalLink,
  FiShield,
  FiInfo,
} from 'react-icons/fi';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const TYPE_LABELS: Record<string, string> = {
  NATIONAL_ID: "Carte nationale d'identité",
  BIRTH_CERTIFICATE: 'Extrait / acte de naissance',
  PASSPORT: 'Passeport',
  RESIDENCE_PERMIT: 'Titre de séjour',
  PHOTO_ID: "Photo d'identité",
  OTHER: 'Autre document',
};

const TYPE_OPTIONS = Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }));

export type IdentityDocumentsPanelProps = {
  mode: 'student' | 'admin';
  /** Requis si mode admin */
  studentId?: string;
};

const IdentityDocumentsPanel = ({ mode, studentId }: IdentityDocumentsPanelProps) => {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [docType, setDocType] = useState<string>('NATIONAL_ID');
  const [labelOther, setLabelOther] = useState('');
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);

  const queryKey = ['identity-documents', mode, studentId ?? 'self'];

  const { data: documents, isLoading } = useQuery({
    queryKey,
    queryFn: () =>
      mode === 'admin' && studentId
        ? adminApi.getStudentIdentityDocuments(studentId)
        : studentApi.getIdentityDocuments(),
    enabled: mode === 'student' || (mode === 'admin' && !!studentId),
  });

  const deleteMutation = useMutation({
    mutationFn: (docId: string) =>
      mode === 'admin' && studentId
        ? adminApi.deleteStudentIdentityDocument(studentId, docId)
        : studentApi.deleteIdentityDocument(docId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['student-profile'] });
      toast.success('Document supprimé');
    },
    onError: (e: any) => {
      toast.error(e.response?.data?.error || 'Suppression impossible');
    },
  });

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Fichier trop volumineux (max. 10 Mo)');
      return;
    }

    if (docType === 'OTHER' && !labelOther.trim()) {
      toast.error('Précisez le libellé pour le type « Autre »');
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('identityDocument', file);
      fd.append('type', docType);
      if (docType === 'OTHER') {
        fd.append('label', labelOther.trim());
      }
      if (notes.trim()) {
        fd.append('notes', notes.trim());
      }
      if (mode === 'admin' && studentId) {
        fd.append('studentId', studentId);
      }

      await uploadIdentityDocument(fd);
      queryClient.invalidateQueries({ queryKey });
      toast.success('Document enregistré');
      setNotes('');
      setLabelOther('');
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Envoi impossible");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const fileIcon = (mime?: string | null) => {
    if (mime?.startsWith('image/')) return <FiImage className="w-5 h-5 text-emerald-600" />;
    return <FiFileText className="w-5 h-5 text-cptb-blue" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 text-white shadow-md">
          <FiShield className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">Documents d&apos;identité</h3>
          <p className="text-sm text-gray-500 mt-0.5 max-w-2xl">
            CNI, extrait de naissance, passeport, photo… Formats : PDF, Word ou image (max. 10 Mo). Les fichiers sont
            stockés de façon sécurisée sur le serveur de l&apos;établissement.
          </p>
        </div>
      </div>

      <Card className="border border-cptb-gold/20 bg-amber-50/40">
        <p className="text-xs text-stone-800 flex items-start gap-2">
          <FiInfo className="w-4 h-4 shrink-0 mt-0.5" />
          {mode === 'student'
            ? 'Vous pouvez déposer et retirer vos propres pièces. L’administration peut aussi en ajouter depuis votre dossier.'
            : 'Les documents sont visibles par l’élève sur son espace. Indiquez le type de pièce pour faciliter le traitement du dossier.'}
        </p>
      </Card>

      <Card>
        <h4 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
          <FiUpload className="w-4 h-4 text-cptb-gold-dark" />
          Ajouter une pièce
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="id-doc-type" className="block text-sm font-medium text-gray-700 mb-1">
              Type de document
            </label>
            <select
              id="id-doc-type"
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-cptb-gold/50"
            >
              {TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          {docType === 'OTHER' && (
            <div>
              <label htmlFor="id-doc-label" className="block text-sm font-medium text-gray-700 mb-1">
                Précision (obligatoire)
              </label>
              <input
                id="id-doc-label"
                type="text"
                value={labelOther}
                onChange={(e) => setLabelOther(e.target.value)}
                placeholder="Ex. Récépissé, attestation…"
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm"
              />
            </div>
          )}
        </div>
        <div className="mb-4">
          <label htmlFor="id-doc-notes" className="block text-sm font-medium text-gray-700 mb-1">
            Commentaire (optionnel)
          </label>
          <input
            id="id-doc-notes"
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex. Recto-verso scanné"
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm"
          />
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
          className="hidden"
          onChange={handleFile}
          disabled={uploading}
        />
        <Button
          type="button"
          variant="secondary"
          disabled={uploading}
          isLoading={uploading}
          onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-2"
        >
          <FiUpload className="w-4 h-4" />
          Choisir un fichier
        </Button>
      </Card>

      <Card>
        <h4 className="text-sm font-bold text-gray-800 mb-4">Pièces enregistrées</h4>
        {isLoading ? (
          <p className="text-gray-500 text-sm py-6 text-center">Chargement…</p>
        ) : !documents?.length ? (
          <p className="text-gray-500 text-sm py-8 text-center border border-dashed border-gray-200 rounded-xl">
            Aucun document pour l&apos;instant.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {(documents as any[]).map((doc) => (
              <li
                key={doc.id}
                className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 first:pt-0"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="mt-0.5">{fileIcon(doc.mimeType)}</div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900">
                      {TYPE_LABELS[doc.type] || doc.type}
                      {doc.type === 'OTHER' && doc.label && (
                        <span className="text-gray-600 font-normal"> — {doc.label}</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{doc.originalName}</p>
                    <div className="flex flex-wrap gap-2 mt-2 items-center">
                      <Badge variant="secondary" size="sm">
                        {doc.uploadedBy
                          ? `${doc.uploadedBy.firstName} ${doc.uploadedBy.lastName}${
                              doc.uploadedBy.role === 'ADMIN' ? ' · Admin' : ''
                            }`
                          : '—'}
                      </Badge>
                      <span className="text-xs text-gray-400">
                        {format(new Date(doc.createdAt), 'd MMM yyyy HH:mm', { locale: fr })}
                      </span>
                      {doc.fileSize != null && (
                        <span className="text-xs text-gray-400">
                          {(doc.fileSize / 1024).toFixed(0)} Ko
                        </span>
                      )}
                    </div>
                    {doc.notes && <p className="text-sm text-gray-600 mt-2 italic">{doc.notes}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-medium text-cptb-blue hover:text-cptb-blue-dark"
                  >
                    <FiExternalLink className="w-4 h-4" />
                    Ouvrir
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Supprimer définitivement ce document ?')) {
                        deleteMutation.mutate(doc.id);
                      }
                    }}
                    disabled={deleteMutation.isPending}
                    className="inline-flex items-center gap-1 text-sm font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
                  >
                    <FiTrash2 className="w-4 h-4" />
                    Supprimer
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};

export default IdentityDocumentsPanel;
