import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLibraryManagement } from '@/contexts/LibraryManagementContext';
import Card from '../../ui/Card';
import Button from '../../ui/Button';
import Modal from '../../ui/Modal';
import Badge from '../../ui/Badge';
import { FiPlus } from 'react-icons/fi';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { formatFCFA } from '../../../utils/currency';

const LibraryPenaltiesPanel: React.FC = () => {
  const queryClient = useQueryClient();
  const { libraryApi, scope } = useLibraryManagement();
  const [paidFilter, setPaidFilter] = useState<'all' | 'false' | 'true'>('false');
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [loanId, setLoanId] = useState('');

  const { data: penalties, isLoading } = useQuery({
    queryKey: ['library-penalties', scope, paidFilter],
    queryFn: () =>
      paidFilter === 'all'
        ? libraryApi.getLibraryPenalties()
        : libraryApi.getLibraryPenalties({ paid: paidFilter }),
  });

  const { data: users } = useQuery({
    queryKey: ['library-users-pen', scope],
    queryFn: () => libraryApi.getAllUsers({ isActive: true }),
  });

  const { data: loans } = useQuery({
    queryKey: ['library-loans-pen', scope],
    queryFn: () => libraryApi.getLibraryLoans({ status: 'ACTIVE' }),
  });

  const createMut = useMutation({
    mutationFn: () =>
      libraryApi.createLibraryPenalty({
        userId,
        amount: parseFloat(amount.replace(',', '.')),
        reason: reason.trim(),
        loanId: loanId || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library-penalties'] });
      toast.success('Pénalité enregistrée');
      setOpen(false);
      setUserId('');
      setAmount('');
      setReason('');
      setLoanId('');
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.error || 'Erreur'),
  });

  const payMut = useMutation({
    mutationFn: (id: string) => libraryApi.updateLibraryPenalty(id, { paid: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library-penalties'] });
      toast.success('Marqué comme payé');
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.error || 'Erreur'),
  });

  const waiveMut = useMutation({
    mutationFn: (id: string) => libraryApi.updateLibraryPenalty(id, { waived: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library-penalties'] });
      toast.success('Pénalité annulée');
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.error || 'Erreur'),
  });

  const list = (penalties as any[]) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
        <div className="flex gap-2">
          {(['false', 'true', 'all'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPaidFilter(p)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                paidFilter === p
                  ? 'bg-rose-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {p === 'false' ? 'Impayés' : p === 'true' ? 'Payés' : 'Tous'}
            </button>
          ))}
        </div>
        <Button type="button" onClick={() => setOpen(true)}>
          <FiPlus className="w-4 h-4 mr-2" />
          Nouvelle pénalité
        </Button>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Chargement…</div>
        ) : list.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Aucune pénalité.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left">
                  <th className="py-3 px-4 font-semibold">Personne</th>
                  <th className="py-3 px-4 font-semibold">Motif</th>
                  <th className="py-3 px-4 font-semibold text-right">Montant</th>
                  <th className="py-3 px-4 font-semibold">Date</th>
                  <th className="py-3 px-4 font-semibold">État</th>
                  <th className="py-3 px-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((p: any) => (
                  <tr key={p.id} className="border-b border-gray-100">
                    <td className="py-3 px-4">
                      {p.user?.firstName} {p.user?.lastName}
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <div>{p.reason}</div>
                      {p.loan?.book && (
                        <div className="text-xs text-gray-500 mt-1">
                          Ref. emprunt : {p.loan.book.title}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums font-semibold">
                      {formatFCFA(p.amount)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {format(new Date(p.createdAt), 'dd MMM yyyy', { locale: fr })}
                    </td>
                    <td className="py-3 px-4">
                      {p.waived ? (
                        <Badge className="bg-gray-100 text-gray-700">Annulée</Badge>
                      ) : p.paid ? (
                        <Badge className="bg-green-100 text-green-800">Payé</Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-800">À payer</Badge>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {!p.paid && !p.waived && (
                        <div className="flex flex-wrap gap-1">
                          <Button
                            type="button"
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => payMut.mutate(p.id)}
                            disabled={payMut.isPending}
                          >
                            Encaisser
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (window.confirm('Annuler cette pénalité ?')) {
                                waiveMut.mutate(p.id);
                              }
                            }}
                            disabled={waiveMut.isPending}
                          >
                            Gracier
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal isOpen={open} onClose={() => !createMut.isPending && setOpen(false)} title="Nouvelle pénalité">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Personne *</label>
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              aria-label="Utilisateur"
            >
              <option value="">— Choisir —</option>
              {(users as any[] | undefined)?.map((u: any) => (
                <option key={u.id} value={u.id}>
                  {u.firstName} {u.lastName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Emprunt lié (optionnel)
            </label>
            <select
              value={loanId}
              onChange={(e) => setLoanId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              aria-label="Emprunt"
            >
              <option value="">— Aucun —</option>
              {(loans as any[] | undefined)?.map((l: any) => (
                <option key={l.id} value={l.id}>
                  {l.book?.title} — {l.borrower?.firstName} {l.borrower?.lastName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Montant (FCFA) *</label>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              aria-label="Montant"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Motif *</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              aria-label="Motif"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Fermer
            </Button>
            <Button
              type="button"
              disabled={
                createMut.isPending || !userId || !reason.trim() || !amount
              }
              onClick={() => createMut.mutate()}
            >
              Enregistrer
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default LibraryPenaltiesPanel;
