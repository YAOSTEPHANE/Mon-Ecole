'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { IconType } from 'react-icons';
import {
  FiAlertTriangle,
  FiAward,
  FiBell,
  FiBookOpen,
  FiCalendar,
  FiCreditCard,
  FiFileText,
  FiLayers,
  FiMail,
  FiUsers,
} from 'react-icons/fi';
import { adminApi } from '@/services/api';
import { useSchool } from '@/contexts/SchoolContext';
import { useSchoolReady, schoolQueryKey } from '@/hooks/useSchoolReady';
import { formatFCFA } from '@/utils/currency';
import { getCurrentAcademicYear } from '@/utils/academicYear';

const CARD =
  'premium-surface p-5';

const EVENT_TYPE_LABELS: Record<string, string> = {
  HOLIDAY: 'Férié',
  VACATION: 'Vacances',
  EXAM_PERIOD: 'Examens',
  MEETING: 'Réunion',
  OTHER: 'Autre',
};

const DISCIPLINE_LABELS: Record<string, string> = {
  VERBAL_WARNING: 'Avertissement oral',
  WRITTEN_WARNING: 'Avertissement écrit',
  REPRIMAND: 'Blâme',
  TEMPORARY_EXCLUSION: 'Exclusion temporaire',
  DISCIPLINE_COUNCIL_HEARING: 'Conseil de discipline',
  DISCIPLINE_COUNCIL_DECISION: 'Décision du conseil',
  BEHAVIOR_CONTRACT: 'Contrat de conduite',
  OTHER: 'Autre',
};

type KpiSlice = {
  admissionsPending?: number;
  admissionsUnderReview?: number;
  tuitionUnpaidAmount?: number;
  tuitionUnpaidCount?: number;
  paymentsCompleted30dAmount?: number;
  paymentsCompleted30dCount?: number;
  studentAssignmentsSubmissionRate?: number | null;
  atRiskHigh?: number;
  atRiskMedium?: number;
  examSuccessRate?: number | null;
  annualProgression?: number | null;
};

type OpsModuleBoardsProps = {
  hasModule: (...ids: string[]) => boolean;
  onNavigate: (tabId: string) => void;
  cards: KpiSlice;
  stats?: {
    totalTeachers?: number;
    totalClasses?: number;
    totalParents?: number;
    totalEducators?: number;
  };
  section: 'snapshots' | 'feeds';
};

type Snapshot = {
  key: string;
  title: string;
  value: string;
  hint: string;
  icon: IconType;
  tab: string;
};

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function personName(user?: { firstName?: string; lastName?: string } | null): string {
  return `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || '—';
}

function CardHead({
  title,
  icon: Icon,
  onMore,
}: {
  title: string;
  icon: IconType;
  onMore?: () => void;
}) {
  return (
    <div className="mb-4 flex h-8 items-center justify-between gap-2">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e8eefc] text-[#0018A8]">
          <Icon className="h-3.5 w-3.5" aria-hidden />
        </span>
        <h3 className="min-w-0 truncate text-[12px] font-semibold leading-tight text-stone-900 sm:text-[13px] sm:leading-none">
          {title}
        </h3>
      </div>
      {onMore ? (
        <button
          type="button"
          onClick={onMore}
          aria-label={`Voir plus — ${title}`}
          className="shrink-0 whitespace-nowrap rounded-lg px-1.5 py-1 text-[11px] font-medium leading-none text-[#3d6bff] hover:bg-[#e8eefc] hover:text-[#0018A8] sm:text-[12px]"
        >
          <span className="sm:hidden">Plus</span>
          <span className="hidden sm:inline">Voir plus</span>
        </button>
      ) : null}
    </div>
  );
}

function EmptyLine({ text }: { text: string }) {
  return <p className="py-8 text-center text-sm text-stone-500">{text}</p>;
}

export default function OpsModuleBoards({
  hasModule,
  onNavigate,
  cards,
  stats,
  section,
}: OpsModuleBoardsProps) {
  const { activeSchoolId } = useSchool();
  const schoolReady = useSchoolReady();

  const showFees = hasModule('fees', 'tuition-fees', 'accounting');
  const showPayments = hasModule('payments', 'fees', 'accounting');
  const showAdmissions = hasModule('admissions');
  const showExams = hasModule('exams', 'grading');
  const showPedagogy = hasModule('pedagogical', 'grading', 'academic');
  const showElearning = hasModule('elearning');
  const showClasses = hasModule('classes');
  const showTeachers = hasModule('teachers', 'hr', 'staff-personnel');
  const showParents = hasModule('parent-guardians');
  const showCalendar = hasModule('calendar');
  const showCommunication = hasModule('communication');
  const showDiscipline = hasModule('discipline');
  const showExtra = hasModule('extracurricular');
  const showLibrary = hasModule('library');
  const showNotifications = hasModule('notifications');

  const snapshots = useMemo(() => {
    const items: Snapshot[] = [];
    if (showFees) {
      items.push({
        key: 'fees',
        title: 'Frais impayés',
        value: String(cards.tuitionUnpaidCount ?? 0),
        hint: formatFCFA(cards.tuitionUnpaidAmount ?? 0),
        icon: FiCreditCard,
        tab: hasModule('tuition-fees') ? 'tuition-fees' : 'fees',
      });
    }
    if (showPayments) {
      items.push({
        key: 'payments',
        title: 'Encaissements 30 j',
        value: String(cards.paymentsCompleted30dCount ?? 0),
        hint: formatFCFA(cards.paymentsCompleted30dAmount ?? 0),
        icon: FiCreditCard,
        tab: hasModule('payments') ? 'payments' : 'fees',
      });
    }
    if (showAdmissions) {
      items.push({
        key: 'admissions',
        title: 'Inscriptions',
        value: String((cards.admissionsPending ?? 0) + (cards.admissionsUnderReview ?? 0)),
        hint: `${cards.admissionsPending ?? 0} en attente`,
        icon: FiFileText,
        tab: 'admissions',
      });
    }
    if (showPedagogy) {
      items.push({
        key: 'risk',
        title: 'Élèves à risque',
        value: String((cards.atRiskHigh ?? 0) + (cards.atRiskMedium ?? 0)),
        hint: `${cards.atRiskHigh ?? 0} élevé · ${cards.atRiskMedium ?? 0} moyen`,
        icon: FiAlertTriangle,
        tab: hasModule('pedagogical') ? 'pedagogical' : 'grading',
      });
    }
    if (showExams) {
      items.push({
        key: 'exams',
        title: 'Réussite examens',
        value: cards.examSuccessRate != null ? `${Math.round(cards.examSuccessRate)}%` : '—',
        hint:
          cards.annualProgression != null
            ? `Progression ${cards.annualProgression > 0 ? '+' : ''}${cards.annualProgression}%`
            : 'Examens blancs et officiels',
        icon: FiAward,
        tab: hasModule('exams') ? 'exams' : 'grading',
      });
    }
    if (showElearning) {
      items.push({
        key: 'elearning',
        title: 'Devoirs rendus',
        value:
          cards.studentAssignmentsSubmissionRate != null
            ? `${Math.round(cards.studentAssignmentsSubmissionRate)}%`
            : '—',
        hint: 'Taux de remise des devoirs',
        icon: FiBookOpen,
        tab: 'elearning',
      });
    }
    if (showClasses) {
      items.push({
        key: 'classes',
        title: 'Classes',
        value: String(stats?.totalClasses ?? 0),
        hint: 'Effectifs par classe',
        icon: FiLayers,
        tab: 'classes',
      });
    }
    if (showTeachers) {
      items.push({
        key: 'teachers',
        title: 'Personnel',
        value: String((stats?.totalTeachers ?? 0) + (stats?.totalEducators ?? 0)),
        hint: `${stats?.totalTeachers ?? 0} enseignants`,
        icon: FiUsers,
        tab: hasModule('teachers') ? 'teachers' : 'staff-personnel',
      });
    }
    if (showParents) {
      items.push({
        key: 'parents',
        title: 'Parents & tuteurs',
        value: String(stats?.totalParents ?? 0),
        hint: 'Comptes famille',
        icon: FiUsers,
        tab: 'parent-guardians',
      });
    }
    return items.slice(0, 8);
  }, [
    cards,
    stats,
    hasModule,
    showFees,
    showPayments,
    showAdmissions,
    showPedagogy,
    showExams,
    showElearning,
    showClasses,
    showTeachers,
    showParents,
  ]);

  const { data: calendarRaw = [] } = useQuery({
    queryKey: schoolQueryKey(['admin-ops-calendar'], activeSchoolId),
    queryFn: () => adminApi.getSchoolCalendarEvents(),
    staleTime: 60_000,
    enabled: schoolReady && section === 'feeds' && showCalendar,
  });
  const { data: announcementsRaw = [] } = useQuery({
    queryKey: schoolQueryKey(['admin-ops-announcements'], activeSchoolId),
    queryFn: () => adminApi.getAnnouncements(),
    staleTime: 30_000,
    enabled: schoolReady && section === 'feeds' && showCommunication,
  });
  const { data: examsRaw = [] } = useQuery({
    queryKey: schoolQueryKey(['admin-ops-exams'], activeSchoolId),
    queryFn: () => adminApi.getMockExams(),
    staleTime: 60_000,
    enabled: schoolReady && section === 'feeds' && showExams,
  });
  const { data: disciplineRaw } = useQuery({
    queryKey: schoolQueryKey(['admin-ops-discipline'], activeSchoolId),
    queryFn: () => adminApi.getDisciplineRecords({ limit: 6 }),
    staleTime: 30_000,
    enabled: schoolReady && section === 'feeds' && showDiscipline,
  });
  const { data: extraRaw = [] } = useQuery({
    queryKey: schoolQueryKey(['admin-ops-extra'], activeSchoolId),
    queryFn: () => adminApi.getExtracurricularOfferings(),
    staleTime: 60_000,
    enabled: schoolReady && section === 'feeds' && showExtra,
  });
  const { data: loansRaw = [] } = useQuery({
    queryKey: schoolQueryKey(['admin-ops-loans'], activeSchoolId),
    queryFn: () => adminApi.getLibraryLoans({ status: 'ACTIVE' }),
    staleTime: 60_000,
    enabled: schoolReady && section === 'feeds' && showLibrary,
  });
  const { data: notifRaw = [] } = useQuery({
    queryKey: schoolQueryKey(['admin-ops-notifications'], activeSchoolId),
    queryFn: () => adminApi.getNotifications({ unread: true }),
    staleTime: 30_000,
    enabled: schoolReady && section === 'feeds' && showNotifications,
  });

  const upcomingEvents = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return asArray<{
      id: string;
      title?: string;
      type?: string;
      startDate?: string;
      endDate?: string;
    }>(calendarRaw)
      .filter((row) => {
        const end = row.endDate ? new Date(row.endDate) : row.startDate ? new Date(row.startDate) : null;
        return !end || end >= start;
      })
      .slice(0, 5);
  }, [calendarRaw]);

  const announcements = asArray<{
    id: string;
    title?: string;
    published?: boolean;
    createdAt?: string;
    author?: { firstName?: string; lastName?: string };
  }>(announcementsRaw).slice(0, 5);

  const exams = asArray<{
    id: string;
    title?: string;
    createdAt?: string;
    class?: { name?: string };
    _count?: { attempts?: number; questions?: number };
  }>(examsRaw).slice(0, 5);

  const discipline = asArray<{
    id: string;
    title?: string;
    category?: string;
    incidentDate?: string;
    student?: { user?: { firstName?: string; lastName?: string }; class?: { name?: string } };
  }>(
    disciplineRaw && typeof disciplineRaw === 'object' && 'records' in disciplineRaw
      ? (disciplineRaw as { records: unknown }).records
      : disciplineRaw,
  ).slice(0, 5);

  const extras = asArray<{
    id: string;
    title?: string;
    name?: string;
    kind?: string;
    category?: string;
  }>(extraRaw).slice(0, 5);

  const loans = asArray<{
    id: string;
    dueDate?: string;
    book?: { title?: string };
    borrower?: { firstName?: string; lastName?: string };
  }>(loansRaw).slice(0, 5);

  const notifications = asArray<{
    id: string;
    title?: string;
    content?: string;
    createdAt?: string;
  }>(notifRaw).slice(0, 5);

  if (section === 'snapshots') {
    if (snapshots.length === 0) return null;
    return (
      <div className="mt-4 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        {snapshots.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => onNavigate(item.tab)}
            className={`${CARD} flex min-h-32 flex-col items-start text-left transition hover:-translate-y-0.5 hover:shadow-[0_16px_36px_-20px_rgba(28,39,76,0.38)]`}
          >
            <div className="flex w-full items-center justify-between gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e8eefc] text-[#0018A8]">
                <item.icon className="h-3.5 w-3.5" aria-hidden />
              </span>
              <span className="text-[12px] font-medium text-[#3d6bff]">Ouvrir</span>
            </div>
            <p className="mt-3 text-[13px] font-semibold text-stone-900">{item.title}</p>
            <p className="mt-1 text-[28px] font-bold leading-none tracking-tight text-stone-900">
              {item.value}
            </p>
            <p className="mt-2 line-clamp-2 text-[12px] text-stone-500">{item.hint}</p>
          </button>
        ))}
      </div>
    );
  }

  const feeds = [
    showCalendar,
    showCommunication,
    showExams,
    showDiscipline,
    showExtra,
    showLibrary,
    showNotifications,
  ].some(Boolean);
  if (!feeds) return null;

  return (
    <div className="mt-4 grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
      {showCalendar ? (
        <section className={CARD}>
          <CardHead title="Calendrier scolaire" icon={FiCalendar} onMore={() => onNavigate('calendar')} />
          {upcomingEvents.length === 0 ? (
            <EmptyLine text="Aucun événement à venir." />
          ) : (
            <ul className="space-y-3">
              {upcomingEvents.map((row) => (
                <li key={row.id} className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-stone-900">
                      {row.title || 'Événement'}
                    </span>
                    <span className="block text-[12px] text-stone-500">
                      {EVENT_TYPE_LABELS[row.type || ''] || 'Événement'}
                    </span>
                  </span>
                  <time className="shrink-0 text-[11px] font-medium text-stone-500">
                    {row.startDate ? format(new Date(row.startDate), 'd MMM', { locale: fr }) : '—'}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {showCommunication ? (
        <section className={CARD}>
          <CardHead title="Communication" icon={FiMail} onMore={() => onNavigate('communication')} />
          {announcements.length === 0 ? (
            <EmptyLine text="Aucune annonce récente." />
          ) : (
            <ul className="space-y-3">
              {announcements.map((row) => (
                <li key={row.id} className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-stone-900">
                      {row.title || 'Annonce'}
                    </span>
                    <span className="block text-[12px] text-stone-500">
                      {row.published ? 'Publiée' : 'Brouillon'}
                      {row.author ? ` · ${personName(row.author)}` : ''}
                    </span>
                  </span>
                  <time className="shrink-0 text-[11px] font-medium text-stone-500">
                    {row.createdAt ? format(new Date(row.createdAt), 'd MMM', { locale: fr }) : ''}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {showExams ? (
        <section className={CARD}>
          <CardHead
            title="Examens blancs"
            icon={FiAward}
            onMore={() => onNavigate(hasModule('exams') ? 'exams' : 'grading')}
          />
          {exams.length === 0 ? (
            <EmptyLine text="Aucun examen blanc pour le moment." />
          ) : (
            <ul className="space-y-3">
              {exams.map((row) => (
                <li key={row.id} className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-stone-900">
                      {row.title || 'Examen'}
                    </span>
                    <span className="block text-[12px] text-stone-500">
                      {row.class?.name || 'Toutes classes'}
                      {row._count?.attempts != null ? ` · ${row._count.attempts} copies` : ''}
                    </span>
                  </span>
                  <time className="shrink-0 text-[11px] font-medium text-stone-500">
                    {row.createdAt ? format(new Date(row.createdAt), 'd MMM', { locale: fr }) : ''}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {showDiscipline ? (
        <section className={CARD}>
          <CardHead title="Discipline" icon={FiAlertTriangle} onMore={() => onNavigate('discipline')} />
          {discipline.length === 0 ? (
            <EmptyLine text="Aucun suivi disciplinaire récent." />
          ) : (
            <ul className="space-y-3">
              {discipline.map((row) => (
                <li key={row.id} className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-stone-900">
                      {personName(row.student?.user)}
                    </span>
                    <span className="block truncate text-[12px] text-stone-500">
                      {DISCIPLINE_LABELS[row.category || ''] || row.title || 'Suivi'}
                      {row.student?.class?.name ? ` · ${row.student.class.name}` : ''}
                    </span>
                  </span>
                  <time className="shrink-0 text-[11px] font-medium text-stone-500">
                    {row.incidentDate ? format(new Date(row.incidentDate), 'd MMM', { locale: fr }) : ''}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {showLibrary ? (
        <section className={CARD}>
          <CardHead title="Prêts en cours" icon={FiBookOpen} onMore={() => onNavigate('library')} />
          {loans.length === 0 ? (
            <EmptyLine text="Aucun prêt actif." />
          ) : (
            <ul className="space-y-3">
              {loans.map((row) => (
                <li key={row.id} className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-stone-900">
                      {row.book?.title || 'Ouvrage'}
                    </span>
                    <span className="block truncate text-[12px] text-stone-500">
                      {personName(row.borrower)}
                    </span>
                  </span>
                  <time className="shrink-0 text-[11px] font-medium text-stone-500">
                    {row.dueDate ? format(new Date(row.dueDate), 'd MMM', { locale: fr }) : ''}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {showExtra ? (
        <section className={CARD}>
          <CardHead title="Parascolaire" icon={FiLayers} onMore={() => onNavigate('extracurricular')} />
          {extras.length === 0 ? (
            <EmptyLine text="Aucune activité parascolaire." />
          ) : (
            <ul className="space-y-3">
              {extras.map((row) => (
                <li key={row.id} className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-stone-900">
                    {row.title || row.name || 'Activité'}
                  </span>
                  <span className="block text-[12px] text-stone-500">
                    {row.kind === 'CLUB' ? 'Club' : row.kind === 'EVENT' ? 'Événement' : 'Activité'}
                    {row.category ? ` · ${row.category}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {showNotifications ? (
        <section className={CARD}>
          <CardHead title="Notifications" icon={FiBell} onMore={() => onNavigate('notifications')} />
          {notifications.length === 0 ? (
            <EmptyLine text="Aucune notification non lue." />
          ) : (
            <ul className="space-y-3">
              {notifications.map((row) => (
                <li key={row.id} className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-stone-900">
                      {row.title || 'Notification'}
                    </span>
                    {row.content ? (
                      <span className="block truncate text-[12px] text-stone-500">{row.content}</span>
                    ) : null}
                  </span>
                  <time className="shrink-0 text-[11px] font-medium text-stone-500">
                    {row.createdAt ? format(new Date(row.createdAt), 'd MMM', { locale: fr }) : ''}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
