import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import Card from '../../ui/Card';
import Button from '../../ui/Button';
import { adminApi } from '../../../services/api';
import { FiDownload, FiSend, FiRefreshCw, FiExternalLink } from 'react-icons/fi';
import { FNE_MATRICULE_SEARCH_URL } from '@/lib/fneMatricule';

function guessDefaultAcademicYear(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  if (m >= 8) return `${y}-${y + 1}`;
  return `${y - 1}-${y}`;
}

const STATUS_LABELS: Record<string, string> = {
  PUBLIC: 'Public',
  PRIVATE: 'Privé',
  COMMUNITY: 'Communautaire',
};

const MILIEU_LABELS: Record<string, string> = {
  URBAN: 'Urbain',
  RURAL: 'Rural',
};

function downloadCsv(filename: string, rows: string[][]) {
  const body = rows
    .map((r) =>
      r
        .map((cell) => {
          const v = cell ?? '';
          if (/[",;\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
          return v;
        })
        .join(';')
    )
    .join('\n');
  const blob = new Blob(['\ufeff' + body], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

type MenaReport = {
  generatedAt?: string;
  academicYear?: string | null;
  filters?: { scopeNote?: string };
  fiche?: {
    name?: string | null;
    code?: string | null;
    drena?: string | null;
    iepp?: string | null;
    status?: string | null;
    milieu?: string | null;
    region?: string | null;
    classroomCount?: number | null;
    address?: string | null;
    phone?: string | null;
    principal?: string | null;
    classesOpen?: number;
    capacityTotal?: number;
  };
  effectifsByClass?: Array<{
    className: string;
    level: string;
    male: number;
    female: number;
    other: number;
    total: number;
    stateAssigned: number;
    withFne: number;
    withoutFne: number;
    capacity: number | null;
  }>;
  effectifsByLevel?: Array<{
    level: string;
    male: number;
    female: number;
    other: number;
    total: number;
    stateAssigned: number;
  }>;
  stateAssignedStudents?: Array<{
    studentId: string;
    nationalMatricule: string | null;
    firstName: string;
    lastName: string;
    gender: string;
    dateOfBirth: string;
    birthPlace: string | null;
    className: string | null;
    level: string | null;
    isRepeating: boolean;
  }>;
  completeness?: {
    activeStudents: number;
    withNationalMatricule: number;
    missingNationalMatricule: number;
    missingBirthPlace: number;
    stateAssigned: number;
    fneCoveragePercent: number;
    ficheGaps: string[];
  };
};

const ReportsMenaPanel: React.FC = () => {
  const queryClient = useQueryClient();
  const [academicYear, setAcademicYear] = useState(guessDefaultAcademicYear);
  const [useAllYears, setUseAllYears] = useState(false);
  const [transmitting, setTransmitting] = useState(false);

  const { data: classes = [] } = useQuery({
    queryKey: ['admin-classes'],
    queryFn: () => adminApi.getClasses(),
    staleTime: 120_000,
  });

  const academicYears = useMemo(() => {
    const s = new Set<string>();
    for (const c of classes as { academicYear?: string }[]) {
      if (c.academicYear) s.add(c.academicYear);
    }
    return [...s].sort((a, b) => b.localeCompare(a));
  }, [classes]);

  const yearParam = useAllYears ? undefined : academicYear || undefined;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin-reports-mena', useAllYears ? '' : academicYear],
    queryFn: () =>
      adminApi.getMenaReports(useAllYears ? {} : { academicYear: academicYear || undefined }),
    staleTime: 30_000,
  });

  const { data: menaStatus } = useQuery({
    queryKey: ['admin-mena-status'],
    queryFn: () => adminApi.getMenaStatus(),
    staleTime: 60_000,
  });

  const { data: transmissionsData, refetch: refetchTransmissions } = useQuery({
    queryKey: ['admin-mena-transmissions'],
    queryFn: () => adminApi.getMenaTransmissions({ limit: 10 }),
    staleTime: 15_000,
  });

  const transmitMutation = useMutation({
    mutationFn: (forceExportOnly: boolean) =>
      adminApi.transmitMenaPackage({
        academicYear: yearParam,
        forceExportOnly,
      }),
    onSuccess: (res: {
      message?: string;
      transmission?: { status?: string };
      package?: unknown;
      checksum?: string;
    }) => {
      toast.success(res.message || 'Dossier MENA traité');
      void queryClient.invalidateQueries({ queryKey: ['admin-mena-transmissions'] });
      if (res.package) {
        const blob = new Blob([JSON.stringify(res.package, null, 2)], {
          type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mena-dossier-eleves-${yearParam || 'toutes'}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    },
    onError: (error: unknown) => {
      const msg =
        (error as { response?: { data?: { error?: string; message?: string } } })?.response?.data
          ?.error ||
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Échec de la transmission MENA';
      toast.error(msg);
      void refetchTransmissions();
    },
    onSettled: () => setTransmitting(false),
  });

  const downloadFullPackage = async (format: 'json' | 'csv') => {
    try {
      if (format === 'csv') {
        const blob = (await adminApi.getMenaExportPackage({
          academicYear: yearParam,
          format: 'csv',
        })) as Blob;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mena-eleves-${yearParam || 'toutes'}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('CSV élèves MENA téléchargé');
        return;
      }
      const res = (await adminApi.getMenaExportPackage({
        academicYear: yearParam,
        format: 'json',
      })) as { package?: unknown };
      const blob = new Blob([JSON.stringify(res.package ?? res, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mena-dossier-eleves-${yearParam || 'toutes'}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Dossier JSON MENA téléchargé');
    } catch {
      toast.error('Échec du téléchargement du dossier MENA');
    }
  };

  const handleTransmit = (forceExportOnly: boolean) => {
    setTransmitting(true);
    transmitMutation.mutate(forceExportOnly);
  };

  const report = data as MenaReport | undefined;
  const busy = isLoading || isFetching;
  const f = report?.fiche;
  const c = report?.completeness;
  const transmissions =
    (transmissionsData as { transmissions?: Array<Record<string, unknown>> })?.transmissions ?? [];

  const exportEffectifs = () => {
    if (!report?.effectifsByClass?.length) {
      toast.error('Aucun effectif à exporter');
      return;
    }
    const rows: string[][] = [
      [
        'Classe',
        'Niveau',
        'Garçons',
        'Filles',
        'Autre',
        'Total',
        'Affectés État',
        'Avec FNE',
        'Sans FNE',
        'Capacité',
      ],
      ...report.effectifsByClass.map((r) => [
        r.className,
        r.level,
        String(r.male),
        String(r.female),
        String(r.other),
        String(r.total),
        String(r.stateAssigned),
        String(r.withFne),
        String(r.withoutFne),
        r.capacity != null ? String(r.capacity) : '',
      ]),
    ];
    const year = report.academicYear || 'toutes-annees';
    downloadCsv(`mena-effectifs-${year}.csv`, rows);
    toast.success('Export effectifs téléchargé');
  };

  const exportStateAssigned = () => {
    if (!report?.stateAssignedStudents?.length) {
      toast.error('Aucun élève affecté de l’État');
      return;
    }
    const rows: string[][] = [
      [
        'Matricule établissement',
        'Matricule FNE',
        'Nom',
        'Prénom',
        'Sexe',
        'Date naissance',
        'Lieu naissance',
        'Classe',
        'Niveau',
        'Redoublant',
      ],
      ...report.stateAssignedStudents.map((s) => [
        s.studentId,
        s.nationalMatricule || '',
        s.lastName,
        s.firstName,
        s.gender === 'MALE' ? 'M' : s.gender === 'FEMALE' ? 'F' : 'A',
        s.dateOfBirth,
        s.birthPlace || '',
        s.className || '',
        s.level || '',
        s.isRepeating ? 'Oui' : 'Non',
      ]),
    ];
    const year = report.academicYear || 'toutes-annees';
    downloadCsv(`mena-affectes-etat-${year}.csv`, rows);
    toast.success('Liste affectés État téléchargée');
  };

  const exportFiche = () => {
    if (!f) {
      toast.error('Fiche indisponible');
      return;
    }
    downloadCsv(`mena-fiche-etablissement.csv`, [
      ['Champ', 'Valeur'],
      ['Nom', f.name || ''],
      ['Code MENA', f.code || ''],
      ['DRENA', f.drena || ''],
      ['IEPP', f.iepp || ''],
      ['Statut', f.status ? STATUS_LABELS[f.status] ?? f.status : ''],
      ['Milieu', f.milieu ? MILIEU_LABELS[f.milieu] ?? f.milieu : ''],
      ['Région', f.region || ''],
      ['Salles de classe', f.classroomCount != null ? String(f.classroomCount) : ''],
      ['Classes ouvertes', String(f.classesOpen ?? '')],
      ['Capacité totale', String(f.capacityTotal ?? '')],
      ['Adresse', f.address || ''],
      ['Téléphone', f.phone || ''],
      ['Directeur', f.principal || ''],
    ]);
    toast.success('Fiche établissement téléchargée');
  };

  return (
    <div className="space-y-6">
      <Card className="p-5 border border-emerald-200 bg-emerald-50/40">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-emerald-950">Rapports MENA / DESPS</h3>
            <p className="text-xs text-emerald-900/80 mt-1">
              Fiche établissement, effectifs par classe et sexe, liste des affectés de l’État, couverture
              du matricule FNE — prêts pour une remontée manuelle (CSV).
            </p>
            <a
              href={FNE_MATRICULE_SEARCH_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-2 text-[11px] font-medium text-emerald-800 hover:text-emerald-950 underline-offset-2 hover:underline"
            >
              <FiExternalLink className="w-3 h-3" aria-hidden />
              Vérifier un matricule sur le site FNE
            </a>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex items-center gap-2 text-xs text-emerald-900">
              <input
                type="checkbox"
                checked={useAllYears}
                onChange={(ev) => setUseAllYears(ev.target.checked)}
                className="rounded border-gray-300"
              />
              Toutes années
            </label>
            <label className="block text-xs font-medium text-gray-700 min-w-[10rem]">
              Année scolaire
              <select
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm disabled:opacity-50"
                value={academicYear}
                disabled={useAllYears}
                onChange={(ev) => setAcademicYear(ev.target.value)}
              >
                {academicYear && !academicYears.includes(academicYear) && (
                  <option value={academicYear}>{academicYear}</option>
                )}
                {academicYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
        {report?.filters?.scopeNote && (
          <p className="text-[11px] text-emerald-800/70 mt-3 border-t border-emerald-200/80 pt-3">
            {report.filters.scopeNote}
          </p>
        )}
      </Card>

      <Card className="p-5 border border-emerald-300 bg-white">
        <h4 className="text-sm font-semibold text-emerald-950 mb-1">
          Envoi des données élèves au MENA
        </h4>
        <p className="text-xs text-stone-600 mb-3">
          Prépare et envoie <strong>toutes les données administratives élèves</strong> (identité,
          matricule FNE, classe, affectation État, parents, contacts d’urgence, infos médicales
          déclarées, documents d’identité, historique scolaire, transferts + effectifs
          établissement). La biométrie / NFC n’est jamais incluse. Sans API officielle MENA, l’envoi
          se fait par export ; si{' '}
          <code className="text-[10px] bg-stone-100 px-1 rounded">MENA_WEBHOOK_URL</code> est
          configuré côté serveur, une transmission HTTP automatique est tentée.
        </p>
        <p className="text-[11px] text-stone-500 mb-4">
          Passerelle :{' '}
          {(menaStatus as { webhookConfigured?: boolean; note?: string })?.webhookConfigured
            ? `webhook configuré (${(menaStatus as { webhookUrlMasked?: string }).webhookUrlMasked})`
            : 'aucun webhook — export manuel'}
        </p>
        <div className="flex flex-wrap gap-2 mb-4">
          <Button
            type="button"
            size="sm"
            disabled={transmitting}
            onClick={() => handleTransmit(false)}
          >
            <FiSend className="w-3.5 h-3.5 mr-1.5" />
            {transmitting ? 'Traitement…' : 'Préparer & envoyer le dossier élèves'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={transmitting}
            onClick={() => void downloadFullPackage('json')}
          >
            <FiDownload className="w-3.5 h-3.5 mr-1.5" />
            JSON complet
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={transmitting}
            onClick={() => void downloadFullPackage('csv')}
          >
            <FiDownload className="w-3.5 h-3.5 mr-1.5" />
            CSV élèves
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void refetchTransmissions()}
          >
            <FiRefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Historique
          </Button>
        </div>
        {transmissions.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-[11px]">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2 pr-2">Date</th>
                  <th className="py-2 pr-2">Année</th>
                  <th className="py-2 pr-2">Statut</th>
                  <th className="py-2 pr-2 text-right">Élèves</th>
                  <th className="py-2 pr-2">Canal</th>
                </tr>
              </thead>
              <tbody>
                {transmissions.map((t) => (
                  <tr key={String(t.id)} className="border-b border-gray-100">
                    <td className="py-2 pr-2">
                      {t.createdAt
                        ? new Date(String(t.createdAt)).toLocaleString('fr-FR')
                        : '—'}
                    </td>
                    <td className="py-2 pr-2">{String(t.academicYear || 'toutes')}</td>
                    <td className="py-2 pr-2 font-semibold">
                      {String(t.status)}
                      {t.errorMessage ? (
                        <span className="block text-[10px] font-normal text-rose-700">
                          {String(t.errorMessage).slice(0, 80)}
                        </span>
                      ) : null}
                    </td>
                    <td className="py-2 pr-2 text-right tabular-nums">{String(t.studentCount ?? 0)}</td>
                    <td className="py-2 pr-2">{String(t.channel)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {busy && !report ? (
        <p className="text-sm text-gray-500">Chargement du rapport MENA…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="p-4">
              <p className="text-[11px] text-gray-500">Élèves actifs</p>
              <p className="text-2xl font-semibold text-gray-900">{c?.activeStudents ?? 0}</p>
            </Card>
            <Card className="p-4">
              <p className="text-[11px] text-gray-500">Affectés État</p>
              <p className="text-2xl font-semibold text-amber-800">{c?.stateAssigned ?? 0}</p>
            </Card>
            <Card className="p-4">
              <p className="text-[11px] text-gray-500">Couverture FNE</p>
              <p className="text-2xl font-semibold text-emerald-800">
                {c?.fneCoveragePercent ?? 0}%
              </p>
              <p className="text-[10px] text-gray-500">
                {c?.withNationalMatricule ?? 0} / {c?.activeStudents ?? 0}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-[11px] text-gray-500">Sans lieu de naissance</p>
              <p className="text-2xl font-semibold text-rose-800">{c?.missingBirthPlace ?? 0}</p>
            </Card>
          </div>

          {c?.ficheGaps && c.ficheGaps.length > 0 && (
            <Card className="p-4 border border-amber-200 bg-amber-50/50">
              <p className="text-xs font-semibold text-amber-950">
                Champs fiche établissement manquants
              </p>
              <p className="text-xs text-amber-900 mt-1">
                Complétez-les dans Paramètres → Établissement : {c.ficheGaps.join(', ')}.
              </p>
            </Card>
          )}

          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <h4 className="text-sm font-semibold text-gray-900">Fiche établissement</h4>
              <Button type="button" variant="outline" size="sm" onClick={exportFiche}>
                <FiDownload className="w-3.5 h-3.5 mr-1.5" />
                CSV fiche
              </Button>
            </div>
            <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2 text-sm">
              <div>
                <dt className="text-[11px] text-gray-500">Nom</dt>
                <dd className="font-medium">{f?.name || '—'}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-gray-500">Code MENA</dt>
                <dd className="font-mono font-medium">{f?.code || '—'}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-gray-500">DRENA</dt>
                <dd className="font-medium">{f?.drena || '—'}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-gray-500">IEPP</dt>
                <dd className="font-medium">{f?.iepp || '—'}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-gray-500">Statut</dt>
                <dd className="font-medium">
                  {f?.status ? STATUS_LABELS[f.status] ?? f.status : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-gray-500">Milieu</dt>
                <dd className="font-medium">
                  {f?.milieu ? MILIEU_LABELS[f.milieu] ?? f.milieu : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-gray-500">Région</dt>
                <dd className="font-medium">{f?.region || '—'}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-gray-500">Salles</dt>
                <dd className="font-medium">
                  {f?.classroomCount != null ? f.classroomCount : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-gray-500">Classes / capacité</dt>
                <dd className="font-medium">
                  {f?.classesOpen ?? 0} / {f?.capacityTotal ?? 0}
                </dd>
              </div>
            </dl>
          </Card>

          <Card className="p-5 overflow-x-auto">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <h4 className="text-sm font-semibold text-gray-900">Effectifs par classe</h4>
              <Button type="button" variant="outline" size="sm" onClick={exportEffectifs}>
                <FiDownload className="w-3.5 h-3.5 mr-1.5" />
                CSV effectifs
              </Button>
            </div>
            <table className="min-w-full text-xs">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2 pr-3">Classe</th>
                  <th className="py-2 pr-3">Niveau</th>
                  <th className="py-2 pr-3 text-right">G</th>
                  <th className="py-2 pr-3 text-right">F</th>
                  <th className="py-2 pr-3 text-right">Total</th>
                  <th className="py-2 pr-3 text-right">État</th>
                  <th className="py-2 pr-3 text-right">FNE</th>
                </tr>
              </thead>
              <tbody>
                {(report?.effectifsByClass ?? []).map((row) => (
                  <tr key={`${row.className}-${row.level}`} className="border-b border-gray-100">
                    <td className="py-2 pr-3 font-medium text-gray-900">{row.className}</td>
                    <td className="py-2 pr-3">{row.level}</td>
                    <td className="py-2 pr-3 text-right">{row.male}</td>
                    <td className="py-2 pr-3 text-right">{row.female}</td>
                    <td className="py-2 pr-3 text-right font-semibold">{row.total}</td>
                    <td className="py-2 pr-3 text-right">{row.stateAssigned}</td>
                    <td className="py-2 pr-3 text-right">
                      {row.withFne}/{row.total}
                    </td>
                  </tr>
                ))}
                {!report?.effectifsByClass?.length && (
                  <tr>
                    <td colSpan={7} className="py-4 text-center text-gray-500">
                      Aucun effectif pour cette période
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>

          <Card className="p-5 overflow-x-auto">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <h4 className="text-sm font-semibold text-gray-900">
                Élèves affectés de l’État ({report?.stateAssignedStudents?.length ?? 0})
              </h4>
              <Button type="button" variant="outline" size="sm" onClick={exportStateAssigned}>
                <FiDownload className="w-3.5 h-3.5 mr-1.5" />
                CSV affectés État
              </Button>
            </div>
            <table className="min-w-full text-xs">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2 pr-3">Nom</th>
                  <th className="py-2 pr-3">Matricule étab.</th>
                  <th className="py-2 pr-3">FNE</th>
                  <th className="py-2 pr-3">Classe</th>
                  <th className="py-2 pr-3">Naissance</th>
                </tr>
              </thead>
              <tbody>
                {(report?.stateAssignedStudents ?? []).slice(0, 50).map((s) => (
                  <tr key={s.studentId} className="border-b border-gray-100">
                    <td className="py-2 pr-3 font-medium">
                      {s.lastName} {s.firstName}
                    </td>
                    <td className="py-2 pr-3 font-mono">{s.studentId}</td>
                    <td className="py-2 pr-3 font-mono">{s.nationalMatricule || '—'}</td>
                    <td className="py-2 pr-3">{s.className || '—'}</td>
                    <td className="py-2 pr-3">
                      {s.dateOfBirth}
                      {s.birthPlace ? ` · ${s.birthPlace}` : ''}
                    </td>
                  </tr>
                ))}
                {!report?.stateAssignedStudents?.length && (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-gray-500">
                      Aucun élève marqué « Affecté de l’État »
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {(report?.stateAssignedStudents?.length ?? 0) > 50 && (
              <p className="text-[11px] text-gray-500 mt-2">
                Aperçu des 50 premiers — exportez le CSV pour la liste complète.
              </p>
            )}
          </Card>
        </>
      )}
    </div>
  );
};

export default ReportsMenaPanel;
