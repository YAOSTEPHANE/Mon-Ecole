'use client';

import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { FiActivity, FiAlertTriangle, FiHeart, FiPhone, FiShield } from 'react-icons/fi';
import { parentApi } from '../../services/api';
import Card from '../ui/Card';
import Badge from '../ui/Badge';

const OUTCOME_LABELS: Record<string, string> = {
  RETURN_TO_CLASS: 'Retour en classe',
  SENT_HOME: 'Retour à domicile',
  PARENT_PICKUP: 'Récupération parent',
  REFERRED_HOSPITAL: 'Orientation hôpital / SAMU',
  REST_INFIRMARY: 'Repos infirmerie',
  OTHER: 'Autre',
};

const SEVERITY_LABELS: Record<string, string> = {
  LOW: 'Faible',
  MEDIUM: 'Moyenne',
  HIGH: 'Élevée',
  CRITICAL: 'Critique',
};

const CAMPAIGN_STATUS_LABELS: Record<string, string> = {
  SCHEDULED: 'Planifiée',
  COMPLETED: 'Réalisée',
  ABSENT: 'Absente',
  DECLINED: 'Refusée',
};

type ParentHealthSummary = {
  student: {
    firstName: string;
    lastName: string;
    allergies: string | null;
    emergencyContact: string | null;
    emergencyPhone: string | null;
    emergencyContact2: string | null;
    emergencyPhone2: string | null;
  };
  dossier: {
    bloodGroup: string | null;
    familyDoctorName: string | null;
    familyDoctorPhone: string | null;
    preferredHospital: string | null;
    insuranceInfo: string | null;
  } | null;
  allergyRecords: Array<{
    id: string;
    allergen: string;
    severity: string | null;
    reaction: string | null;
  }>;
  treatments: Array<{
    id: string;
    medication: string;
    dosage: string | null;
    schedule: string | null;
    startDate: string | null;
    endDate: string | null;
    isActive: boolean;
  }>;
  visits: Array<{
    id: string;
    visitedAt: string;
    motive: string;
    careAdministered: string | null;
    outcome: string;
    parentNotified: boolean;
  }>;
  emergencies: Array<{
    id: string;
    reportedAt: string;
    severity: string;
    description: string;
    actionsTaken: string | null;
    resolvedAt: string | null;
  }>;
  campaigns: Array<{
    id: string;
    status: string;
    completedAt: string | null;
    title: string;
    kind: string;
    startDate: string;
    endDate: string | null;
  }>;
};

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  return format(new Date(value), 'dd MMMM yyyy', { locale: fr });
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—';
  return format(new Date(value), "dd MMM yyyy 'à' HH:mm", { locale: fr });
}

export default function ParentHealthPanel({ studentId }: { studentId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['parent-child-health', studentId],
    queryFn: () => parentApi.getChildHealth(studentId) as Promise<ParentHealthSummary>,
    enabled: !!studentId,
  });

  if (isLoading) {
    return (
      <Card>
        <div className="py-12 text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-b-2 border-rose-600" />
          <p className="mt-4 text-gray-600">Chargement du dossier infirmerie…</p>
        </div>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <p className="py-8 text-center text-sm text-red-700">
          Impossible de charger les informations de santé. Réessayez plus tard.
        </p>
      </Card>
    );
  }

  const activeTreatments = data.treatments.filter((t) => t.isActive);
  const childName = `${data.student.firstName} ${data.student.lastName}`.trim();

  return (
    <div className="space-y-6">
      <Card className="border border-rose-100 bg-rose-50/40 p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-rose-950">
          <FiHeart className="h-4 w-4" />
          Infirmerie — {childName || 'votre enfant'}
        </h3>
        <p className="mt-1 text-xs text-rose-900/80">
          Consultation en lecture seule : allergies, contacts d’urgence, passages à l’infirmerie et
          campagnes. Les notes cliniques internes ne sont pas affichées.
        </p>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="space-y-3 p-4">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <FiShield className="h-4 w-4 text-rose-600" />
            Fiche santé
          </h4>
          <InfoRow label="Groupe sanguin" value={data.dossier?.bloodGroup} highlight />
          <InfoRow label="Allergies (fiche élève)" value={data.student.allergies} />
          <InfoRow label="Médecin de famille" value={data.dossier?.familyDoctorName} />
          <InfoRow label="Téléphone médecin" value={data.dossier?.familyDoctorPhone} />
          <InfoRow label="Hôpital préféré" value={data.dossier?.preferredHospital} />
          <InfoRow label="Assurance" value={data.dossier?.insuranceInfo} />
        </Card>

        <Card className="space-y-3 p-4">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <FiPhone className="h-4 w-4 text-rose-600" />
            Contacts d’urgence
          </h4>
          <InfoRow
            label="Contact 1"
            value={
              data.student.emergencyContact
                ? `${data.student.emergencyContact}${data.student.emergencyPhone ? ` — ${data.student.emergencyPhone}` : ''}`
                : null
            }
          />
          <InfoRow
            label="Contact 2"
            value={
              data.student.emergencyContact2
                ? `${data.student.emergencyContact2}${data.student.emergencyPhone2 ? ` — ${data.student.emergencyPhone2}` : ''}`
                : null
            }
          />
        </Card>
      </div>

      <section className="space-y-3">
        <h4 className="text-sm font-semibold text-gray-900">Allergies déclarées</h4>
        {data.allergyRecords.length === 0 ? (
          <p className="text-sm text-gray-500">Aucune fiche d’allergie enregistrée à l’infirmerie.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {data.allergyRecords.map((row) => (
              <Card key={row.id} className="space-y-1 p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-gray-900">{row.allergen}</span>
                  {row.severity ? (
                    <Badge variant="warning" size="sm">
                      {row.severity}
                    </Badge>
                  ) : null}
                </div>
                {row.reaction ? <p className="text-xs text-gray-600">{row.reaction}</p> : null}
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <FiActivity className="h-4 w-4" />
          Traitements en cours
        </h4>
        {activeTreatments.length === 0 ? (
          <p className="text-sm text-gray-500">Aucun traitement actif.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {activeTreatments.map((row) => (
              <Card key={row.id} className="space-y-1 p-4">
                <p className="font-medium text-gray-900">{row.medication}</p>
                {row.dosage ? <p className="text-xs text-gray-600">Posologie : {row.dosage}</p> : null}
                {row.schedule ? <p className="text-xs text-gray-600">Horaires : {row.schedule}</p> : null}
                <p className="text-xs text-gray-500">
                  {formatDate(row.startDate)} → {formatDate(row.endDate)}
                </p>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h4 className="text-sm font-semibold text-gray-900">Passages à l’infirmerie</h4>
        {data.visits.length === 0 ? (
          <p className="text-sm text-gray-500">Aucun passage enregistré.</p>
        ) : (
          <div className="space-y-3">
            {data.visits.map((visit) => (
              <Card key={visit.id} className="space-y-2 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-gray-900">{visit.motive}</p>
                  <Badge variant="secondary" size="sm">
                    {OUTCOME_LABELS[visit.outcome] ?? visit.outcome}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500">{formatDateTime(visit.visitedAt)}</p>
                {visit.careAdministered ? (
                  <p className="text-sm text-gray-700">Soins : {visit.careAdministered}</p>
                ) : null}
                <p className="text-xs text-gray-500">
                  {visit.parentNotified ? 'Parent informé' : 'Notification parent non indiquée'}
                </p>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <FiAlertTriangle className="h-4 w-4 text-amber-600" />
          Urgences sanitaires
        </h4>
        {data.emergencies.length === 0 ? (
          <p className="text-sm text-gray-500">Aucune urgence enregistrée.</p>
        ) : (
          <div className="space-y-3">
            {data.emergencies.map((row) => (
              <Card key={row.id} className="space-y-2 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-gray-500">{formatDateTime(row.reportedAt)}</p>
                  <Badge variant={row.resolvedAt ? 'success' : 'danger'} size="sm">
                    {SEVERITY_LABELS[row.severity] ?? row.severity}
                    {row.resolvedAt ? ' · résolue' : ''}
                  </Badge>
                </div>
                <p className="text-sm text-gray-900">{row.description}</p>
                {row.actionsTaken ? (
                  <p className="text-xs text-gray-600">Actions : {row.actionsTaken}</p>
                ) : null}
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h4 className="text-sm font-semibold text-gray-900">Campagnes de santé</h4>
        {data.campaigns.length === 0 ? (
          <p className="text-sm text-gray-500">Aucune participation à une campagne.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {data.campaigns.map((row) => (
              <Card key={row.id} className="space-y-1 p-4">
                <p className="font-medium text-gray-900">{row.title}</p>
                <p className="text-xs text-gray-500">
                  {formatDate(row.startDate)}
                  {row.endDate ? ` → ${formatDate(row.endDate)}` : ''}
                </p>
                <Badge variant="secondary" size="sm">
                  {CAMPAIGN_STATUS_LABELS[row.status] ?? row.status}
                </Badge>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function InfoRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value?: string | null;
  highlight?: boolean;
}) {
  const display = value?.trim() || 'Non renseigné';
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`text-sm ${highlight && value?.trim() ? 'font-semibold text-rose-800' : 'text-gray-800'}`}>
        {display}
      </p>
    </div>
  );
}
