'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { FiShoppingCart } from 'react-icons/fi';
import { adminApi } from '@/services/api';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Input from '../ui/Input';
import { ADM } from './adminModuleLayout';

type Bid = { id: string; vendorName: string; amount: number; selected?: boolean };
type ProcReq = {
  id: string;
  title: string;
  status: string;
  estimatedAmount?: number | null;
  bids: Bid[];
};

export default function ProcurementAdminModule() {
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [estimatedAmount, setEstimatedAmount] = useState('');
  const [bidForms, setBidForms] = useState<Record<string, { vendorName: string; amount: string }>>({});

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['admin-procurement'],
    queryFn: () => adminApi.getProcurementRequests(),
  });

  const createMut = useMutation({
    mutationFn: () =>
      adminApi.createProcurementRequest({
        title,
        estimatedAmount: estimatedAmount ? Number(estimatedAmount) : undefined,
      }),
    onSuccess: () => {
      toast.success('Demande créée');
      setTitle('');
      setEstimatedAmount('');
      qc.invalidateQueries({ queryKey: ['admin-procurement'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      adminApi.updateProcurementStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-procurement'] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const bidMut = useMutation({
    mutationFn: ({ id, vendorName, amount }: { id: string; vendorName: string; amount: number }) =>
      adminApi.addProcurementBid(id, { vendorName, amount }),
    onSuccess: () => {
      toast.success('Offre ajoutée');
      qc.invalidateQueries({ queryKey: ['admin-procurement'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const selectMut = useMutation({
    mutationFn: ({ id, bidId }: { id: string; bidId: string }) =>
      adminApi.selectProcurementBid(id, bidId),
    onSuccess: () => {
      toast.success('Offre retenue');
      qc.invalidateQueries({ queryKey: ['admin-procurement'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className={ADM.root}>
      <h2 className={ADM.h2}>
        <FiShoppingCart className="mr-2 inline h-5 w-5" />
        Achats & marchés
      </h2>
      <p className={ADM.intro}>
        Demandes d’achat, collecte d’offres (AO simplifié) et sélection du fournisseur.
      </p>

      <Card className="mb-4 grid gap-2 p-4 sm:grid-cols-3">
        <Input label="Titre" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Input
          label="Budget estimé"
          value={estimatedAmount}
          onChange={(e) => setEstimatedAmount(e.target.value)}
        />
        <Button
          size="sm"
          className="self-end"
          disabled={!title.trim() || createMut.isPending}
          onClick={() => createMut.mutate()}
        >
          Nouvelle demande
        </Button>
      </Card>

      {isLoading ? (
        <Card className="p-6 text-center text-gray-500">Chargement…</Card>
      ) : (
        <div className="space-y-3">
          {(requests as ProcReq[]).map((r) => {
            const form = bidForms[r.id] ?? { vendorName: '', amount: '' };
            return (
              <Card key={r.id} className="space-y-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{r.title}</p>
                    <p className="text-sm text-gray-500">
                      {r.status}
                      {r.estimatedAmount != null ? ` · estimé ${r.estimatedAmount}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {['SUBMITTED', 'APPROVED', 'ORDERED', 'RECEIVED', 'CANCELLED'].map((st) => (
                      <Button
                        key={st}
                        size="sm"
                        variant="secondary"
                        onClick={() => statusMut.mutate({ id: r.id, status: st })}
                      >
                        {st}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  {(r.bids ?? []).map((b) => (
                    <div key={b.id} className="flex items-center justify-between text-sm">
                      <span>
                        {b.vendorName} — {b.amount}
                        {b.selected ? ' ✓ retenue' : ''}
                      </span>
                      {!b.selected ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => selectMut.mutate({ id: r.id, bidId: b.id })}
                        >
                          Retenir
                        </Button>
                      ) : null}
                    </div>
                  ))}
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <Input
                    label="Fournisseur"
                    value={form.vendorName}
                    onChange={(e) =>
                      setBidForms({ ...bidForms, [r.id]: { ...form, vendorName: e.target.value } })
                    }
                  />
                  <Input
                    label="Montant offre"
                    value={form.amount}
                    onChange={(e) =>
                      setBidForms({ ...bidForms, [r.id]: { ...form, amount: e.target.value } })
                    }
                  />
                  <Button
                    size="sm"
                    className="self-end"
                    onClick={() =>
                      bidMut.mutate({
                        id: r.id,
                        vendorName: form.vendorName,
                        amount: Number(form.amount),
                      })
                    }
                  >
                    Ajouter offre
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
