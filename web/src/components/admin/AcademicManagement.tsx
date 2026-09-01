import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import Card from '../ui/Card';
import ClassesList from './ClassesList';
import StudentsList from './StudentsList';
import ScheduleManagement from './ScheduleManagement';
import CoursesProgramManagement from './CoursesProgramManagement';
import SchoolCurriculaByLevelPanel from './SchoolCurriculaByLevelPanel';
import TracksAndOptionsPanel from './TracksAndOptionsPanel';
import SchoolCalendarManagement from './SchoolCalendarManagement';
import { TrimestersEditorStandalone } from './TrimestersEditor';
import {
  FiLayers,
  FiUsers,
  FiCalendar,
  FiBook,
  FiClock,
  FiGrid,
  FiBookOpen,
  FiGitBranch,
} from 'react-icons/fi';
import { ADM } from './adminModuleLayout';

type AcademicTab =
  | 'overview'
  | 'classes'
  | 'enrollment'
  | 'tracks'
  | 'curricula'
  | 'courses'
  | 'schedule'
  | 'school-calendar';

const AcademicManagement: React.FC = () => {
  const [tab, setTab] = useState<AcademicTab>('overview');

  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: adminApi.getClasses,
  });

  const { data: students } = useQuery({
    queryKey: ['students'],
    queryFn: adminApi.getStudents,
  });

  const { data: courses } = useQuery({
    queryKey: ['admin-courses'],
    queryFn: () => adminApi.getAllCourses(),
  });

  const { data: schedules } = useQuery({
    queryKey: ['admin-schedules-overview'],
    queryFn: () => adminApi.getSchedules(),
  });

  const { data: calendarEvents } = useQuery({
    queryKey: ['school-calendar-events', 'overview'],
    queryFn: () => adminApi.getSchoolCalendarEvents(),
  });

  const totalStudents = students?.length ?? 0;
  const assigned = students?.filter((s: any) => s.classId).length ?? 0;
  const unassigned = totalStudents - assigned;

  const subTabs: { id: AcademicTab; label: string; icon: typeof FiLayers }[] = [
    { id: 'overview', label: 'Vue d’ensemble', icon: FiGrid },
    { id: 'classes', label: 'Classes & niveaux', icon: FiLayers },
    { id: 'enrollment', label: 'Élèves & classes', icon: FiUsers },
    { id: 'tracks', label: 'Filières & options', icon: FiGitBranch },
    { id: 'curricula', label: 'Programmes (niveau)', icon: FiBookOpen },
    { id: 'courses', label: 'Matières en classe', icon: FiBook },
    { id: 'schedule', label: 'Emploi du temps', icon: FiClock },
    { id: 'school-calendar', label: 'Calendrier scolaire', icon: FiCalendar },
  ];

  return (
    <div className="space-y-5 text-sm">
      <div>
        <h2 className={ADM.h2}>Gestion académique</h2>
        <p className={ADM.intro}>
          Structure pédagogique : classes, affectation des élèves, matières, emplois du temps et
          calendrier de l’établissement.
        </p>
      </div>

      <div className={ADM.tabRow}>
        {subTabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={ADM.tabBtn(active, 'bg-indigo-50 text-indigo-800 ring-1 ring-indigo-200')}
            >
              <Icon className={ADM.tabIcon} />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            <Card className="p-2.5 sm:p-3 border border-gray-200">
              <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide leading-tight">
                Classes
              </p>
              <p className="text-lg font-bold text-gray-900 mt-0.5 tabular-nums leading-none">
                {classes?.length ?? '—'}
              </p>
              <p className="text-[11px] text-gray-500 mt-1 leading-snug">Groupes et niveaux</p>
            </Card>
            <Card className="p-2.5 sm:p-3 border border-gray-200">
              <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide leading-tight">
                Élèves affectés
              </p>
              <p className="text-lg font-bold text-gray-900 mt-0.5 tabular-nums leading-none">{assigned}</p>
              <p className="text-[11px] text-amber-600 mt-1 leading-snug">
                {unassigned > 0 ? `${unassigned} sans classe` : 'Tous affectés'}
              </p>
            </Card>
            <Card className="p-2.5 sm:p-3 border border-gray-200">
              <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide leading-tight">
                Matières
              </p>
              <p className="text-lg font-bold text-gray-900 mt-0.5 tabular-nums leading-none">
                {courses?.length ?? '—'}
              </p>
              <p className="text-[11px] text-gray-500 mt-1 leading-snug">Cours par classe</p>
            </Card>
            <Card className="p-2.5 sm:p-3 border border-gray-200">
              <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide leading-tight">
                Créneaux EDT
              </p>
              <p className="text-lg font-bold text-gray-900 mt-0.5 tabular-nums leading-none">
                {schedules?.length ?? '—'}
              </p>
              <p className="text-[11px] text-gray-500 mt-1 leading-snug">
                Calendrier : {calendarEvents?.length ?? 0} évén.
              </p>
            </Card>
          </div>

          <TrimestersEditorStandalone compact />

          <Card className="p-4 border border-indigo-100 bg-indigo-50/40">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Par où commencer ?</h3>
            <ol className="list-decimal list-inside text-xs text-gray-700 space-y-1.5 leading-relaxed">
              <li>
                Créez les <strong>classes</strong> (nom, niveau, année scolaire, capacité).
              </li>
              <li>
                <strong>Affectez les élèves</strong> à une classe depuis la fiche élève ou l’onglet
                « Élèves & classes ».
              </li>
              <li>
                Configurez les <strong>filières et options</strong>, puis le <strong>programme par niveau</strong>{' '}
                (référentiel matières / heures), et les <strong>matières en classe</strong> avec enseignant et
                code d’emploi du temps.
              </li>
              <li>
                Construisez l’<strong>emploi du temps</strong> à partir des matières créées.
              </li>
              <li>
                Renseignez le <strong>calendrier scolaire</strong> (vacances, examens, jours fériés).
              </li>
            </ol>
          </Card>
        </div>
      )}

      {tab === 'classes' && <ClassesList compact />}
      {tab === 'enrollment' && <StudentsList showClassFilter compact />}
      {tab === 'tracks' && <TracksAndOptionsPanel compact />}
      {tab === 'curricula' && <SchoolCurriculaByLevelPanel compact />}
      {tab === 'courses' && <CoursesProgramManagement compact />}
      {tab === 'schedule' && <ScheduleManagement compact />}
      {tab === 'school-calendar' && <SchoolCalendarManagement compact />}
    </div>
  );
};

export default AcademicManagement;
