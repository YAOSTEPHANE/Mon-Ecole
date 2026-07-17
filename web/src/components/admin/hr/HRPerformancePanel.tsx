import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../../services/api';
import Card from '../../ui/Card';
import Button from '../../ui/Button';
import Modal from '../../ui/Modal';
import { FiPlus, FiAward } from 'react-icons/fi';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';

const HRPerformancePanel: React.FC = () => {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [teacherId, setTeacherId] = useState('');
  const [periodLabel, setPeriodLabel] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [overallScore, setOverallScore] = useState('');
  const [objectives, setObjectives] = useState('');
  const [achievements, setAchievements] = useState('');
  const [improvements, setImprovements] = useState('');
  const [reviewerName, setReviewerName] = useState('');

  const { data: reviews, isLoading } = useQuery({
    queryKey: ['admin-hr-performance-reviews'],
    queryFn: adminApi.getHrTeacherPerformanceReviews,
  });

  const { data: teachers } = useQuery({
    queryKey: ['admin-teachers-hr-perf'],
    queryFn: adminApi.getTeachers,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      adminApi.createTeacherPerformanceReview(teacherId, {
        periodLabel: periodLabel.trim(),
        academicYear: academicYear.trim(),
        overallScore: overallScore === '' ? null : parseFloat(overallScore),
        objectives: objectives.trim() || null,
        achievements: achievements.trim() || null,
        improvements: improvements.trim() || null,
        reviewerName: reviewerName.trim() || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-hr-performance-reviews'] });
      toast.success('Fiche d’évaluation enregistrée');
      setModalOpen(false);
      setTeacherId('');
      setPeriodLabel('');
      setAcademicYear('');
      setOverallScore('');
      setObjectives('');
      setAchievements('');
      setImprovements('');
      setReviewerName('');
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.error || 'Enregistrement impossible'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherId || !periodLabel.trim() || !academicYear.trim()) {
      toast.error('Enseignant, période et année scolaire sont requis');
      return;
    }
    createMutation.mutate();
  };

  const list = (reviews as any[]) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <Card className="p-4 border border-violet-100 bg-violet-50/40 flex-1">
          <p className="text-sm text-gray-700 flex items-start gap-2">
            <FiAward className="w-5 h-5 text-violet-600 shrink-0 mt-0.5" />
            Fiches d’<strong>évaluation des performances</strong> du personnel enseignant (entretiens
            annuels, objectifs, notation indicative sur 20).
          </p>
        </Card>
        <Button type="button" onClick={() => setModalOpen(true)} className="shrink-0">
          <FiPlus className="w-4 h-4 mr-2" />
          Nouvelle fiche
        </Button>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Chargement…</div>
        ) : list.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Aucune fiche d’évaluation enregistrée.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-600">
                  <th className="py-3 px-4 font-semibold">Date</th>
                  <th className="py-3 px-4 font-semibold">Enseignant</th>
                  <th className="py-3 px-4 font-semibold">Période</th>
                  <th className="py-3 px-4 font-semibold">Année</th>
                  <th className="py-3 px-4 font-semibold text-right">Note /20</th>
                  <th className="py-3 px-4 font-semibold">Évaluateur</th>
                </tr>
              </thead>
              <tbody>
                {list.map((r: any) => (
                  <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50/80">
                    <td className="py-3 px-4 whitespace-nowrap text-gray-600">
                      {r.createdAt
                        ? format(new Date(r.createdAt), 'dd MMM yyyy', { locale: fr })
                        : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-gray-900">
                        {r.teacher?.user?.firstName} {r.teacher?.user?.lastName}
                      </span>
                    </td>
                    <td className="py-3 px-4">{r.periodLabel}</td>
                    <td className="py-3 px-4">{r.academicYear}</td>
                    <td className="py-3 px-4 text-right tabular-nums">
                      {r.overallScore != null ? Number(r.overallScore).toFixed(1) : '—'}
                    </td>
                    <td className="py-3 px-4 text-gray-600">{r.reviewerName ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={() => !createMutation.isPending && setModalOpen(false)}
        title="Nouvelle fiche d’évaluation"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Enseignant *</label>
            <select
              required
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              aria-label="Sélectionner un enseignant"
            >
              <option value="">— Choisir —</option>
              {(teachers as any[] | undefined)?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.user?.firstName} {t.user?.lastName} ({t.employeeId})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Période *</label>
              <input
                required
                value={periodLabel}
                onChange={(e) => setPeriodLabel(e.target.value)}
                placeholder="ex. Trimestre 1"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Année scolaire *</label>
              <input
                required
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                placeholder="ex. 2025-2026"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note globale /20</label>
            <input
              type="number"
              min={0}
              max={20}
              step={0.5}
              value={overallScore}
              onChange={(e) => setOverallScore(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              aria-label="Note sur 20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Objectifs</label>
            <textarea
              value={objectives}
              onChange={(e) => setObjectives(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              aria-label="Objectifs de la période"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Réalisations</label>
            <textarea
              value={achievements}
              onChange={(e) => setAchievements(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              aria-label="Réalisations"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Axes d’amélioration</label>
            <textarea
              value={improvements}
              onChange={(e) => setImprovements(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              aria-label="Axes d’amélioration"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l’évaluateur</label>
            <input
              value={reviewerName}
              onChange={(e) => setReviewerName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              aria-label="Nom de l’évaluateur"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalOpen(false)}
              disabled={createMutation.isPending}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default HRPerformancePanel;
