'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { FiGift, FiTrash2 } from 'react-icons/fi';
import { adminApi } from '@/services/api';
import { adminTuitionCatalogApi } from '@/services/api/admin-tuition-catalog.api';
import { getCurrentAcademicYear } from '@/utils/academicYear';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Input from '../ui/Input';
import { ADM } from './adminModuleLayout';

const FEE_TYPES: { value: string; label: string }[] = [
  { value: '', label: 'Tous les frais' },
  { value: 'ENROLLMENT', label: 'Inscription' },
  { value: 'TUITION', label: 'Scolarité' },
  { value: 'CANTEEN', label: 'Cantine' },
  { value: 'TRANSPORT', label: 'Transport' },
  { value: 'ACTIVITY', label: 'Activité' },
  { value: 'MATERIAL', label: 'Matériel' },
  { value: 'OTHER', label: 'Autre' },
];

type StudentRow = {
  id: string;
  studentId?: string;
  user?: { firstName?: string; lastName?: string };
  class?: { name?: string } | null;
};

type ScholarshipRow = {
  id: string;
  label: string;
  academicYear: string;
  fixedAmount?: number | null;
  percentOff?: number | null;
  feeType?: string | null;
  isActive?: boolean;
  student?: StudentRow;
};

const selectClass =
  'mt-1 w-full rounded-xl border border-stone-200/90 bg-white/95 px-4 py-3 text-sm text-stone-900 shadow-sm focus:border-cptb-gold/55 focus:outline-none focus:ring-2 focus:ring-cptb-gold/40';

export default function ScholarshipsAdminModule() {
  const qc = useQueryClient();
  const [year, setYear] = useState(getCurrentAcademicYear());
  const [studentId, setStudentId] = useState('');
  const [label, setLabel] = useState('');
  const [fixedAmount, setFixedAmount] = useState('');
  const [percentOff, setPercentOff] = useState('');
  const [feeType, setFeeType] = useState('');
  const [notes, setNotes] = useState('');
  const [q, setQ] = useState('');

  const { data: students = [] } = useQuery({
    queryKey: ['admin-scholarship-students'],
    queryFn: () => adminApi.getStudents(),
  });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['admin-student-scholarships', year],
    queryFn: () => adminTuitionCatalogApi.getStudentScholarships({ academicYear: year }),
  });

  const studentList = students as StudentRow[];
  const scholarships = rows as ScholarshipRow[];

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return scholarships;
    return scholarships.filter((row) => {
      const name = `${row.student?.user?.firstName ?? ''} ${row.student?.user?.lastName ?? ''} ${row.label}`.toLowerCase();
      return name.includes(needle);
    });
  }, [scholarships, q]);

  const activeCount = scholarships.filter((r) => r.isActive !== false).length;

  const createMut = useMutation({
    mutationFn: () =>
      adminTuitionCatalogApi.createStudentScholarship({
        studentId,
        academicYear: year,
        label: label.trim(),
        fixedAmount: fixedAmount.trim() ? Math.round(Number(fixedAmount)) : undefined,
        percentOff: percentOff.trim() ? Number(percentOff) : undefined,
        feeType: feeType || undefined,
        notes: notes.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success('Bourse enregistrée');
      setLabel('');
      setFixedAmount('');
      setPercentOff('');
      setNotes('');
      qc.invalidateQueries({ queryKey: ['admin-student-scholarships'] });
    },
    onError: (e: { response?: { data?: { error?: string } } }) =>
      toast.error(e.response?.data?.error || 'Impossible d’enregistrer la bourse'),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      adminTuitionCatalogApi.updateStudentScholarship(id, { isActive }),
    onSuccess: () => {
      toast.success('Statut mis à jour');
      qc.invalidateQueries({ queryKey: ['admin-student-scholarships'] });
    },
    onError: (e: { response?: { data?: { error?: string } } }) =>
      toast.error(e.response?.data?.error || 'Mise à jour impossible'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => adminTuitionCatalogApi.deleteStudentScholarship(id),
    onSuccess: () => {
      toast.success('Bourse supprimée');
      qc.invalidateQueries({ queryKey: ['admin-student-scholarships'] });
    },
    onError: (e: { response?: { data?: { error?: string } } }) =>
      toast.error(e.response?.data?.error || 'Suppression impossible'),
  });

  return (
    <div className={ADM.root}>
      <div>
        <h2 className={ADM.h2}>
          <span className="inline-flex items-center gap-2">
            <FiGift className="h-5 w-5 text-cptb-gold" />
            Bourses & aides
          </span>
        </h2>
        <p className={ADM.intro}>
          Remises fixes ou en pourcentage, éventuellement limitées à un type de frais. Les aides
          actives s’appliquent à la facturation de l’année.
        </p>
      </div>

      <div className={ADM.grid3}>
        <div className={ADM.statCard}>
          <p className={ADM.statLabel}>Aides cette année</p>
          <p className={ADM.statVal}>{scholarships.length}</p>
        </div>
        <div className={ADM.statCard}>
          <p className={ADM.statLabel}>Actives</p>
          <p className={`${ADM.statValTone} text-emerald-700`}>{activeCount}</p>
        </div>
        <div className={ADM.statCard}>
          <p className={ADM.statLabel}>Année scolaire</p>
          <p className={ADM.statVal}>{year}</p>
        </div>
      </div>

      <Card className="space-y-4 p-4 sm:p-5">
        <h3 className="font-display text-sm font-bold text-stone-900">Nouvelle aide</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Input label="Année scolaire" value={year} onChange={(e) => setYear(e.target.value)} />
          <div>
            <label className="mb-2 block text-sm font-semibold tracking-wide text-stone-800">Élève</label>
            <select
              aria-label="Élève bénéficiaire"
              className={selectClass}
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
            >
              <option value="">— Sélectionner —</option>
              {studentList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.user?.firstName} {s.user?.lastName}
                  {s.studentId ? ` (${s.studentId})` : ''}
                </option>
              ))}
            </select>
          </div>
          <Input
            label="Libellé"
            placeholder="Bourse excellence, aide sociale…"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <Input
            label="Remise fixe (FCFA)"
            type="number"
            min={0}
            value={fixedAmount}
            onChange={(e) => setFixedAmount(e.target.value)}
          />
          <Input
            label="Remise (%)"
            type="number"
            min={0}
            max={100}
            value={percentOff}
            onChange={(e) => setPercentOff(e.target.value)}
          />
          <div>
            <label className="mb-2 block text-sm font-semibold tracking-wide text-stone-800">
              Type de frais
            </label>
            <select
              aria-label="Type de frais"
              className={selectClass}
              value={feeType}
              onChange={(e) => setFeeType(e.target.value)}
            >
              {FEE_TYPES.map((t) => (
                <option key={t.value || 'all'} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <Input
            label="Notes (optionnel)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="sm:col-span-2"
          />
        </div>
        <Button
          type="button"
          size="sm"
          isLoading={createMut.isPending}
          onClick={() => {
            if (!studentId || !label.trim()) {
              toast.error('Élève et libellé requis');
              return;
            }
            createMut.mutate();
          }}
        >
          Enregistrer l’aide
        </Button>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 px-4 py-3">
          <h3 className="font-display text-sm font-bold text-stone-900">Aides enregistrées</h3>
          <Input
            placeholder="Rechercher un élève ou un libellé"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="max-w-xs"
          />
        </div>
        {isLoading ? (
          <p className="p-4 text-sm text-stone-500">Chargement…</p>
        ) : filtered.length === 0 ? (
          <p className="p-4 text-sm text-stone-500">Aucune bourse pour cette année.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-stone-50 text-left text-[11px] font-bold uppercase tracking-wider text-stone-500">
                <tr>
                  <th className="px-4 py-2.5">Élève</th>
                  <th className="px-4 py-2.5">Libellé</th>
                  <th className="px-4 py-2.5">Remise</th>
                  <th className="px-4 py-2.5">Statut</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-stone-50/80">
                    <td className="px-4 py-2.5">
                      {row.student?.user?.firstName} {row.student?.user?.lastName}
                      <span className="mt-0.5 block text-[11px] text-stone-500">
                        {row.student?.class?.name ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">{row.label}</td>
                    <td className="px-4 py-2.5 tabular-nums">
                      {row.fixedAmount != null
                        ? `${Math.round(row.fixedAmount).toLocaleString('fr-FR')} FCFA`
                        : row.percentOff != null
                          ? `${row.percentOff} %`
                          : '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          row.isActive !== false
                            ? 'bg-emerald-50 text-emerald-800'
                            : 'bg-stone-100 text-stone-500'
                        }`}
                      >
                        {row.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="inline-flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            toggleMut.mutate({ id: row.id, isActive: row.isActive === false })
                          }
                        >
                          {row.isActive === false ? 'Activer' : 'Suspendre'}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="danger"
                          onClick={() => {
                            if (window.confirm('Supprimer cette aide ?')) deleteMut.mutate(row.id);
                          }}
                        >
                          <FiTrash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
