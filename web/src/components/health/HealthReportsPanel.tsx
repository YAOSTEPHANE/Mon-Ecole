'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { FiBarChart2, FiPrinter } from 'react-icons/fi';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { healthApi } from '@/services/api/health.api';
import { useAppBranding } from '@/contexts/AppBrandingContext';
import { printHealthReport } from '@/lib/healthReportPrint';

const OUTCOME_LABELS: Record<string, string> = {
  RETURN_TO_CLASS: 'Retour en classe',
  SENT_HOME: 'Retour à domicile',
  PARENT_PICKUP: 'Récupération parent',
  REFERRED_HOSPITAL: 'Orientation hôpital / SAMU',
  REST_INFIRMARY: 'Repos infirmerie',
  OTHER: 'Autre',
};

type ReportId =
  | 'summary'
  | 'visits'
  | 'allergies'
  | 'treatments'
  | 'emergencies'
  | 'blood-groups'
  | 'motives';

const REPORTS: { id: ReportId; title: string; description: string }[] = [
  { id: 'summary', title: 'Synthèse infirmerie', description: 'Indicateurs clés sur la période sélectionnée.' },
  { id: 'visits', title: 'Registre des visites', description: 'Liste détaillée des passages à l’infirmerie.' },
  { id: 'allergies', title: 'Registre des allergies', description: 'Élèves avec allergies ou intolérances signalées.' },
  { id: 'treatments', title: 'Traitements en cours', description: 'Médicaments et protocoles actifs.' },
  { id: 'emergencies', title: 'Urgences sanitaires', description: 'Incidents et urgences sur la période.' },
  { id: 'blood-groups', title: 'Groupes sanguins', description: 'Répartition des groupes sanguins renseignés.' },
  { id: 'motives', title: 'Motifs fréquents', description: 'Principaux motifs de visite à l’infirmerie.' },
];

type HealthReportPayload = {
  period: { from: string; to: string };
  summary: {
    visitsPeriod: number;
    visitsTotal: number;
    activeStudents: number;
    dossiersCount: number;
    allergyRecords: number;
    activeTreatments: number;
    vaccinationsPeriod: number;
    openEmergencies: number;
    emergenciesPeriod: number;
    parentNotifiedPeriod: number;
    dossiersNone: number;
    dossiersPartial: number;
    dossiersComplete: number;
  };
  visitsByOutcome: { outcome: string; _count: { _all: number } }[];
  visitsByMonth: { month: string; count: number }[];
  topMotives: { motive: string; count: number }[];
  bloodGroupDistribution: Record<string, number>;
  recentVisits: Array<{
    visitedAt: string;
    motive: string;
    outcome: string;
    parentNotified: boolean;
    student?: { studentId?: string; user?: { firstName?: string; lastName?: string }; class?: { name?: string } };
  }>;
  allergies: Array<{
    allergen: string;
    severity?: string | null;
    reaction?: string | null;
    student?: { studentId?: string; user?: { firstName?: string; lastName?: string }; class?: { name?: string } };
  }>;
  activeTreatments: Array<{
    medication: string;
    dosage?: string | null;
    schedule?: string | null;
    student?: { studentId?: string; user?: { firstName?: string; lastName?: string }; class?: { name?: string } };
  }>;
  emergencies: Array<{
    reportedAt: string;
    severity: string;
    description: string;
    resolvedAt?: string | null;
    student?: { user?: { firstName?: string; lastName?: string } };
  }>;
};

function studentName(s?: { user?: { firstName?: string; lastName?: string } }) {
  if (!s?.user) return '—';
  return `${s.user.lastName ?? ''} ${s.user.firstName ?? ''}`.trim() || '—';
}

function periodLabel(from: string, to: string) {
  return `${format(parseISO(from), 'd MMM yyyy', { locale: fr })} — ${format(parseISO(to), 'd MMM yyyy', { locale: fr })}`;
}

export default function HealthReportsPanel() {
  const { branding } = useAppBranding();
  const schoolName = branding.schoolDisplayName || branding.appTitle || 'Établissement';
  const [from, setFrom] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['health-reports', from, to],
    queryFn: () => healthApi.getReports({ from, to }),
  });

  const report = data as HealthReportPayload | undefined;

  const maxMonthVisits = useMemo(
    () => Math.max(1, ...(report?.visitsByMonth.map((m) => m.count) ?? [1])),
    [report],
  );

  const print = (id: ReportId) => {
    if (!report) return;
    const subtitle = periodLabel(report.period.from, report.period.to);
    const footer = 'Document confidentiel — service infirmerie (RGPD).';
    try {
      switch (id) {
        case 'summary':
          printHealthReport({
            schoolName,
            title: 'Synthèse infirmerie',
            subtitle,
            footerNote: footer,
            summaryBlocks: [
              { label: 'Visites (période)', value: String(report.summary.visitsPeriod) },
              { label: 'Élèves actifs', value: String(report.summary.activeStudents) },
              { label: 'Fiches complètes', value: String(report.summary.dossiersComplete) },
              { label: 'Allergies', value: String(report.summary.allergyRecords) },
              { label: 'Traitements actifs', value: String(report.summary.activeTreatments) },
              { label: 'Urgences ouvertes', value: String(report.summary.openEmergencies) },
              { label: 'Familles prévenues', value: String(report.summary.parentNotifiedPeriod) },
              { label: 'Vaccinations (période)', value: String(report.summary.vaccinationsPeriod) },
            ],
          });
          break;
        case 'visits':
          printHealthReport({
            schoolName,
            title: 'Registre des visites infirmerie',
            subtitle,
            footerNote: footer,
            columns: [
              { key: 'date', label: 'Date' },
              { key: 'student', label: 'Élève' },
              { key: 'class', label: 'Classe' },
              { key: 'motive', label: 'Motif' },
              { key: 'outcome', label: 'Issue' },
              { key: 'parent', label: 'Famille prévenue' },
            ],
            rows: report.recentVisits.map((v) => ({
              date: format(parseISO(v.visitedAt), 'dd/MM/yyyy HH:mm', { locale: fr }),
              student: studentName(v.student),
              class: v.student?.class?.name ?? '—',
              motive: v.motive,
              outcome: OUTCOME_LABELS[v.outcome] ?? v.outcome,
              parent: v.parentNotified ? 'Oui' : 'Non',
            })),
          });
          break;
        case 'allergies':
          printHealthReport({
            schoolName,
            title: 'Registre des allergies',
            subtitle: `État au ${format(new Date(), 'dd/MM/yyyy', { locale: fr })}`,
            footerNote: footer,
            columns: [
              { key: 'student', label: 'Élève' },
              { key: 'class', label: 'Classe' },
              { key: 'allergen', label: 'Allergène' },
              { key: 'severity', label: 'Sévérité' },
              { key: 'reaction', label: 'Réaction' },
            ],
            rows: report.allergies.map((a) => ({
              student: studentName(a.student),
              class: a.student?.class?.name ?? '—',
              allergen: a.allergen,
              severity: a.severity ?? '—',
              reaction: a.reaction ?? '—',
            })),
          });
          break;
        case 'treatments':
          printHealthReport({
            schoolName,
            title: 'Traitements en cours',
            subtitle: `État au ${format(new Date(), 'dd/MM/yyyy', { locale: fr })}`,
            footerNote: footer,
            columns: [
              { key: 'student', label: 'Élève' },
              { key: 'class', label: 'Classe' },
              { key: 'medication', label: 'Médicament' },
              { key: 'dosage', label: 'Posologie' },
              { key: 'schedule', label: 'Horaires' },
            ],
            rows: report.activeTreatments.map((t) => ({
              student: studentName(t.student),
              class: t.student?.class?.name ?? '—',
              medication: t.medication,
              dosage: t.dosage ?? '—',
              schedule: t.schedule ?? '—',
            })),
          });
          break;
        case 'emergencies':
          printHealthReport({
            schoolName,
            title: 'Urgences sanitaires',
            subtitle,
            footerNote: footer,
            columns: [
              { key: 'date', label: 'Date' },
              { key: 'severity', label: 'Gravité' },
              { key: 'student', label: 'Élève' },
              { key: 'description', label: 'Description' },
              { key: 'status', label: 'Statut' },
            ],
            rows: report.emergencies.map((e) => ({
              date: format(parseISO(e.reportedAt), 'dd/MM/yyyy HH:mm', { locale: fr }),
              severity: e.severity,
              student: studentName(e.student),
              description: e.description,
              status: e.resolvedAt ? 'Résolue' : 'Ouverte',
            })),
          });
          break;
        case 'blood-groups':
          printHealthReport({
            schoolName,
            title: 'Répartition des groupes sanguins',
            subtitle: 'Fiches médicales renseignées',
            footerNote: footer,
            columns: [
              { key: 'group', label: 'Groupe sanguin' },
              { key: 'count', label: 'Nombre', align: 'right' },
            ],
            rows: Object.entries(report.bloodGroupDistribution)
              .sort((a, b) => b[1] - a[1])
              .map(([group, count]) => ({ group, count: String(count) })),
          });
          break;
        case 'motives':
          printHealthReport({
            schoolName,
            title: 'Motifs de visite fréquents',
            subtitle,
            footerNote: footer,
            columns: [
              { key: 'motive', label: 'Motif' },
              { key: 'count', label: 'Occurrences', align: 'right' },
            ],
            rows: report.topMotives.map((m) => ({ motive: m.motive, count: String(m.count) })),
          });
          break;
        default:
          break;
      }
      toast.success('Rapport ouvert pour impression');
    } catch {
      toast.error('Impossible d’imprimer le rapport');
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[140px]">
            <label className="text-xs font-medium text-stone-600">Du</label>
            <input
              type="date"
              className="w-full border rounded-lg px-3 py-2 text-sm mt-0.5"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              aria-label="Date de début"
            />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="text-xs font-medium text-stone-600">Au</label>
            <input
              type="date"
              className="w-full border rounded-lg px-3 py-2 text-sm mt-0.5"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              aria-label="Date de fin"
            />
          </div>
          {isFetching && <p className="text-xs text-stone-500 pb-2">Actualisation…</p>}
        </div>
      </Card>

      {isLoading ? (
        <p className="text-sm text-stone-500">Chargement des statistiques…</p>
      ) : report ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {[
              { label: 'Visites (période)', value: report.summary.visitsPeriod, accent: 'text-rose-700' },
              { label: 'Visites (total)', value: report.summary.visitsTotal, accent: 'text-stone-800' },
              { label: 'Fiches à jour', value: report.summary.dossiersComplete, accent: 'text-emerald-700' },
              { label: 'Fiches incomplètes', value: report.summary.dossiersPartial, accent: 'text-amber-700' },
              { label: 'Sans fiche', value: report.summary.dossiersNone, accent: 'text-stone-500' },
              { label: 'Allergies', value: report.summary.allergyRecords, accent: 'text-orange-700' },
              { label: 'Traitements actifs', value: report.summary.activeTreatments, accent: 'text-violet-700' },
              { label: 'Urgences ouvertes', value: report.summary.openEmergencies, accent: 'text-red-700' },
            ].map((k) => (
              <Card key={k.label} className="p-3">
                <p className="text-[10px] uppercase tracking-wide text-stone-500">{k.label}</p>
                <p className={`text-2xl font-bold mt-1 ${k.accent}`}>{k.value}</p>
              </Card>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <Card className="p-4">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <FiBarChart2 className="w-4 h-4 text-rose-600" />
                Visites par mois
              </h3>
              <ul className="space-y-2">
                {report.visitsByMonth.map((m) => (
                  <li key={m.month}>
                    <div className="flex justify-between text-xs text-stone-600 mb-0.5">
                      <span>{format(parseISO(`${m.month}-01`), 'MMMM yyyy', { locale: fr })}</span>
                      <span className="font-semibold">{m.count}</span>
                    </div>
                    <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-rose-500 rounded-full"
                        style={{ width: `${Math.round((m.count / maxMonthVisits) * 100)}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold text-sm mb-3">Issues des visites (période)</h3>
              <ul className="space-y-1.5 text-sm">
                {report.visitsByOutcome.length === 0 ? (
                  <li className="text-stone-400 text-xs">Aucune visite sur la période.</li>
                ) : (
                  report.visitsByOutcome.map((o) => (
                    <li key={o.outcome} className="flex justify-between border-b border-stone-50 pb-1">
                      <span>{OUTCOME_LABELS[o.outcome] ?? o.outcome}</span>
                      <span className="font-semibold text-rose-800">{o._count._all}</span>
                    </li>
                  ))
                )}
              </ul>
            </Card>
          </div>

          <Card className="p-4">
            <h3 className="font-semibold text-sm mb-1">Rapports imprimables</h3>
            <p className="text-xs text-stone-500 mb-4">
              Période : {periodLabel(report.period.from, report.period.to)}
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              {REPORTS.map((r) => (
                <div
                  key={r.id}
                  className="flex items-start justify-between gap-3 border border-stone-100 rounded-xl p-3 hover:border-rose-200 hover:bg-rose-50/30"
                >
                  <div>
                    <p className="font-medium text-sm text-stone-900">{r.title}</p>
                    <p className="text-xs text-stone-500 mt-0.5">{r.description}</p>
                  </div>
                  <Button type="button" size="sm" variant="outline" onClick={() => print(r.id)} title="Imprimer">
                    <FiPrinter className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </>
      ) : null}
    </div>
  );
}
