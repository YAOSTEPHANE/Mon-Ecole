'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { healthApi } from '@/services/api/health.api';
import { useAppBranding } from '@/contexts/AppBrandingContext';
import { dossierToPdfPayload, downloadHealthDossierPdf } from '@/lib/healthDossierPdf';
import {
  FiArrowLeft,
  FiDownload,
  FiEdit3,
  FiEye,
  FiFileText,
  FiPlus,
  FiSearch,
  FiUser,
} from 'react-icons/fi';

type ViewMode = 'list' | 'consult' | 'edit';

type DossierListRow = {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
  className: string | null;
  classLevel: string | null;
  hasDossier: boolean;
  completeness: 'none' | 'partial' | 'complete';
  updatedAt: string | null;
  counts: { vaccinations: number; allergies: number; treatments: number; visits: number };
};

const COMPLETENESS_LABELS: Record<DossierListRow['completeness'], string> = {
  none: 'À créer',
  partial: 'Incomplète',
  complete: 'À jour',
};

const COMPLETENESS_VARIANT: Record<DossierListRow['completeness'], 'default' | 'warning' | 'success'> = {
  none: 'warning',
  partial: 'default',
  complete: 'success',
};

const EMPTY_FORM: Record<string, string> = {
  medicalHistory: '',
  bloodGroup: '',
  familyDoctorName: '',
  familyDoctorPhone: '',
  preferredHospital: '',
  insuranceInfo: '',
  additionalNotes: '',
  medicalInfo: '',
  allergies: '',
  emergencyContact: '',
  emergencyPhone: '',
  emergencyContact2: '',
  emergencyPhone2: '',
};

const BLOOD_GROUPS = ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

function loadFormFromDossier(d: Record<string, unknown>): Record<string, string> {
  const hd = (d.healthDossier as Record<string, string>) || {};
  return {
    medicalHistory: hd.medicalHistory || '',
    bloodGroup: hd.bloodGroup || '',
    familyDoctorName: hd.familyDoctorName || '',
    familyDoctorPhone: hd.familyDoctorPhone || '',
    preferredHospital: hd.preferredHospital || '',
    insuranceInfo: hd.insuranceInfo || '',
    additionalNotes: hd.additionalNotes || '',
    medicalInfo: String(d.medicalInfo || ''),
    allergies: String(d.allergies || ''),
    emergencyContact: String(d.emergencyContact || ''),
    emergencyPhone: String(d.emergencyPhone || ''),
    emergencyContact2: String(d.emergencyContact2 || ''),
    emergencyPhone2: String(d.emergencyPhone2 || ''),
  };
}

export default function MedicalRecordWorkspace() {
  const [view, setView] = useState<ViewMode>('list');
  const [studentId, setStudentId] = useState('');
  const [listQ, setListQ] = useState('');
  const [listStatus, setListStatus] = useState<'all' | 'with' | 'without'>('all');
  const [createQ, setCreateQ] = useState('');
  const [showCreateSearch, setShowCreateSearch] = useState(false);

  const openStudent = (id: string, mode: 'consult' | 'edit') => {
    setStudentId(id);
    setView(mode);
    setShowCreateSearch(false);
  };

  const backToList = () => {
    setView('list');
    setStudentId('');
    setCreateQ('');
    setShowCreateSearch(false);
  };

  if (view === 'list') {
    return (
      <MedicalRecordList
        listQ={listQ}
        setListQ={setListQ}
        listStatus={listStatus}
        setListStatus={setListStatus}
        showCreateSearch={showCreateSearch}
        setShowCreateSearch={setShowCreateSearch}
        createQ={createQ}
        setCreateQ={setCreateQ}
        onOpenConsult={(id) => openStudent(id, 'consult')}
        onOpenEdit={(id) => openStudent(id, 'edit')}
      />
    );
  }

  return (
    <MedicalRecordDetail
      studentId={studentId}
      mode={view === 'edit' ? 'edit' : 'consult'}
      onBack={backToList}
      onSwitchMode={(mode) => setView(mode)}
    />
  );
}

function MedicalRecordList({
  listQ,
  setListQ,
  listStatus,
  setListStatus,
  showCreateSearch,
  setShowCreateSearch,
  createQ,
  setCreateQ,
  onOpenConsult,
  onOpenEdit,
}: {
  listQ: string;
  setListQ: (v: string) => void;
  listStatus: 'all' | 'with' | 'without';
  setListStatus: (v: 'all' | 'with' | 'without') => void;
  showCreateSearch: boolean;
  setShowCreateSearch: (v: boolean) => void;
  createQ: string;
  setCreateQ: (v: string) => void;
  onOpenConsult: (id: string) => void;
  onOpenEdit: (id: string) => void;
}) {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['health-dossiers-list', listQ, listStatus],
    queryFn: () => healthApi.listDossiers({ q: listQ || undefined, status: listStatus }),
  });

  const { data: createSearch = [] } = useQuery({
    queryKey: ['health-student-search-create', createQ],
    queryFn: () => healthApi.searchStudents(createQ),
    enabled: showCreateSearch && createQ.trim().length >= 2,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-sm text-stone-900">Fiches médicales élèves</h3>
          <p className="text-xs text-stone-500 mt-0.5">Consulter les dossiers existants ou en créer un nouveau.</p>
        </div>
        <Button type="button" size="sm" onClick={() => setShowCreateSearch(!showCreateSearch)}>
          <FiPlus className="w-4 h-4 mr-1.5" />
          Nouvelle fiche
        </Button>
      </div>

      {showCreateSearch && (
        <Card className="p-4 space-y-2 border border-rose-200 bg-rose-50/30">
          <p className="text-xs font-medium text-rose-900">Rechercher l&apos;élève pour créer ou compléter sa fiche</p>
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm"
              placeholder="Nom, prénom ou matricule (min. 2 caractères)…"
              value={createQ}
              onChange={(e) => setCreateQ(e.target.value)}
              autoFocus
            />
          </div>
          {createSearch.length > 0 && (
            <ul className="border rounded-lg divide-y max-h-44 overflow-y-auto text-sm bg-white">
              {(createSearch as { id: string; studentId: string; user?: { firstName?: string; lastName?: string }; class?: { name?: string } }[]).map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-stone-50">
                  <span>
                    {s.user?.lastName} {s.user?.firstName}
                    <span className="text-stone-500"> — {s.studentId}</span>
                    {s.class?.name && <span className="text-stone-400"> · {s.class.name}</span>}
                  </span>
                  <div className="flex gap-1 shrink-0">
                    <Button type="button" size="sm" variant="outline" onClick={() => onOpenConsult(s.id)}>
                      <FiEye className="w-3.5 h-3.5" />
                    </Button>
                    <Button type="button" size="sm" onClick={() => onOpenEdit(s.id)}>
                      <FiEdit3 className="w-3.5 h-3.5 mr-1" />
                      Créer / modifier
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <Card className="p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm"
              placeholder="Filtrer par nom ou matricule…"
              value={listQ}
              onChange={(e) => setListQ(e.target.value)}
            />
          </div>
          <select
            className="border rounded-lg px-3 py-2 text-sm"
            value={listStatus}
            onChange={(e) => setListStatus(e.target.value as 'all' | 'with' | 'without')}
            aria-label="Filtrer par statut de fiche"
          >
            <option value="all">Toutes les fiches</option>
            <option value="with">Avec fiche médicale</option>
            <option value="without">Sans fiche (à créer)</option>
          </select>
        </div>

        {isLoading ? (
          <p className="text-sm text-stone-500 py-4">Chargement des fiches…</p>
        ) : rows.length === 0 ? (
          <div className="text-center py-10 text-stone-500">
            <FiFileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Aucune fiche trouvée.</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-stone-500 border-b border-stone-100">
                  <th className="pb-2 pl-1 font-medium">Élève</th>
                  <th className="pb-2 font-medium">Classe</th>
                  <th className="pb-2 font-medium">Statut</th>
                  <th className="pb-2 font-medium hidden sm:table-cell">Synthèse</th>
                  <th className="pb-2 font-medium hidden md:table-cell">Dernière MAJ</th>
                  <th className="pb-2 pr-1 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {(rows as DossierListRow[]).map((row) => (
                  <tr key={row.id} className="hover:bg-stone-50/80">
                    <td className="py-2.5 pl-1">
                      <p className="font-medium text-stone-900">
                        {row.lastName} {row.firstName}
                      </p>
                      <p className="text-xs text-stone-500">{row.studentId}</p>
                    </td>
                    <td className="py-2.5 text-stone-600">
                      {row.className ? (
                        <>
                          {row.className}
                          {row.classLevel && <span className="text-stone-400 text-xs"> ({row.classLevel})</span>}
                        </>
                      ) : (
                        <span className="text-stone-400">—</span>
                      )}
                    </td>
                    <td className="py-2.5">
                      <Badge variant={COMPLETENESS_VARIANT[row.completeness]}>
                        {COMPLETENESS_LABELS[row.completeness]}
                      </Badge>
                    </td>
                    <td className="py-2.5 hidden sm:table-cell text-xs text-stone-500">
                      {row.counts.vaccinations} vacc. · {row.counts.allergies} allerg. · {row.counts.treatments} trait.
                    </td>
                    <td className="py-2.5 hidden md:table-cell text-xs text-stone-500">
                      {row.updatedAt
                        ? format(new Date(row.updatedAt), 'dd MMM yyyy', { locale: fr })
                        : '—'}
                    </td>
                    <td className="py-2.5 pr-1">
                      <div className="flex justify-end gap-1">
                        <Button type="button" size="sm" variant="outline" onClick={() => onOpenConsult(row.id)} title="Consulter">
                          <FiEye className="w-3.5 h-3.5" />
                        </Button>
                        <Button type="button" size="sm" onClick={() => onOpenEdit(row.id)} title="Créer / modifier">
                          <FiEdit3 className="w-3.5 h-3.5" />
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

function MedicalRecordDetail({
  studentId,
  mode,
  onBack,
  onSwitchMode,
}: {
  studentId: string;
  mode: 'consult' | 'edit';
  onBack: () => void;
  onSwitchMode: (mode: ViewMode) => void;
}) {
  const qc = useQueryClient();
  const { branding } = useAppBranding();
  const { data: dossier, isLoading } = useQuery({
    queryKey: ['health-dossier', studentId],
    queryFn: () => healthApi.getDossier(studentId),
    enabled: !!studentId,
  });

  const [form, setForm] = useState<Record<string, string>>(EMPTY_FORM);

  const saveMut = useMutation({
    mutationFn: () => healthApi.saveDossier(studentId, form),
    onSuccess: () => {
      toast.success('Fiche médicale enregistrée');
      qc.invalidateQueries({ queryKey: ['health-dossier', studentId] });
      qc.invalidateQueries({ queryKey: ['health-dossiers-list'] });
      onSwitchMode('consult');
    },
    onError: () => toast.error('Erreur lors de l’enregistrement'),
  });

  useEffect(() => {
    if (dossier) setForm(loadFormFromDossier(dossier as Record<string, unknown>));
  }, [dossier, studentId]);

  if (isLoading) {
    return <p className="text-sm text-stone-500">Chargement de la fiche médicale…</p>;
  }

  if (!dossier) {
    return (
      <Card className="p-4">
        <p className="text-sm text-stone-600">Fiche introuvable.</p>
        <Button type="button" size="sm" variant="outline" className="mt-3" onClick={onBack}>
          Retour
        </Button>
      </Card>
    );
  }

  const d = dossier as Record<string, unknown>;
  const user = d.user as { firstName?: string; lastName?: string } | undefined;
  const cls = d.class as { name?: string; level?: string } | undefined;
  const hd = (d.healthDossier as Record<string, string | null>) || {};
  const vaccinations = (d.vaccinations as { id: string; vaccineName: string; administeredAt: string }[]) || [];
  const allergyRecords = (d.allergyRecords as { id: string; allergen: string; severity?: string; reaction?: string }[]) || [];
  const treatments = (d.treatments as { id: string; medication: string; dosage?: string; isActive: boolean }[]) || [];
  const hasAllergies = Boolean(String(d.allergies || '').trim()) || allergyRecords.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={onBack}
            className="mt-0.5 p-2 rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-50"
            aria-label="Retour à la liste"
          >
            <FiArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-base text-stone-900">
                {user?.lastName} {user?.firstName}
              </h3>
              {hasAllergies && <Badge variant="warning">Allergies signalées</Badge>}
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Matricule {String(d.studentId || '')}
              {cls?.name ? ` · ${cls.name}${cls.level ? ` (${cls.level})` : ''}` : ''}
            </p>
            <p className="text-xs text-stone-400 mt-0.5">
              {mode === 'consult' ? 'Consultation de la fiche médicale' : 'Création / modification de la fiche'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {mode === 'consult' ? (
            <>
              <Button type="button" size="sm" variant="outline" onClick={() => onSwitchMode('edit')}>
                <FiEdit3 className="w-4 h-4 mr-1.5" />
                Modifier
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  try {
                    downloadHealthDossierPdf(dossierToPdfPayload(d, branding?.schoolDisplayName));
                    toast.success('Fiche téléchargée (PDF)');
                  } catch {
                    toast.error('Impossible de générer le PDF');
                  }
                }}
              >
                <FiDownload className="w-4 h-4 mr-1.5" />
                PDF
              </Button>
            </>
          ) : (
            <>
              <Button type="button" size="sm" variant="outline" onClick={() => onSwitchMode('consult')}>
                Annuler
              </Button>
              <Button type="button" size="sm" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
                Enregistrer la fiche
              </Button>
            </>
          )}
        </div>
      </div>

      {mode === 'consult' ? (
        <div className="grid lg:grid-cols-2 gap-4">
          <ConsultSection title="Antécédents & informations" icon={FiUser}>
            <ConsultRow label="Groupe sanguin" value={hd.bloodGroup} highlight={Boolean(hd.bloodGroup?.trim())} />
            <ConsultRow label="Historique médical" value={hd.medicalHistory} />
            <ConsultRow label="Infos médicales" value={d.medicalInfo as string} />
            <ConsultRow label="Allergies (texte)" value={d.allergies as string} highlight={Boolean(String(d.allergies || '').trim())} />
            <ConsultRow label="Notes infirmerie" value={hd.additionalNotes} />
          </ConsultSection>

          <ConsultSection title="Contacts & réseau de soins">
            <ConsultRow label="Médecin traitant" value={hd.familyDoctorName} />
            <ConsultRow label="Tél. médecin" value={hd.familyDoctorPhone} />
            <ConsultRow label="Hôpital de référence" value={hd.preferredHospital} />
            <ConsultRow label="Assurance / mutuelle" value={hd.insuranceInfo} />
            <ConsultRow label="Urgence 1" value={[d.emergencyContact, d.emergencyPhone].filter(Boolean).join(' — ') || null} />
            <ConsultRow label="Urgence 2" value={[d.emergencyContact2, d.emergencyPhone2].filter(Boolean).join(' — ') || null} />
          </ConsultSection>

          <ConsultSection title="Vaccinations" className="lg:col-span-2">
            {vaccinations.length === 0 ? (
              <p className="text-xs text-stone-400">Aucune vaccination enregistrée.</p>
            ) : (
              <ul className="space-y-1.5">
                {vaccinations.map((v) => (
                  <li key={v.id} className="text-sm flex justify-between gap-2 border-b border-stone-50 pb-1">
                    <span>{v.vaccineName}</span>
                    <span className="text-stone-500 text-xs shrink-0">
                      {new Date(v.administeredAt).toLocaleDateString('fr-FR')}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </ConsultSection>

          <ConsultSection title="Allergies structurées">
            {allergyRecords.length === 0 ? (
              <p className="text-xs text-stone-400">Aucune allergie structurée.</p>
            ) : (
              <ul className="space-y-1.5">
                {allergyRecords.map((a) => (
                  <li key={a.id} className="text-sm">
                    <span className="font-medium">{a.allergen}</span>
                    {a.severity && <span className="text-stone-500"> — {a.severity}</span>}
                    {a.reaction && <p className="text-xs text-stone-500">{a.reaction}</p>}
                  </li>
                ))}
              </ul>
            )}
          </ConsultSection>

          <ConsultSection title="Traitements en cours">
            {treatments.filter((t) => t.isActive).length === 0 ? (
              <p className="text-xs text-stone-400">Aucun traitement actif.</p>
            ) : (
              <ul className="space-y-1.5">
                {treatments.filter((t) => t.isActive).map((t) => (
                  <li key={t.id} className="text-sm">
                    {t.medication}
                    {t.dosage && <span className="text-stone-500"> — {t.dosage}</span>}
                  </li>
                ))}
              </ul>
            )}
          </ConsultSection>
        </div>
      ) : (
        <div className="space-y-4">
          <Card className="p-4 grid sm:grid-cols-2 gap-3 text-sm">
            <p className="sm:col-span-2 text-xs text-rose-800 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
              Renseignez les informations médicales de l&apos;élève. Les champs peuvent être complétés progressivement.
            </p>
            <BloodGroupField form={form} setForm={setForm} />
            <Field label="Historique médical" k="medicalHistory" form={form} setForm={setForm} rows={3} span />
            <Field label="Infos médicales (fiche élève)" k="medicalInfo" form={form} setForm={setForm} rows={2} span />
            <Field label="Allergies (texte libre)" k="allergies" form={form} setForm={setForm} span />
            <Field label="Médecin traitant" k="familyDoctorName" form={form} setForm={setForm} />
            <Field label="Tél. médecin" k="familyDoctorPhone" form={form} setForm={setForm} />
            <Field label="Hôpital de référence" k="preferredHospital" form={form} setForm={setForm} />
            <Field label="Assurance / mutuelle" k="insuranceInfo" form={form} setForm={setForm} />
            <Field label="Contact urgence 1" k="emergencyContact" form={form} setForm={setForm} />
            <Field label="Tél. urgence 1" k="emergencyPhone" form={form} setForm={setForm} />
            <Field label="Contact urgence 2" k="emergencyContact2" form={form} setForm={setForm} />
            <Field label="Tél. urgence 2" k="emergencyPhone2" form={form} setForm={setForm} />
            <Field label="Notes infirmerie" k="additionalNotes" form={form} setForm={setForm} rows={2} span />
          </Card>
          <VaccinationsBlock studentId={studentId} dossier={dossier} />
          <AllergiesBlock studentId={studentId} dossier={dossier} />
          <TreatmentsBlock studentId={studentId} dossier={dossier} />
        </div>
      )}
    </div>
  );
}

function ConsultSection({
  title,
  icon: Icon,
  children,
  className,
}: {
  title: string;
  icon?: typeof FiUser;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={`p-4 ${className ?? ''}`}>
      <h4 className="font-semibold text-sm text-stone-800 mb-3 flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-rose-600" />}
        {title}
      </h4>
      <div className="space-y-2">{children}</div>
    </Card>
  );
}

function ConsultRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value?: string | null;
  highlight?: boolean;
}) {
  const text = value?.trim() || '—';
  return (
    <div className={highlight ? 'bg-amber-50 border border-amber-100 rounded-lg px-2 py-1.5' : ''}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400">{label}</p>
      <p className={`text-sm mt-0.5 ${text === '—' ? 'text-stone-400' : 'text-stone-800'}`}>{text}</p>
    </div>
  );
}

function BloodGroupField({
  form,
  setForm,
}: {
  form: Record<string, string>;
  setForm: (f: Record<string, string>) => void;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-stone-700">Groupe sanguin</label>
      <select
        className="w-full border rounded-lg px-2 py-1.5 mt-0.5 text-sm"
        value={form.bloodGroup || ''}
        onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}
        aria-label="Groupe sanguin"
      >
        <option value="">Non renseigné</option>
        {BLOOD_GROUPS.filter(Boolean).map((g) => (
          <option key={g} value={g}>
            {g}
          </option>
        ))}
      </select>
    </div>
  );
}

function Field({
  label,
  k,
  form,
  setForm,
  rows = 1,
  span,
}: {
  label: string;
  k: string;
  form: Record<string, string>;
  setForm: (f: Record<string, string>) => void;
  rows?: number;
  span?: boolean;
}) {
  return (
    <div className={span ? 'sm:col-span-2' : ''}>
      <label className="text-xs font-medium text-stone-700">{label}</label>
      {rows > 1 ? (
        <textarea
          className="w-full border rounded-lg px-2 py-1.5 mt-0.5 text-sm"
          rows={rows}
          value={form[k] || ''}
          onChange={(e) => setForm({ ...form, [k]: e.target.value })}
        />
      ) : (
        <input
          className="w-full border rounded-lg px-2 py-1.5 mt-0.5 text-sm"
          value={form[k] || ''}
          onChange={(e) => setForm({ ...form, [k]: e.target.value })}
        />
      )}
    </div>
  );
}

function VaccinationsBlock({ studentId, dossier }: { studentId: string; dossier: unknown }) {
  const qc = useQueryClient();
  const rows = (dossier as { vaccinations?: { id: string; vaccineName: string; administeredAt: string }[] }).vaccinations || [];
  const [name, setName] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const addMut = useMutation({
    mutationFn: () => healthApi.addVaccination(studentId, { vaccineName: name, administeredAt: date }),
    onSuccess: () => {
      toast.success('Vaccination ajoutée');
      setName('');
      qc.invalidateQueries({ queryKey: ['health-dossier', studentId] });
      qc.invalidateQueries({ queryKey: ['health-dossiers-list'] });
    },
  });
  return (
    <Card className="p-4">
      <h3 className="font-semibold text-sm mb-2">Vaccinations</h3>
      <ul className="text-xs space-y-1 mb-3">
        {rows.map((v) => (
          <li key={v.id}>
            {v.vaccineName} — {new Date(v.administeredAt).toLocaleDateString('fr-FR')}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <input className="border rounded-lg px-2 py-1 text-sm" placeholder="Vaccin" value={name} onChange={(e) => setName(e.target.value)} />
        <input type="date" className="border rounded-lg px-2 py-1 text-sm" value={date} onChange={(e) => setDate(e.target.value)} />
        <Button type="button" size="sm" disabled={!name.trim()} onClick={() => addMut.mutate()}>
          Ajouter
        </Button>
      </div>
    </Card>
  );
}

function AllergiesBlock({ studentId, dossier }: { studentId: string; dossier: unknown }) {
  const qc = useQueryClient();
  const rows = (dossier as { allergyRecords?: { id: string; allergen: string; severity?: string }[] }).allergyRecords || [];
  const [allergen, setAllergen] = useState('');
  const addMut = useMutation({
    mutationFn: () => healthApi.addAllergy(studentId, { allergen }),
    onSuccess: () => {
      setAllergen('');
      qc.invalidateQueries({ queryKey: ['health-dossier', studentId] });
      qc.invalidateQueries({ queryKey: ['health-dossiers-list'] });
    },
  });
  return (
    <Card className="p-4">
      <h3 className="font-semibold text-sm mb-2">Allergies et intolérances</h3>
      <ul className="text-xs space-y-1 mb-3">
        {rows.map((a) => (
          <li key={a.id}>
            {a.allergen}
            {a.severity ? ` (${a.severity})` : ''}
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <input className="border rounded-lg px-2 py-1 text-sm flex-1" placeholder="Allergène" value={allergen} onChange={(e) => setAllergen(e.target.value)} />
        <Button type="button" size="sm" disabled={!allergen.trim()} onClick={() => addMut.mutate()}>
          Ajouter
        </Button>
      </div>
    </Card>
  );
}

function TreatmentsBlock({ studentId, dossier }: { studentId: string; dossier: unknown }) {
  const qc = useQueryClient();
  const rows = (dossier as { treatments?: { id: string; medication: string; isActive: boolean }[] }).treatments || [];
  const [medication, setMedication] = useState('');
  const addMut = useMutation({
    mutationFn: () => healthApi.addTreatment(studentId, { medication }),
    onSuccess: () => {
      setMedication('');
      qc.invalidateQueries({ queryKey: ['health-dossier', studentId] });
      qc.invalidateQueries({ queryKey: ['health-dossiers-list'] });
    },
  });
  return (
    <Card className="p-4">
      <h3 className="font-semibold text-sm mb-2">Traitements en cours</h3>
      <ul className="text-xs space-y-1 mb-3">
        {rows
          .filter((t) => t.isActive)
          .map((t) => (
            <li key={t.id}>{t.medication}</li>
          ))}
      </ul>
      <div className="flex gap-2">
        <input className="border rounded-lg px-2 py-1 text-sm flex-1" placeholder="Médicament" value={medication} onChange={(e) => setMedication(e.target.value)} />
        <Button type="button" size="sm" disabled={!medication.trim()} onClick={() => addMut.mutate()}>
          Ajouter
        </Button>
      </div>
    </Card>
  );
}
