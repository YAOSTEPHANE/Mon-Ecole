'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addDays, format, startOfDay, startOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import type { IconType } from 'react-icons';
import {
  FiCalendar,
  FiCheck,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiDownload,
  FiMenu,
  FiMoreVertical,
  FiPhone,
  FiSearch,
  FiUserX,
  FiX,
} from 'react-icons/fi';
import { adminApi } from '@/services/api';
import { useSchool } from '@/contexts/SchoolContext';
import { useSchoolReady, schoolQueryKey } from '@/hooks/useSchoolReady';
import {
  EDUCATION_SECTOR_SHORT_LABELS,
  type EducationSectorValue,
} from '@/lib/educationSector';
import Avatar from '@/components/ui/Avatar';
import AccountHeaderControls from '@/components/AccountHeaderControls';
import SchoolSwitcher from '@/components/admin/SchoolSwitcher';
import OpsVisualKpis from './OpsVisualKpis';
import OpsModuleBoards from './OpsModuleBoards';

const PILL_PREFER = [
  'students',
  'schedule',
  'fees',
  'exams',
  'communication',
  'library',
  'elearning',
  'classes',
  'admissions',
  'teachers',
  'calendar',
  'attendance',
] as const;

const PILL_SHORT: Record<string, string> = {
  students: 'Élèves',
  schedule: 'Emploi du temps',
  library: 'Documents',
  elearning: 'Supports',
  classes: 'Classes',
  admissions: 'Inscriptions',
  teachers: 'Enseignants',
  calendar: 'Calendrier',
  fees: 'Frais',
  communication: 'Communication',
  exams: 'Examens',
  attendance: 'Présences',
};

const CARD =
  'premium-surface p-5';

type SectorFilter = 'all' | EducationSectorValue;

type ScheduleRow = {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room?: string | null;
  classId?: string;
  class?: { id?: string; name?: string; educationSector?: string };
  course?: {
    name?: string;
    teacher?: { id?: string; user?: { firstName?: string; lastName?: string; phone?: string } };
  };
  substituteTeacher?: { id?: string; user?: { firstName?: string; lastName?: string } } | null;
};

type ClassRow = { id: string; name?: string; educationSector?: string };
type TeacherRow = {
  id: string;
  user?: { firstName?: string; lastName?: string; phone?: string; avatar?: string | null };
};
type KpiCards = {
  admissionsPending?: number;
  admissionsUnderReview?: number;
  tuitionUnpaidCount?: number;
  atRiskHigh?: number;
  atRiskMedium?: number;
  studentAssignmentsSubmissionRate?: number | null;
  standardizedTestScore?: number | null;
  annualProgression?: number | null;
  examSuccessRate?: number | null;
  attendancePresenceRate?: number | null;
  attendancePresentCount?: number;
  attendanceAbsentCount?: number;
  attendancePresenceDelta?: number;
  attendanceTotalDelta?: number;
  attendanceDaily?: number[];
  attendanceDailyPresent?: number[];
  attendanceDailyAbsent?: number[];
  attendanceDailyLabels?: string[];
  attendancePresentUnique?: number;
  attendancePresentUniqueDelta?: number;
  attendancePresentByClass?: Array<{ classId?: string; className: string; present: number }>;
};
type AdmissionRow = {
  id: string;
  firstName: string;
  lastName: string;
  desiredLevel?: string;
  createdAt?: string;
  status?: string;
  phone?: string | null;
};
type ReenrollRow = {
  id: string;
  status?: string;
  createdAt?: string;
  student?: { user?: { firstName?: string; lastName?: string } };
};

type OpsDashModule = {
  id: string;
  label: string;
  icon: IconType;
  color: string;
  description: string;
};

type AdminOpsDashboardProps = {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onNavigate: (
    tabId: string,
    options?: { admissionsTab?: 'preinscriptions' | 'reenrollments' },
  ) => void;
  onExport?: () => void;
  firstName?: string;
  lastName?: string;
  avatar?: string | null;
  roleLabel?: string;
  user?: {
    id?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    phone?: string | null;
    avatar?: string | null;
    isActive?: boolean;
    role?: string;
  };
  onLogout?: () => void;
  onOpenSettings?: () => void;
  onOpenSidebar?: () => void;
  modules?: OpsDashModule[];
};

function timeToMinutes(value: string): number {
  const [h, m] = String(value || '00:00').split(':').map((n) => parseInt(n, 10));
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

function personName(user?: { firstName?: string; lastName?: string } | null): string {
  return `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || '—';
}

function slotStatus(slot: ScheduleRow, nowMinutes: number, isToday: boolean) {
  if (!isToday) return 'upcoming' as const;
  if (timeToMinutes(slot.endTime) <= nowMinutes) return 'done' as const;
  if (timeToMinutes(slot.startTime) <= nowMinutes) return 'live' as const;
  return 'upcoming' as const;
}

const STATUS_UI = {
  done: { label: 'Terminé', className: 'bg-orange-50 text-orange-600' },
  live: { label: 'En cours', className: 'bg-cptb-blue text-white' },
  upcoming: { label: 'Confirmé', className: 'bg-blue-50 text-cptb-blue' },
  idle: { label: 'Libre', className: 'bg-stone-100 text-stone-500' },
};

const MIN_TEACHER_ROWS = 6;

function slotTeacherId(slot: ScheduleRow): string {
  return slot.substituteTeacher?.id || slot.course?.teacher?.id || '';
}

export default function AdminOpsDashboard({
  searchQuery,
  onSearchChange,
  onNavigate,
  onExport,
  firstName,
  lastName,
  avatar,
  user,
  onLogout,
  onOpenSettings,
  onOpenSidebar,
  modules = [],
}: AdminOpsDashboardProps) {
  const { activeSchoolId } = useSchool();
  const schoolReady = useSchoolReady();
  const moduleSet = useMemo(
    () => new Set(modules.map((m) => m.id).filter((id) => id !== 'dashboard')),
    [modules],
  );
  const hasModule = (...ids: string[]) => {
    if (moduleSet.size === 0) return true;
    return ids.some((id) => moduleSet.has(id));
  };
  const showSchedule = hasModule('schedule', 'academic', 'classes', 'teachers');
  const showRequests = hasModule('admissions');
  const showClasses = hasModule('classes', 'academic', 'students');
  const showTeachers = hasModule('teachers', 'staff-personnel', 'hr');
  const showStudents = hasModule('students', 'alumni', 'pedagogical');
  const showAttendance = hasModule('attendance', 'absences', 'management', 'students');
  const pillNav = useMemo(() => {
    const extras = PILL_PREFER.filter((id) => hasModule(id))
      .slice(0, 4)
      .map((id) => {
        const tab = modules.find((m) => m.id === id);
        return { id, label: PILL_SHORT[id] || tab?.label || id };
      });
    return [{ id: 'dashboard', label: 'Tableau de bord' }, ...extras];
  }, [modules, moduleSet]);
  const qc = useQueryClient();
  const [sector, setSector] = useState<SectorFilter>('all');
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [selectedDay, setSelectedDay] = useState(() => startOfDay(new Date()));
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const selectedDow = selectedDay.getDay();
  const isToday = startOfDay(now).getTime() === selectedDay.getTime();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: schoolQueryKey(['admin-dashboard'], activeSchoolId),
    queryFn: adminApi.getDashboard,
    enabled: schoolReady,
  });

  const { data: kpis } = useQuery({
    queryKey: schoolQueryKey(['admin-dashboard-kpis'], activeSchoolId),
    queryFn: adminApi.getDashboardKpis,
    staleTime: 60_000,
    enabled: schoolReady,
  });

  const { data: schedulesRaw = [] } = useQuery({
    queryKey: schoolQueryKey(['admin-ops-schedules'], activeSchoolId),
    queryFn: () => adminApi.getSchedules(),
    staleTime: 60_000,
    enabled: schoolReady && showSchedule,
  });

  const { data: classesRaw = [] } = useQuery({
    queryKey: schoolQueryKey(['admin-ops-classes'], activeSchoolId),
    queryFn: () => adminApi.getClasses(),
    staleTime: 60_000,
    enabled: schoolReady && showClasses,
  });

  const { data: teachersRaw = [] } = useQuery({
    queryKey: schoolQueryKey(['admin-ops-teachers'], activeSchoolId),
    queryFn: () => adminApi.getTeachers(),
    staleTime: 60_000,
    enabled: schoolReady && (showTeachers || showSchedule),
  });

  const { data: admissionsRaw = [] } = useQuery({
    queryKey: schoolQueryKey(['admin-ops-admissions'], activeSchoolId),
    queryFn: () => adminApi.getAdmissions({ status: 'PENDING' }),
    staleTime: 30_000,
    enabled: schoolReady && showRequests,
  });

  const { data: reenrollsRaw = [] } = useQuery({
    queryKey: schoolQueryKey(['admin-ops-reenrolls'], activeSchoolId),
    queryFn: () => adminApi.getReenrollmentRequests({ status: 'PENDING' }),
    staleTime: 30_000,
    enabled: schoolReady && showRequests,
  });

  const selectedDateKey = format(selectedDay, 'yyyy-MM-dd');
  const { data: absencesRaw = [] } = useQuery({
    queryKey: schoolQueryKey(['admin-ops-absences', selectedDateKey], activeSchoolId),
    queryFn: () => adminApi.getAllAbsences({ date: selectedDateKey }),
    staleTime: 30_000,
    enabled: schoolReady && showSchedule,
  });

  const classes = (Array.isArray(classesRaw) ? classesRaw : []) as ClassRow[];
  const sectorByClass = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of classes) {
      if (c.id) map.set(c.id, c.educationSector || 'GENERAL');
    }
    return map;
  }, [classes]);

  const allSlots = useMemo(() => {
    const rows = (Array.isArray(schedulesRaw) ? schedulesRaw : []) as ScheduleRow[];
    return rows.filter((s) => {
      if (sector === 'all') return true;
      const classId = s.classId || s.class?.id;
      const sec = (classId && sectorByClass.get(classId)) || s.class?.educationSector || 'GENERAL';
      return sec === sector;
    });
  }, [schedulesRaw, sector, sectorByClass]);

  const teachers = (Array.isArray(teachersRaw) ? teachersRaw : []) as TeacherRow[];
  const teacherById = useMemo(() => {
    const map = new Map<string, TeacherRow>();
    for (const t of teachers) map.set(t.id, t);
    return map;
  }, [teachers]);

  const teacherProgram = useMemo(() => {
    const dayRows = allSlots
      .filter((s) => Number(s.dayOfWeek) === selectedDow)
      .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

    const byTeacher = new Map<string, ScheduleRow>();
    const unassigned: ScheduleRow[] = [];
    for (const slot of dayRows) {
      const tid = slotTeacherId(slot);
      if (!tid) {
        unassigned.push(slot);
        continue;
      }
      if (!byTeacher.has(tid)) byTeacher.set(tid, slot);
    }

    type ProgramRow = {
      id: string;
      teacherId?: string;
      teacher?: { id?: string; user?: TeacherRow['user'] } | null;
      slot: ScheduleRow | null;
    };

    const rows: ProgramRow[] = [];
    const used = new Set<string>();

    const named = [...byTeacher.entries()].sort((a, b) => {
      const nameA = personName(a[1].substituteTeacher?.user || a[1].course?.teacher?.user);
      const nameB = personName(b[1].substituteTeacher?.user || b[1].course?.teacher?.user);
      return nameA.localeCompare(nameB, 'fr');
    });
    for (const [tid, slot] of named) {
      used.add(tid);
      rows.push({
        id: slot.id,
        teacherId: tid,
        teacher: slot.substituteTeacher || slot.course?.teacher,
        slot,
      });
    }
    for (const slot of unassigned) {
      rows.push({ id: slot.id, slot });
    }

    const weekExtras: { id: string; slot: ScheduleRow }[] = [];
    const weekSeen = new Set(used);
    for (const slot of allSlots) {
      const tid = slotTeacherId(slot);
      if (!tid || weekSeen.has(tid)) continue;
      weekSeen.add(tid);
      weekExtras.push({ id: tid, slot });
    }
    weekExtras.sort((a, b) => {
      const nameA = personName(a.slot.substituteTeacher?.user || a.slot.course?.teacher?.user);
      const nameB = personName(b.slot.substituteTeacher?.user || b.slot.course?.teacher?.user);
      return nameA.localeCompare(nameB, 'fr');
    });
    for (const extra of weekExtras) {
      if (rows.length >= MIN_TEACHER_ROWS) break;
      used.add(extra.id);
      rows.push({
        id: `week-${extra.id}`,
        teacherId: extra.id,
        teacher: extra.slot.substituteTeacher || extra.slot.course?.teacher,
        slot: null,
      });
    }

    const extras = [...teachers].sort((a, b) =>
      personName(a.user).localeCompare(personName(b.user), 'fr'),
    );
    for (const t of extras) {
      if (rows.length >= MIN_TEACHER_ROWS) break;
      if (used.has(t.id)) continue;
      used.add(t.id);
      rows.push({
        id: `teacher-${t.id}`,
        teacherId: t.id,
        teacher: t,
        slot: null,
      });
    }

    return rows.slice(0, Math.min(Math.max(rows.length, MIN_TEACHER_ROWS), 10));
  }, [allSlots, selectedDow, teachers]);

  type AbsenceDayRow = {
    id: string;
    date?: string;
    status?: string;
    studentId?: string;
    student?: {
      class?: { id?: string; name?: string; educationSector?: string };
      user?: { firstName?: string; lastName?: string; avatar?: string | null };
    };
  };

  const absentStudents = useMemo(() => {
    const rows = (Array.isArray(absencesRaw) ? absencesRaw : []) as AbsenceDayRow[];
    const seen = new Set<string>();
    const list: Array<{
      id: string;
      name: string;
      className: string;
      avatar?: string | null;
      date: Date;
    }> = [];
    for (const row of rows) {
      const status = String(row.status || '').toUpperCase();
      if (status !== 'ABSENT' && status !== 'EXCUSED') continue;
      const sid = row.studentId || row.id;
      if (seen.has(sid)) continue;
      const classId = row.student?.class?.id;
      if (sector !== 'all') {
        const sec =
          (classId && sectorByClass.get(classId)) || row.student?.class?.educationSector || 'GENERAL';
        if (sec !== sector) continue;
      }
      const parsed = row.date ? new Date(row.date) : selectedDay;
      seen.add(sid);
      list.push({
        id: sid,
        name: personName(row.student?.user),
        className: row.student?.class?.name || '—',
        avatar: row.student?.user?.avatar,
        date: Number.isNaN(parsed.getTime()) ? selectedDay : parsed,
      });
    }
    return list.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }, [absencesRaw, sector, sectorByClass, selectedDay]);

  const daysWithSlots = useMemo(() => {
    const set = new Set<number>();
    for (const s of allSlots) set.add(Number(s.dayOfWeek));
    return set;
  }, [allSlots]);

  const cards = (kpis?.cards ?? {}) as KpiCards;
  const classDist = (stats?.classDistribution ?? []) as Array<{ name: string; value: number }>;

  const generalCount = classes
    .filter((c) => (c.educationSector || 'GENERAL') === 'GENERAL')
    .reduce((s, c) => {
      const row = classDist.find((d) => d.name === c.name);
      return s + Number(row?.value || 0);
    }, 0);
  const technicalCount = Math.max(0, (stats?.totalStudents ?? 0) - generalCount);

  const presenceRate = cards.attendancePresenceRate;
  const satisfactionPct = presenceRate != null ? presenceRate : 0;
  const satisfactionDelta = cards.attendancePresenceDelta ?? 0;

  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedDay, { weekStartsOn: 1, locale: fr });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [selectedDay]);

  const admissions = (Array.isArray(admissionsRaw) ? admissionsRaw : []) as AdmissionRow[];
  const reenrolls = (Array.isArray(reenrollsRaw) ? reenrollsRaw : []) as ReenrollRow[];

  const requests = useMemo(() => {
    const a = admissions.slice(0, 4).map((row) => ({
      id: row.id,
      kind: 'admission' as const,
      name: `${row.firstName} ${row.lastName}`.trim(),
      firstName: row.firstName,
      lastName: row.lastName,
      detail: row.desiredLevel ? `Pré-inscription · ${row.desiredLevel}` : 'Pré-inscription',
      when: row.createdAt ? format(new Date(row.createdAt), 'd MMM · HH:mm', { locale: fr }) : '',
      phone: row.phone || '',
    }));
    const r = reenrolls.slice(0, 3).map((row) => ({
      id: row.id,
      kind: 'reenroll' as const,
      name: personName(row.student?.user),
      firstName: row.student?.user?.firstName ?? '',
      lastName: row.student?.user?.lastName ?? '',
      detail: 'Demande de réinscription',
      when: row.createdAt ? format(new Date(row.createdAt), 'd MMM · HH:mm', { locale: fr }) : '',
      phone: '',
    }));
    return [...a, ...r].slice(0, 5);
  }, [admissions, reenrolls]);

  const invalidateInbox = () => {
    qc.invalidateQueries({ queryKey: schoolQueryKey(['admin-ops-admissions'], activeSchoolId) });
    qc.invalidateQueries({ queryKey: schoolQueryKey(['admin-ops-reenrolls'], activeSchoolId) });
    qc.invalidateQueries({ queryKey: schoolQueryKey(['admin-dashboard-kpis'], activeSchoolId) });
  };

  const admitMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'UNDER_REVIEW' | 'REJECTED' }) =>
      adminApi.updateAdmission(id, { status }),
    onSuccess: (_, vars) => {
      toast.success(vars.status === 'REJECTED' ? 'Dossier refusé' : 'Dossier accepté en examen');
      invalidateInbox();
    },
    onError: (e: { response?: { data?: { error?: string } } }) =>
      toast.error(e.response?.data?.error || 'Action impossible'),
  });

  const openReenrollReview = () => {
    toast('Choisissez la classe ou le motif dans Inscriptions.');
    onNavigate('admissions', { admissionsTab: 'reenrollments' });
  };

  const stackedItems = showStudents
    ? [
        { label: 'Général', value: generalCount, color: '#0018A8' },
        { label: 'Technique', value: technicalCount, color: '#7BA3FF' },
        {
          label: 'Inactifs',
          value: Math.max(0, (stats?.totalStudents ?? 0) - (stats?.activeStudents ?? 0)),
          color: '#D9DCE3',
        },
      ]
    : showTeachers
      ? [
          { label: 'Enseignants', value: stats?.totalTeachers ?? 0, color: '#0018A8' },
          { label: 'Éducateurs', value: stats?.totalEducators ?? 0, color: '#7BA3FF' },
        ]
      : [{ label: 'Effectifs', value: stats?.totalStudents ?? stats?.totalTeachers ?? 0, color: '#0018A8' }];

  const treatmentLabel = 'Présents par classe';
  const presentByClass = Array.isArray(cards.attendancePresentByClass)
    ? cards.attendancePresentByClass
    : [];
  const treatmentTotal = cards.attendancePresentUnique ?? 0;
  const presentByName = new Map(presentByClass.map((row) => [row.className, row.present]));
  const bubbleNames = [
    ...new Set([
      ...classDist.map((c) => c.name).filter((name) => name && name !== 'Non assigné'),
      ...presentByClass.map((row) => row.className).filter(Boolean),
    ]),
  ];
  const treatmentBubbles = bubbleNames
    .map((name) => ({ name, value: presentByName.get(name) ?? 0 }))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name, 'fr'));
  const treatmentDelta = cards.attendancePresentUniqueDelta ?? 0;
  const satisfactionLabel = 'Présence & absence';
  const stackedLabel = showStudents ? 'Total élèves' : showTeachers ? 'Total personnel' : 'Effectifs';
  const stackedTotal = showStudents
    ? (stats?.totalStudents ?? 0)
    : showTeachers
      ? (stats?.totalTeachers ?? 0) + (stats?.totalEducators ?? 0)
      : (stats?.totalStudents ?? 0);
  const weeklyLabel = 'Total présent et absence';
  const weeklyDisplayCounts =
    Array.isArray(cards.attendanceDaily) && cards.attendanceDaily.length > 0
      ? cards.attendanceDaily
      : [
          cards.attendancePresentCount ?? 0,
          cards.attendanceAbsentCount ?? 0,
        ];
  const weeklyTotal =
    (cards.attendancePresentCount ?? 0) + (cards.attendanceAbsentCount ?? 0);
  const weeklyDelta = cards.attendanceTotalDelta ?? 0;
  const attendanceLegend = [
    { key: 'present', label: 'Présents', color: '#0018A8' },
    { key: 'absent', label: 'Absents', color: '#c5c9d2' },
  ];

  return (
    <div className="min-h-full w-full bg-white p-4 sm:p-6 lg:p-8 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="mb-6 flex min-w-0 flex-col gap-3">
        <div className="flex min-w-0 items-center justify-between gap-2.5">
          {onOpenSidebar ? (
            <button
              type="button"
              onClick={onOpenSidebar}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-stone-600 transition hover:bg-stone-100 lg:hidden"
              aria-label="Ouvrir le menu de navigation"
            >
              <FiMenu className="h-4 w-4" />
            </button>
          ) : (
            <span className="hidden lg:block" aria-hidden />
          )}
          <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
            <SchoolSwitcher className="hidden max-w-[11rem] sm:flex" />
            {onLogout ? (
              <AccountHeaderControls
                user={
                  user ?? {
                    firstName,
                    lastName,
                    avatar,
                    role: 'ADMIN',
                  }
                }
                role="ADMIN"
                onLogout={onLogout}
                variant="ops"
                onOpenSettings={onOpenSettings}
              />
            ) : null}
          </div>
        </div>
        <nav
          className="flex min-w-0 items-center gap-1 overflow-x-auto rounded-full bg-stone-100/90 p-1"
          aria-label="Navigation du tableau de bord"
        >
          {pillNav.map((item) => {
            const active = item.id === 'dashboard';
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`shrink-0 rounded-full px-3.5 py-2 text-[13px] font-semibold transition ${
                  active
                    ? 'bg-stone-900 text-white shadow-sm'
                    : 'text-stone-500 hover:bg-white hover:text-stone-800'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="mb-5 flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h2 className="font-display text-[1.65rem] font-bold tracking-tight text-stone-900 sm:text-[1.85rem]">
            Bon retour{firstName ? `, ${firstName}` : ''} !{' '}
            <span aria-hidden>☀️</span>
          </h2>
          <label className="mt-2 inline-flex items-center gap-2 text-sm text-stone-500">
            <span>Voie</span>
            <span className="relative">
              <select
                value={sector}
                onChange={(e) => setSector(e.target.value as SectorFilter)}
                className="appearance-none rounded-full border border-stone-200/90 bg-white py-1.5 pl-3 pr-8 text-sm font-semibold text-stone-800 shadow-sm outline-none focus:ring-2 focus:ring-cptb-gold/35"
              >
                <option value="all">Vue d’ensemble</option>
                <option value="GENERAL">{EDUCATION_SECTOR_SHORT_LABELS.GENERAL}</option>
                <option value="TECHNICAL">{EDUCATION_SECTOR_SHORT_LABELS.TECHNICAL}</option>
              </select>
              <FiChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
            </span>
          </label>
        </div>
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative min-w-0 sm:w-56">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Rechercher"
              className="w-full rounded-full border border-stone-200/90 bg-white py-2.5 pl-9 pr-3 text-sm text-stone-800 shadow-sm outline-none placeholder:text-stone-400 focus:ring-2 focus:ring-cptb-gold/35"
            />
          </div>
          <label className="relative inline-flex">
            <span className="sr-only">Période</span>
            <FiCalendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as 'week' | 'month')}
              className="appearance-none rounded-full border border-stone-200/90 bg-white py-2.5 pl-9 pr-9 text-sm font-semibold text-stone-800 shadow-sm outline-none focus:ring-2 focus:ring-cptb-gold/35"
            >
              <option value="week">Hebdo</option>
              <option value="month">Mensuel</option>
            </select>
            <FiChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          </label>
          <button
            type="button"
            onClick={() => onExport?.()}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-cptb-blue px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-cptb-blue-dark"
          >
            <FiDownload className="h-4 w-4" />
            Exporter
          </button>
        </div>
      </div>

      <div className={!schoolReady || statsLoading ? 'animate-pulse opacity-70' : undefined}>
      <OpsVisualKpis
        treatmentTotal={treatmentTotal}
        treatmentDelta={treatmentDelta}
        bubbles={treatmentBubbles}
        satisfactionPct={satisfactionPct}
        satisfactionDelta={satisfactionDelta}
        satisfactionLabel={satisfactionLabel}
        satisfactionLegend={attendanceLegend}
        stackedTotal={stackedTotal}
        stackedDelta={showStudents ? (stats?.activeStudents ?? 0) : showTeachers ? (stats?.totalTeachers ?? 0) : 0}
        stacked={
          stackedItems.length > 0
            ? stackedItems
            : [{ label: stackedLabel, value: stackedTotal, color: '#0018A8' }]
        }
        weeklyCounts={weeklyDisplayCounts}
        weeklyPresent={cards.attendanceDailyPresent}
        weeklyAbsent={cards.attendanceDailyAbsent}
        weeklyHighlight={Math.max(0, weeklyDisplayCounts.length - 1)}
        weeklyDelta={weeklyDelta}
        weeklyTotal={weeklyTotal}
        weeklyLabels={cards.attendanceDailyLabels}
        weeklyLegend={attendanceLegend}
        treatmentLabel={treatmentLabel}
        stackedLabel={stackedLabel}
        weeklyLabel={weeklyLabel}
        onTreatmentMore={() =>
          onNavigate(showAttendance ? 'attendance' : showStudents ? 'students' : 'dashboard')
        }
        onSatisfactionMore={() =>
          onNavigate(showAttendance ? 'attendance' : showStudents ? 'students' : 'dashboard')
        }
        onStackedMore={() => onNavigate(showStudents ? 'students' : showTeachers ? 'teachers' : 'dashboard')}
        onWeeklyMore={() =>
          onNavigate(showAttendance ? 'attendance' : showStudents ? 'students' : 'dashboard')
        }
      />
      </div>

      <OpsModuleBoards
        section="snapshots"
        hasModule={hasModule}
        onNavigate={onNavigate}
        cards={cards}
        stats={stats}
      />

      {showSchedule ? (
      <div className="mt-4 grid grid-cols-1 items-stretch gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
        <section className={`${CARD} min-h-0`}>
          <div className="mb-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e8eefc] text-[#0018A8]">
                <FiCalendar className="h-3.5 w-3.5" aria-hidden />
              </span>
              <h3 className="truncate text-[13px] font-semibold leading-none text-stone-900">
                Programme des professeurs
              </h3>
            </div>
            <div className="hidden items-center gap-3 text-[11px] leading-none text-stone-500 sm:flex">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-cptb-blue" />
                En cours
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-300" />
                À venir
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
                Terminé
              </span>
            </div>
            <button
              type="button"
              onClick={() => onNavigate(showTeachers ? 'teachers' : 'schedule')}
              className="justify-self-end text-[12px] font-medium leading-none text-[#3d6bff] hover:text-[#0018A8]"
            >
              Voir plus
            </button>
          </div>
          <div className="mb-5 flex items-center gap-2">
            <button
              type="button"
              aria-label="Semaine précédente"
              onClick={() => setSelectedDay(addDays(selectedDay, -7))}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-stone-600 ring-1 ring-stone-200 transition hover:bg-stone-50 hover:text-stone-900"
            >
              <FiChevronLeft className="h-4 w-4" aria-hidden />
            </button>
            <div className="flex min-w-0 flex-1 items-center justify-between gap-1">
              {weekDays.map((d) => {
                const active = d.getTime() === selectedDay.getTime();
                const hasSlots = daysWithSlots.has(d.getDay());
                const unavailable = d.getDay() === 0;
                return (
                  <button
                    key={d.toISOString()}
                    type="button"
                    onClick={() => setSelectedDay(d)}
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold tabular-nums transition ${
                      active
                        ? 'bg-cptb-blue text-white shadow-md shadow-cptb-blue/25'
                        : unavailable
                          ? 'text-stone-300 ring-1 ring-stone-200'
                          : hasSlots
                            ? 'text-cptb-blue ring-1 ring-cptb-blue/45 hover:bg-[#e8eefc]'
                            : 'text-stone-600 ring-1 ring-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    {format(d, 'd')}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              aria-label="Semaine suivante"
              onClick={() => setSelectedDay(addDays(selectedDay, 7))}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-stone-600 ring-1 ring-stone-200 transition hover:bg-stone-50 hover:text-stone-900"
            >
              <FiChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
          {teacherProgram.length === 0 ? (
            <p className="py-10 text-center text-sm text-stone-500">
              Aucun professeur au programme pour cette date.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-stone-400">
                    <th className="pb-3 pr-3 font-semibold">Enseignant</th>
                    <th className="pb-3 pr-3 font-semibold">Matière</th>
                    <th className="pb-3 pr-3 font-semibold">Classe</th>
                    <th className="hidden pb-3 pr-3 font-semibold sm:table-cell">Salle</th>
                    <th className="hidden pb-3 pr-3 font-semibold md:table-cell">Statut</th>
                    <th className="pb-3 pr-3 font-semibold">Heure</th>
                    <th className="pb-3 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {teacherProgram.map((row) => {
                    const slot = row.slot;
                    const teacher = row.teacher || slot?.substituteTeacher || slot?.course?.teacher;
                    const teacherRow = teacher?.id ? teacherById.get(teacher.id) : undefined;
                    const phone = teacherRow?.user?.phone || '';
                    const teacherLabel = personName(teacher?.user || teacherRow?.user);
                    const st = slot ? slotStatus(slot, nowMinutes, isToday) : 'idle';
                    const ui = STATUS_UI[st];
                    return (
                      <tr key={row.id} className="align-middle">
                        <td className="py-3 pr-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar
                              src={teacherRow?.user?.avatar}
                              name={teacherLabel}
                              size="sm"
                              className="!h-9 !w-9 !border-0 !shadow-none"
                            />
                            <span>
                              <span className="block font-semibold text-stone-900">{teacherLabel}</span>
                              {slot?.substituteTeacher ? (
                                <span className="block text-[11px] text-amber-600">Remplaçant</span>
                              ) : (
                                <span className="block text-[11px] text-stone-400">
                                  {slot?.course?.name || 'Enseignant'}
                                </span>
                              )}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 pr-3 text-stone-600">{slot?.course?.name || '—'}</td>
                        <td className="py-3 pr-3 text-stone-600">{slot?.class?.name || '—'}</td>
                        <td className="hidden py-3 pr-3 text-stone-500 sm:table-cell">
                          {slot?.room || '—'}
                        </td>
                        <td className="hidden py-3 pr-3 md:table-cell">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${ui.className}`}
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
                            {ui.label}
                          </span>
                        </td>
                        <td className="py-3 pr-3 tabular-nums text-stone-600">
                          {slot ? `${slot.startTime} – ${slot.endTime}` : '—'}
                        </td>
                        <td className="py-3 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            {phone ? (
                              <a
                                href={`tel:${phone}`}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-cptb-blue text-white"
                                aria-label="Appeler l’enseignant"
                              >
                                <FiPhone className="h-3.5 w-3.5" />
                              </a>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onNavigate('teachers')}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-cptb-blue text-white"
                                aria-label="Fiche enseignant"
                              >
                                <FiPhone className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => onNavigate('schedule')}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-stone-400 hover:bg-stone-100"
                              aria-label="Emploi du temps"
                            >
                              <FiMoreVertical className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className={`${CARD} flex min-h-0 flex-col`}>
          <div className="mb-4 flex h-8 items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e8eefc] text-[#0018A8]">
                <FiUserX className="h-3.5 w-3.5" aria-hidden />
              </span>
              <h3 className="truncate text-[13px] font-semibold leading-none text-stone-900">
                Élèves absents
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigate(showAttendance ? 'attendance' : showStudents ? 'students' : 'dashboard')}
              className="shrink-0 text-[12px] font-medium leading-none text-[#3d6bff] hover:text-[#0018A8]"
            >
              Voir plus
            </button>
          </div>
          <p className="mb-3 text-[12px] text-stone-400">
            {format(selectedDay, 'EEEE d MMMM', { locale: fr })}
            <span className="ml-1.5 font-semibold tabular-nums text-stone-500">
              · {absentStudents.length}
            </span>
          </p>
          {absentStudents.length === 0 ? (
            <p className="flex flex-1 items-center justify-center py-8 text-center text-sm text-stone-500">
              Aucun élève absent.
            </p>
          ) : (
            <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
              {absentStudents.map((student) => (
                <li
                  key={student.id}
                  className="flex min-w-0 items-center gap-3 rounded-2xl bg-stone-50/80 p-3 ring-1 ring-stone-100"
                >
                  <Avatar
                    src={student.avatar}
                    name={student.name}
                    size="md"
                    className="!h-10 !w-10 shrink-0 !border-0 !shadow-none"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-stone-900">
                      {student.name}
                    </span>
                    <span className="block truncate text-[12px] text-stone-500">{student.className}</span>
                  </span>
                  <time
                    dateTime={format(student.date, 'yyyy-MM-dd')}
                    className="shrink-0 text-right text-[11px] font-medium leading-snug text-stone-500"
                  >
                    {format(student.date, 'd MMM yyyy', { locale: fr })}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      ) : null}

      {showRequests ? (
        <section className={`${CARD} mt-4`}>
          <div className="mb-4 flex h-8 items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e8eefc] text-[#0018A8]">
                <FiCalendar className="h-3.5 w-3.5" aria-hidden />
              </span>
              <h3 className="truncate text-[13px] font-semibold leading-none text-stone-900">Demandes</h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('admissions')}
              className="shrink-0 text-[12px] font-medium leading-none text-[#3d6bff] hover:text-[#0018A8]"
            >
              Voir plus
            </button>
          </div>
          <div className="space-y-3">
            {requests.length === 0 ? (
              <p className="py-8 text-center text-sm text-stone-500">Aucune demande en attente.</p>
            ) : (
              requests.map((req) => (
                <div
                  key={`${req.kind}-${req.id}`}
                  className="flex items-center gap-3 rounded-2xl bg-stone-50/80 p-3 ring-1 ring-stone-100"
                >
                  <Avatar
                    name={req.name}
                    size="md"
                    className="!h-12 !w-12 shrink-0 !border-0 !shadow-none"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-stone-900">{req.name}</p>
                    <p className="truncate text-[12px] text-stone-500">{req.detail}</p>
                    <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] tabular-nums text-stone-400">
                      <FiClock className="h-3 w-3 shrink-0" aria-hidden />
                      {req.when}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-stone-500 shadow-sm ring-1 ring-stone-200 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                      aria-label="Refuser"
                      disabled={admitMut.isPending}
                      onClick={() => {
                        if (req.kind === 'admission') {
                          admitMut.mutate({ id: req.id, status: 'REJECTED' });
                        } else {
                          openReenrollReview();
                        }
                      }}
                    >
                      <FiX className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-cptb-blue text-white transition hover:bg-cptb-blue-dark disabled:opacity-50"
                      aria-label="Accepter"
                      disabled={admitMut.isPending}
                      onClick={() => {
                        if (req.kind === 'admission') {
                          admitMut.mutate({ id: req.id, status: 'UNDER_REVIEW' });
                        } else {
                          openReenrollReview();
                        }
                      }}
                    >
                      <FiCheck className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      ) : null}

      <OpsModuleBoards
        section="feeds"
        hasModule={hasModule}
        onNavigate={onNavigate}
        cards={cards}
        stats={stats}
      />
    </div>
  );
}
