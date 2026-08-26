import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../../services/api';
import Card from '../../ui/Card';
import Button from '../../ui/Button';
import Modal from '../../ui/Modal';
import SearchBar from '../../ui/SearchBar';
import { FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';
import toast from 'react-hot-toast';

const emptyForm = {
  name: '',
  code: '',
  building: '',
  floor: '',
  capacity: '' as string | number,
  description: '',
  isActive: true,
};

const MaterialRoomsPanel: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [fablabOnly, setFablabOnly] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: rooms, isLoading } = useQuery({
    queryKey: ['material-rooms', search, fablabOnly],
    queryFn: () =>
      adminApi.getMaterialRooms({
        ...(search.trim() && { search: search.trim() }),
        ...(fablabOnly ? { fablab: 'true' } : {}),
      }),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        code: form.code || null,
        building: form.building || null,
        floor: form.floor || null,
        capacity:
          form.capacity === '' || form.capacity == null ? null : Number(form.capacity),
        description: form.description || null,
        isActive: form.isActive,
      };
      if (editId) {
        return adminApi.updateMaterialRoom(editId, payload);
      }
      return adminApi.createMaterialRoom(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-rooms'] });
      toast.success(editId ? 'Salle mise à jour' : 'Salle créée');
      setModalOpen(false);
      setEditId(null);
      setForm(emptyForm);
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Erreur'),
  });

  const deleteMutation = useMutation({
    mutationFn: adminApi.deleteMaterialRoom,
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['material-rooms'] });
      toast.success(data?.deactivated ? 'Salle désactivée (liens existants)' : 'Salle supprimée');
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Suppression impossible'),
  });

  const list = (rooms as any[]) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-1 w-full">
          <SearchBar value={search} onChange={setSearch} placeholder="Nom, code, bâtiment…" />
          <label className="inline-flex items-center gap-2 text-sm text-stone-700 whitespace-nowrap cursor-pointer">
            <input
              type="checkbox"
              checked={fablabOnly}
              onChange={(e) => setFablabOnly(e.target.checked)}
              className="rounded border-stone-300"
            />
            FabLab / makerspace
          </label>
        </div>
        <Button
          type="button"
          onClick={() => {
            setEditId(null);
            setForm(emptyForm);
            setModalOpen(true);
          }}
        >
          <FiPlus className="w-4 h-4 mr-2" />
          Nouvelle salle
        </Button>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Chargement…</div>
        ) : list.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Aucune salle enregistrée.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left">
                  <th className="py-3 px-4 font-semibold text-gray-700">Nom</th>
                  <th className="py-3 px-4 font-semibold text-gray-700">Code</th>
                  <th className="py-3 px-4 font-semibold text-gray-700">Lieu</th>
                  <th className="py-3 px-4 font-semibold text-gray-700 text-right">Capacité</th>
                  <th className="py-3 px-4 font-semibold text-gray-700 text-right">Équip.</th>
                  <th className="py-3 px-4 font-semibold text-gray-700">Actif</th>
                  <th className="py-3 px-4 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((r: any) => (
                  <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50/80">
                    <td className="py-3 px-4 font-medium text-gray-900">{r.name}</td>
                    <td className="py-3 px-4 text-gray-600">{r.code || '—'}</td>
                    <td className="py-3 px-4 text-gray-600">
                      {[r.building, r.floor].filter(Boolean).join(' · ') || '—'}
                    </td>
                    <td className="py-3 px-4 text-right">{r.capacity ?? '—'}</td>
                    <td className="py-3 px-4 text-right text-gray-600">
                      {typeof r._count?.equipmentStored === 'number' ? r._count.equipmentStored : '—'}
                    </td>
                    <td className="py-3 px-4">{r.isActive ? 'Oui' : 'Non'}</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded"
                          onClick={() => {
                            setEditId(r.id);
                            setForm({
                              name: r.name,
                              code: r.code || '',
                              building: r.building || '',
                              floor: r.floor || '',
                              capacity: r.capacity ?? '',
                              description: r.description || '',
                              isActive: r.isActive,
                            });
                            setModalOpen(true);
                          }}
                        >
                          <FiEdit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded"
                          onClick={() => {
                            if (confirm('Supprimer ou désactiver cette salle ?')) {
                              deleteMutation.mutate(r.id);
                            }
                          }}
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditId(null);
          setForm(emptyForm);
        }}
        title={editId ? 'Modifier la salle' : 'Nouvelle salle'}
      >
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nom *</label>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Code</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Capacité</label>
              <input
                type="number"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                value={form.capacity}
                onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Bâtiment</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                value={form.building}
                onChange={(e) => setForm((f) => ({ ...f, building: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Étage</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                value={form.floor}
                onChange={(e) => setForm((f) => ({ ...f, floor: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <textarea
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              rows={2}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
            />
            Salle active
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setModalOpen(false);
                setEditId(null);
                setForm(emptyForm);
              }}
            >
              Annuler
            </Button>
            <Button type="button" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              Enregistrer
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default MaterialRoomsPanel;
