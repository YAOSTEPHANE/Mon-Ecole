'use client';

import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, uploadTeacherAdministrativeDocument } from '../../services/api';
import Card from '../ui/Card';
import Button from '../ui/Button';
import toast from 'react-hot-toast';
import { FiFileText, FiImage, FiTrash2, FiUpload, FiExternalLink, FiBriefcase } from 'react-icons/fi';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const TYPE_LABELS: Record<string, string> = {
  CONTRACT: 'Contrat',
  DIPLOMA_COPY: 'Copie de diplôme',
  HR_LETTER: 'Courrier RH',
  CERTIFICATE: 'Attestation / certificat',
  OTHER: 'Autre document',
};

const TYPE_OPTIONS = Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }));

type TeacherAdminDocumentsPanelProps = {
  teacherId: string;
  documents: Array<{
    id: string;
    type: string;
    label?: string | null;
    fileUrl: string;
    originalName: string;
    mimeType?: string | null;
    notes?: string | null;
    createdAt: string;
    uploadedBy?: { firstName?: string; lastName?: string; role?: string };
  }>;
};

const TeacherAdminDocumentsPanel: React.FC<TeacherAdminDocumentsPanelProps> = ({
  teacherId,
  documents,
}) => {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [docType, setDocType] = useState('CONTRACT');
  const [labelOther, setLabelOther] = useState('');
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['teacher', teacherId] });
  };

  const deleteMutation = useMutation({
    mutationFn: (docId: string) => adminApi.deleteTeacherAdministrativeDocument(teacherId, docId),
    onSuccess: () => {
      invalidate();
      toast.success('Document supprimé');
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Suppression impossible'),
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
      fd.append('teacherAdminDocument', file);
      fd.append('type', docType);
      fd.append('teacherId', teacherId);
      if (docType === 'OTHER') fd.append('label', labelOther.trim());
      if (notes.trim()) fd.append('notes', notes.trim());
      await uploadTeacherAdministrativeDocument(fd);
      invalidate();
      toast.success('Document enregistré');
      setNotes('');
      setLabelOther('');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Envoi impossible');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const fileIcon = (mime?: string | null) => {
    if (mime?.startsWith('image/')) return <FiImage className="w-5 h-5 text-emerald-600" aria-hidden />;
    return <FiFileText className="w-5 h-5 text-indigo-600" aria-hidden />;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 text-white shadow-md">
          <FiBriefcase className="w-6 h-6" aria-hidden />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">Contrats &amp; documents administratifs</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            PDF ou image (max. 10 Mo). Accès réservé à l&apos;administration.
          </p>
        </div>
      </div>

      <Card>
        <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
          <FiUpload className="w-4 h-4 text-indigo-600" aria-hidden />
          Ajouter un document
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <div>
            <label htmlFor="teacher-admin-doc-type" className="block text-xs font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              id="teacher-admin-doc-type"
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
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
              <label htmlFor="teacher-admin-doc-label" className="block text-xs font-medium text-gray-700 mb-1">
                Libellé
              </label>
              <input
                id="teacher-admin-doc-label"
                value={labelOther}
                onChange={(e) => setLabelOther(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                placeholder="Précisez le type de document"
              />
            </div>
          )}
        </div>
        <label htmlFor="teacher-admin-doc-notes" className="block text-xs font-medium text-gray-700 mb-1">
          Notes (optionnel)
        </label>
        <textarea
          id="teacher-admin-doc-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm mb-3"
        />
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.doc,.docx,image/*"
          className="hidden"
          onChange={handleFile}
          aria-label="Choisir un fichier administratif"
        />
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? 'Envoi…' : 'Choisir un fichier'}
        </Button>
      </Card>

      <div className="space-y-2">
        {documents?.length ? (
          documents.map((d) => (
            <Card key={d.id} className="p-3 flex flex-wrap items-start justify-between gap-2">
              <div className="flex gap-3 min-w-0">
                <div className="shrink-0 mt-0.5">{fileIcon(d.mimeType)}</div>
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {TYPE_LABELS[d.type] || d.type}
                    {d.label ? ` — ${d.label}` : ''}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{d.originalName}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {format(new Date(d.createdAt), 'd MMM yyyy HH:mm', { locale: fr })}
                    {d.uploadedBy
                      ? ` · ${d.uploadedBy.firstName ?? ''} ${d.uploadedBy.lastName ?? ''}`.trim()
                      : ''}
                  </p>
                  {d.notes ? <p className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">{d.notes}</p> : null}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={d.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                  title="Ouvrir"
                  aria-label="Ouvrir le document"
                >
                  <FiExternalLink className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  title="Supprimer"
                  aria-label="Supprimer le document"
                  onClick={() => {
                    if (window.confirm('Supprimer ce document ?')) deleteMutation.mutate(d.id);
                  }}
                >
                  <FiTrash2 className="w-4 h-4" />
                </button>
              </div>
            </Card>
          ))
        ) : (
          <p className="text-sm text-gray-500">Aucun document enregistré.</p>
        )}
      </div>
    </div>
  );
};

export default TeacherAdminDocumentsPanel;
