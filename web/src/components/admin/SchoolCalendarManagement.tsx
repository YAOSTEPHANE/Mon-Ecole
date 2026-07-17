import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import FilterDropdown from '../ui/FilterDropdown';
import Badge from '../ui/Badge';
import toast from 'react-hot-toast';
import { FiCalendar, FiPlus, FiEdit, FiTrash2 } from 'react-icons/fi';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const defaultAcademicYear = () => {
  const y = new Date().getFullYear();
  const m = new Date().getMonth();
  return m >= 7 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
};

const TYPE_LABELS: Record<string, string> = {
  HOLIDAY: 'Jour férié',
  VACATION: 'Vacances',
  EXAM_PERIOD: 'Examens',
  MEETING: 'Réunion / événement',
  OTHER: 'Autre',
};

const TYPE_OPTIONS = Object.entries(TYPE_LABELS).map(([value, label]) => ({ label, value }));

type SchoolCalendarManagementProps = {
  compact?: boolean;
};

const SchoolCalendarManagement: React.FC<SchoolCalendarManagementProps> = ({ compact = false }) => {
  const queryClient = useQueryClient();
  const [academicYear, setAcademicYear] = useState(defaultAcademicYear());
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    type: 'OTHER' as 'HOLIDAY' | 'VACATION' | 'EXAM_PERIOD' | 'MEETING' | 'OTHER',
    startDate: '',
    endDate: '',
    allDay: true,
  });

  const { data: events, isLoading } = useQuery({
    queryKey: ['school-calendar-events', academicYear],
    queryFn: () => adminApi.getSchoolCalendarEvents({ academicYear }),
  });

  const sorted = useMemo(() => {
    if (!events) return [];
    return [...events].sort(
      (a: any, b: any) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );
  }, [events]);

  const createMutation = useMutation({
    mutationFn: adminApi.createSchoolCalendarEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-calendar-events'] });
      toast.success('Événement ajouté');
      closeModal();
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Erreur'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      adminApi.updateSchoolCalendarEvent(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-calendar-events'] });
      toast.success('Événement mis à jour');
      closeModal();
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Erreur'),
  });

  const deleteMutation = useMutation({
    mutationFn: adminApi.deleteSchoolCalendarEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-calendar-events'] });
      toast.success('Événement supprimé');
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Erreur'),
  });

  const openCreate = () => {
    setEditingId(null);
    setForm({
      title: '',
      description: '',
      type: 'OTHER',
      startDate: format(new Date(), 'yyyy-MM-dd'),
      endDate: format(new Date(), 'yyyy-MM-dd'),
      allDay: true,
    });
    setModalOpen(true);
  };

  const openEdit = (ev: any) => {
    setEditingId(ev.id);
    setForm({
      title: ev.title || '',
      description: ev.description || '',
      type: ev.type || 'OTHER',
      startDate: format(new Date(ev.startDate), 'yyyy-MM-dd'),
      endDate: format(new Date(ev.endDate), 'yyyy-MM-dd'),
      allDay: ev.allDay !== false,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
  };

  const submit = () => {
    if (!form.title.trim()) {
      toast.error('Titre requis');
      return;
    }
    const start = new Date(form.startDate);
    const end = new Date(form.endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      toast.error('Dates invalides');
      return;
    }
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      type: form.type,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      academicYear,
      allDay: form.allDay,
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const yearOptions = useMemo(() => {
    const y = new Date().getFullYear();
    const opts: { label: string; value: string }[] = [];
    for (let offset = -2; offset <= 3; offset++) {
      const start = y + offset;
      opts.push({ label: `${start}-${start + 1}`, value: `${start}-${start + 1}` });
    }
    return opts;
  }, []);

  return (
    <div className={`space-y-6 ${compact ? 'text-sm' : ''}`}>
      <div>
        <h2 className={compact ? 'text-base font-semibold text-gray-900' : 'text-lg font-semibold text-gray-900'}>
          Calendrier scolaire
        </h2>
        <p className={compact ? 'text-xs text-gray-500 mt-0.5' : 'text-sm text-gray-500 mt-0.5'}>
          Vacances, jours fériés, périodes d’examens et événements pour l’année sélectionnée.
        </p>
      </div>

      <Card className="p-4 border border-gray-200 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <FilterDropdown
          compact={compact}
          options={yearOptions}
          selected={academicYear}
          onChange={setAcademicYear}
          label="Année scolaire"
        />
        <Button onClick={openCreate}>
          <FiPlus className="w-5 h-5 mr-2 inline" />
          Ajouter un événement
        </Button>
      </Card>

      <Card className="border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3
            className={
              compact
                ? 'text-xs font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2'
                : 'text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2'
            }
          >
            <FiCalendar className="w-4 h-4" />
            Événements ({sorted.length})
          </h3>
        </div>
        {isLoading ? (
          <div className="p-12 text-center text-gray-500">Chargement…</div>
        ) : sorted.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            Aucun événement pour {academicYear}. Ajoutez des vacances ou jours fériés.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {sorted.map((ev: any) => (
              <li
                key={ev.id}
                className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 hover:bg-gray-50/80"
              >
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900">{ev.title}</span>
                    <Badge variant="secondary">{TYPE_LABELS[ev.type] || ev.type}</Badge>
                  </div>
                  <p className={compact ? 'text-xs text-gray-600 mt-0.5' : 'text-sm text-gray-600 mt-0.5'}>
                    {format(new Date(ev.startDate), 'd MMMM yyyy', { locale: fr })}
                    {ev.endDate &&
                      new Date(ev.endDate).toDateString() !== new Date(ev.startDate).toDateString() &&
                      ` → ${format(new Date(ev.endDate), 'd MMMM yyyy', { locale: fr })}`}
                  </p>
                  {ev.description && (
                    <p className="text-xs text-gray-500 mt-1">{ev.description}</p>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEdit(ev)}
                    className="p-2 rounded-lg text-indigo-600 hover:bg-indigo-50"
                    aria-label="Modifier"
                  >
                    <FiEdit className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Supprimer cet événement ?')) {
                        deleteMutation.mutate(ev.id);
                      }
                    }}
                    className="p-2 rounded-lg text-red-600 hover:bg-red-50"
                    aria-label="Supprimer"
                  >
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingId ? 'Modifier l’événement' : 'Nouvel événement'}
      >
        <div className="space-y-4 pt-2">
          <Input
            label="Titre"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={form.type}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  type: e.target.value as typeof form.type,
                }))
              }
              aria-label="Type d'événement"
            >
              {TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              rows={2}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              aria-label="Description de l'événement"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Date de début"
              type="date"
              value={form.startDate}
              onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
            />
            <Input
              label="Date de fin"
              type="date"
              value={form.endDate}
              onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.allDay}
              onChange={(e) => setForm((f) => ({ ...f, allDay: e.target.checked }))}
            />
            Journée entière
          </label>
          <p className="text-xs text-gray-500">
            Année scolaire appliquée : <strong>{academicYear}</strong>
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={closeModal}>
              Annuler
            </Button>
            <Button
              onClick={submit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingId ? 'Enregistrer' : 'Créer'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SchoolCalendarManagement;
