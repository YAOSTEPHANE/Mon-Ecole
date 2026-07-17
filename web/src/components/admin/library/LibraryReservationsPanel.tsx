import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLibraryManagement } from '@/contexts/LibraryManagementContext';
import Card from '../../ui/Card';
import Button from '../../ui/Button';
import Modal from '../../ui/Modal';
import Badge from '../../ui/Badge';
import { FiPlus, FiCheck, FiX } from 'react-icons/fi';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';

const stLabel: Record<string, string> = {
  PENDING: 'En attente',
  READY: 'À retirer',
  FULFILLED: 'Honorée',
  CANCELLED: 'Annulée',
  EXPIRED: 'Expirée',
};

const LibraryReservationsPanel: React.FC = () => {
  const queryClient = useQueryClient();
  const { libraryApi, scope } = useLibraryManagement();
  const [open, setOpen] = useState(false);
  const [bookId, setBookId] = useState('');
  const [userId, setUserId] = useState('');

  const { data: resv, isLoading } = useQuery({
    queryKey: ['library-reservations', scope],
    queryFn: () => libraryApi.getLibraryReservations(),
  });

  const { data: books } = useQuery({
    queryKey: ['library-books-resv', scope],
    queryFn: () => libraryApi.getLibraryBooks(),
  });

  const { data: users } = useQuery({
    queryKey: ['library-users-resv', scope],
    queryFn: () => libraryApi.getAllUsers({ isActive: true }),
  });

  const createMut = useMutation({
    mutationFn: () => libraryApi.createLibraryReservation({ bookId, userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library-reservations'] });
      toast.success('Réservation enregistrée');
      setOpen(false);
      setBookId('');
      setUserId('');
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.error || 'Erreur'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'FULFILLED' | 'CANCELLED' }) =>
      libraryApi.updateLibraryReservation(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library-reservations'] });
      toast.success('Mise à jour effectuée');
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.error || 'Erreur'),
  });

  const list = (resv as any[]) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="button" onClick={() => setOpen(true)}>
          <FiPlus className="w-4 h-4 mr-2" />
          Nouvelle réservation
        </Button>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Chargement…</div>
        ) : list.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Aucune réservation.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left">
                  <th className="py-3 px-4 font-semibold">Livre</th>
                  <th className="py-3 px-4 font-semibold">Utilisateur</th>
                  <th className="py-3 px-4 font-semibold">Date</th>
                  <th className="py-3 px-4 font-semibold">Statut</th>
                  <th className="py-3 px-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((r: any) => (
                  <tr key={r.id} className="border-b border-gray-100">
                    <td className="py-3 px-4">
                      <div className="font-medium">{r.book?.title}</div>
                    </td>
                    <td className="py-3 px-4">
                      {r.user?.firstName} {r.user?.lastName}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {format(new Date(r.reservedAt), 'dd MMM yyyy HH:mm', { locale: fr })}
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        className={
                          r.status === 'PENDING'
                            ? 'bg-amber-100 text-amber-800'
                            : r.status === 'READY'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-700'
                        }
                      >
                        {stLabel[r.status] ?? r.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      {(r.status === 'PENDING' || r.status === 'READY') && (
                        <div className="flex flex-wrap gap-1">
                          <Button
                            type="button"
                            size="sm"
                            className="text-green-700 border-green-200"
                            variant="outline"
                            onClick={() => updateMut.mutate({ id: r.id, status: 'FULFILLED' })}
                            disabled={updateMut.isPending}
                          >
                            <FiCheck className="w-3.5 h-3.5 mr-1" />
                            Honorée
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => updateMut.mutate({ id: r.id, status: 'CANCELLED' })}
                            disabled={updateMut.isPending}
                          >
                            <FiX className="w-3.5 h-3.5 mr-1" />
                            Annuler
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

      <Modal isOpen={open} onClose={() => !createMut.isPending && setOpen(false)} title="Réserver un ouvrage">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Livre</label>
            <select
              value={bookId}
              onChange={(e) => setBookId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              aria-label="Livre"
            >
              <option value="">— Ouvrage —</option>
              {(books as any[] | undefined)?.map((b: any) => (
                <option key={b.id} value={b.id} disabled={!b.isActive}>
                  {b.title} {b.copiesAvailable === 0 ? '(indisponible)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Compte</label>
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              aria-label="Utilisateur"
            >
              <option value="">— Personne —</option>
              {(users as any[] | undefined)?.map((u: any) => (
                <option key={u.id} value={u.id}>
                  {u.firstName} {u.lastName}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Fermer
            </Button>
            <Button
              type="button"
              disabled={!bookId || !userId || createMut.isPending}
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

export default LibraryReservationsPanel;
