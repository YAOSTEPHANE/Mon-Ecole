import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { teacherApi } from '../../services/api';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import { FiBook, FiUsers, FiClipboard, FiTrendingUp, FiFileText, FiAlertCircle, FiCheckSquare, FiEdit3, FiBookOpen, FiCalendar } from 'react-icons/fi';
import Button from '../ui/Button';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import {
  CHART_GRID,
  CHART_MARGIN_COMPACT,
  CHART_ANIMATION_MS,
  CHART_AXIS_TICK,
  RechartsViewport,
  PremiumChartCard,
} from '../charts';
import {
  PremiumOverviewHero,
  PremiumStatGrid,
  PremiumSectionTitle,
} from '../dashboard/premium';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const TeacherOverview = () => {
  const { data: courses, isLoading: coursesLoading } = useQuery({
    queryKey: ['teacher-courses-lean'],
    queryFn: () => teacherApi.getCourses({ lean: true }),
  });

  const { data: assignmentsSummary } = useQuery({
    queryKey: ['teacher-upcoming-assignments'],
    queryFn: () => teacherApi.getUpcomingAssignments(5),
    staleTime: 60_000,
  });

  const { data: teachKpi } = useQuery({
    queryKey: ['teacher-dashboard-kpis'],
    queryFn: () => teacherApi.getDashboardKpis(),
    staleTime: 60_000,
  });

  const { data: scheduleData } = useQuery({
    queryKey: ['teacher-schedule-today'],
    queryFn: () => teacherApi.getSchedule(),
    staleTime: 60_000,
  });

  const todaySlots = useMemo(() => {
    const slots = (scheduleData as { slots?: Array<{
      id?: string;
      dayOfWeek?: number;
      startTime?: string;
      endTime?: string;
      courseName?: string;
      className?: string;
      room?: string | null;
    }> })?.slots;
    if (!Array.isArray(slots)) return [];
    const dow = new Date().getDay();
    return slots
      .filter((s) => s.dayOfWeek === dow)
      .sort((a, b) => String(a.startTime || '').localeCompare(String(b.startTime || '')));
  }, [scheduleData]);

  // Calculate unique students across all courses
  const uniqueStudents = useMemo(() => {
    if (!courses) return new Set();
    const students = new Set();
    courses.forEach((course: any) => {
      course.class?.students?.forEach((student: any) => {
        students.add(student.id);
      });
    });
    return students;
  }, [courses]);

  const totalStudents = uniqueStudents.size;
  const totalGrades = courses?.reduce((sum: number, course: any) => {
    return sum + (course._count?.grades || 0);
  }, 0) || 0;

  const totalAbsences = courses?.reduce((sum: number, course: any) => {
    return sum + (course._count?.absences || 0);
  }, 0) || 0;

  const totalAssignments = assignmentsSummary?.total ?? 0;
  const upcomingAssignments = assignmentsSummary?.upcoming ?? [];

  if (coursesLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <div className="h-24 bg-gray-200 rounded"></div>
          </Card>
        ))}
      </div>
    );
  }

  const stats = [
    { label: 'Mes cours', value: courses?.length || 0, subtitle: 'Cours actifs', icon: FiBook, accent: 'indigo' as const },
    { label: 'Élèves', value: totalStudents, subtitle: 'Total élèves', icon: FiUsers, accent: 'emerald' as const },
    { label: 'Notes', value: totalGrades, subtitle: 'Notes saisies', icon: FiClipboard, accent: 'violet' as const },
    { label: 'Devoirs', value: totalAssignments, subtitle: 'Devoirs créés', icon: FiFileText, accent: 'amber' as const },
  ];

  return (
    <div className="space-y-5 sm:space-y-6">
      <PremiumOverviewHero
        eyebrow="Pilotage pédagogique"
        title={format(new Date(), 'EEEE d MMMM yyyy', { locale: fr })}
        gradient="from-emerald-600 via-teal-600 to-cyan-700"
        description="Agrégation de vos cours, effectifs suivis et charge documentaire."
      />

      <section className="dash-section-panel">
        <PremiumSectionTitle
          title="Ma journée"
          subtitle="Enchaînement recommandé : emploi du temps → appel → notes → cahier → devoirs"
          icon={FiCalendar}
        />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {(
            [
              { id: 'schedule', label: 'Emploi du temps', icon: FiCalendar, color: 'from-orange-500 to-amber-600' },
              { id: 'attendance', label: 'Faire l’appel', icon: FiCheckSquare, color: 'from-teal-500 to-cyan-600' },
              { id: 'grades', label: 'Saisir notes', icon: FiEdit3, color: 'from-violet-500 to-fuchsia-600' },
              { id: 'lesson-logs', label: 'Cahier de texte', icon: FiBookOpen, color: 'from-amber-600 to-orange-700' },
              { id: 'assignments', label: 'Devoirs', icon: FiFileText, color: 'from-blue-500 to-indigo-600' },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.id}
                type="button"
                variant="secondary"
                className="flex h-auto flex-col items-start gap-2 rounded-2xl border border-stone-200/80 bg-white p-3 text-left shadow-sm hover:border-amber-300/60"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('navigate-tab', { detail: item.id }));
                }}
              >
                <span
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${item.color} text-white`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="text-xs font-semibold text-stone-800">{item.label}</span>
              </Button>
            );
          })}
        </div>
        {todaySlots.length > 0 ? (
          <div className="mt-3 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wide text-stone-500">
              Cours aujourd’hui ({todaySlots.length})
            </p>
            {todaySlots.map((slot, idx) => (
              <div
                key={slot.id || `${slot.startTime}-${idx}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-stone-900">
                    {slot.courseName || 'Cours'}
                    {slot.className ? (
                      <span className="ml-2 font-normal text-stone-500">{slot.className}</span>
                    ) : null}
                  </p>
                  <p className="text-xs text-stone-600">
                    {slot.startTime}–{slot.endTime}
                    {slot.room ? ` · ${slot.room}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      window.dispatchEvent(new CustomEvent('navigate-tab', { detail: 'attendance' }))
                    }
                  >
                    Appel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      window.dispatchEvent(new CustomEvent('navigate-tab', { detail: 'lesson-logs' }))
                    }
                  >
                    Cahier
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      window.dispatchEvent(new CustomEvent('navigate-tab', { detail: 'grades' }))
                    }
                  >
                    Notes
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-xs text-stone-500">Aucun créneau planifié aujourd’hui.</p>
        )}
      </section>

      <section className="dash-section-panel">
        <PremiumSectionTitle title="Indicateurs clés" subtitle="Synthèse de votre activité" icon={FiBook} />
        <PremiumStatGrid items={stats} columns={4} />
      </section>

      {teachKpi?.charts?.gradesByMonth && teachKpi.charts.gradesByMonth.length > 0 && (
        <section className="dash-section-panel">
        <PremiumChartCard
          title="KPI & tendance des notes (90 j.)"
          subtitle={`Moyenne sur 20 · ${teachKpi.cards?.gradesRecorded90d ?? 0} note(s) · RDV parents : ${teachKpi.cards?.pendingParentAppointments ?? 0}`}
          icon={FiTrendingUp}
          accent="emerald"
          height={224}
          badge={
            teachKpi.cards?.averageGradeOn20Last90d != null ? (
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase text-stone-500">Moyenne période</p>
                <p className="text-xl font-bold text-teal-800">{teachKpi.cards.averageGradeOn20Last90d} / 20</p>
              </div>
            ) : undefined
          }
        >
          <RechartsViewport height={200} className="w-full">
            <LineChart data={teachKpi.charts.gradesByMonth} margin={{ ...CHART_MARGIN_COMPACT, top: 8 }}>
              <CartesianGrid {...CHART_GRID} />
              <XAxis dataKey="label" tick={CHART_AXIS_TICK} />
              <YAxis domain={[0, 20]} width={28} tick={CHART_AXIS_TICK} />
              <Tooltip formatter={(v) => [`${v} / 20`, 'Moyenne']} />
              <Line type="monotone" dataKey="average20" stroke="#0d9488" strokeWidth={2.5} dot={{ r: 4 }} connectNulls isAnimationActive animationDuration={CHART_ANIMATION_MS} />
            </LineChart>
          </RechartsViewport>
        </PremiumChartCard>
        </section>
      )}

      {upcomingAssignments.length > 0 && (
        <section className="dash-section-panel">
        <PremiumSectionTitle title="Devoirs à venir" subtitle="Échéances proches" icon={FiFileText} />
        <div className="space-y-3">
            {upcomingAssignments.map((assignment: any) => {
              const dueDate = new Date(assignment.dueDate);
              const now = new Date();
              const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              const isToday = daysUntilDue === 0;
              const isTomorrow = daysUntilDue === 1;
              
              return (
                <div
                  key={assignment.id}
                  className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200"
                >
                  <div className="flex items-center space-x-3">
                    <FiFileText className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-gray-900">{assignment.title}</p>
                      <p className="text-sm text-gray-600">
                        {assignment.course?.name} - {assignment.course?.class?.name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge
                      variant={isToday ? 'danger' : isTomorrow ? 'warning' : 'secondary'}
                      size="sm"
                    >
                      {isToday ? 'Aujourd\'hui' : isTomorrow ? 'Demain' : `Dans ${daysUntilDue} jours`}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {format(dueDate, 'dd MMM', { locale: fr })}
                    </span>
                  </div>
                </div>
              );
            })}
        </div>
        </section>
      )}

      {totalAbsences > 0 && (
        <section className="dash-section-panel border-l-4 border-l-orange-500">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
              <FiAlertCircle className="w-6 h-6 text-orange-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-2">Absences enregistrées</h3>
              <p className="text-sm text-gray-700">
                Vous avez enregistré {totalAbsences} absence(s) au total. 
                Pensez à vérifier les justifications des élèves.
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default TeacherOverview;




