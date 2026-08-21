'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { FiEdit3 } from 'react-icons/fi';
import { adminApi } from '@/services/api';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Input from '../ui/Input';
import { ADM } from './adminModuleLayout';

export default function ESignatureAdminModule() {
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [documentType, setDocumentType] = useState('AUTHORIZATION');
  const [signText, setSignText] = useState('');
  const [signingId, setSigningId] = useState<string | null>(null);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['admin-esignature'],
    queryFn: () => adminApi.getSignatureRequests(),
  });

  const createMut = useMutation({
    mutationFn: () => adminApi.createSignatureRequest({ title, documentType }),
    onSuccess: () => {
      toast.success('Demande créée');
      setTitle('');
      qc.invalidateQueries({ queryKey: ['admin-esignature'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const signMut = useMutation({
    mutationFn: ({ id, signatureData }: { id: string; signatureData: string }) =>
      adminApi.signSignatureRequest(id, signatureData),
    onSuccess: () => {
      toast.success('Document signé');
      setSignText('');
      setSigningId(null);
      qc.invalidateQueries({ queryKey: ['admin-esignature'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className={ADM.root}>
      <h2 className={ADM.h2}>
        <FiEdit3 className="mr-2 inline h-5 w-5" />
        Parapheur / signature électronique
      </h2>
      <p className={ADM.intro}>
        Créez des demandes de signature (bulletins, autorisations, contrats) et enregistrez la signature
        manuscrite numérique.
      </p>

      <Card className="mb-4 grid gap-2 p-4 sm:grid-cols-3">
        <Input label="Titre" value={title} onChange={(e) => setTitle(e.target.value)} />
        <label className="text-sm">
          <span className="mb-1 block text-gray-600">Type</span>
          <select
            className="w-full rounded-lg border px-3 py-2"
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
          >
            <option value="AUTHORIZATION">Autorisation</option>
            <option value="REPORT_CARD">Bulletin</option>
            <option value="CONTRACT">Contrat</option>
            <option value="CERTIFICATE">Certificat</option>
            <option value="OTHER">Autre</option>
          </select>
        </label>
        <Button
          size="sm"
          className="self-end"
          disabled={!title.trim() || createMut.isPending}
          onClick={() => createMut.mutate()}
        >
          Créer la demande
        </Button>
      </Card>

      {isLoading ? (
        <Card className="p-6 text-center text-gray-500">Chargement…</Card>
      ) : (
        <div className="space-y-2">
          {(requests as Array<{ id: string; title: string; status: string; documentType: string }>).map(
            (r) => (
              <Card key={r.id} className="space-y-2 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{r.title}</p>
                    <p className="text-sm text-gray-500">
                      {r.documentType} · {r.status}
                    </p>
                  </div>
                  {r.status !== 'SIGNED' ? (
                    <Button size="sm" variant="secondary" onClick={() => setSigningId(r.id)}>
                      Signer
                    </Button>
                  ) : null}
                </div>
                {signingId === r.id ? (
                  <div className="flex flex-wrap gap-2">
                    <Input
                      label="Signature (nom / paraphe)"
                      value={signText}
                      onChange={(e) => setSignText(e.target.value)}
                    />
                    <Button
                      size="sm"
                      className="self-end"
                      onClick={() => signMut.mutate({ id: r.id, signatureData: signText })}
                      disabled={!signText.trim() || signMut.isPending}
                    >
                      Confirmer
                    </Button>
                  </div>
                ) : null}
              </Card>
            ),
          )}
        </div>
      )}
    </div>
  );
}
