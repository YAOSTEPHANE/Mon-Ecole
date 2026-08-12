'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { adminApi } from '@/services/api';
import { getCurrentAcademicYear } from '@/utils/academicYear';
import { ADM } from './adminModuleLayout';

type OpTab =
  | 'timetable'
  | 'canteen-menu'
  | 'canteen-checkin'
  | 'transport-checkin'
  | 'billing'
  | 'exams'
  | 'absences'
  | 'lesson-logs';

const DAY_LABELS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

export default function SchoolOperationsHub() {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const year = getCurrentAcademicYear();
  const [tab, setTab] = useState<OpTab>('timetable');
  const [menuDate, setMenuDate] = useState(today);
  const [menuForm, setMenuForm] = useState({
    mainCourse: '',
    sideDish: '',
    dessert: '',
    notes: '',
  });
  const [checkInStudentId, setCheckInStudentId] = useState('');
  const [transportRouteId, setTransportRouteId] = useState('');
  const [transportStudentId, setTransportStudentId] = useState('');
  const [examForm, setExamForm] = useState({
    title: '',
    examKind: 'BEPC',
    subject: '',
    academicYear: year,
    examDate: today,
    startTime: '08:00',
    endTime: '11:00',
    room: '',
  });

  const { data: students = [] } = useQuery({
    queryKey: ['admin-students-ops'],
    queryFn: () => adminApi.getStudents(),
  });
  const { data: routes = [] } = useQuery({
    queryKey: ['admin-transport-routes-ops'],
    queryFn: () => adminApi.getTransportRoutes(),
  });

  const { data: audit, isLoading: auditLoading, refetch: refetchAudit } = useQuery({
    queryKey: ['admin-timetable-audit'],
    queryFn: () => adminApi.auditTimetableConflicts(),
    enabled: tab === 'timetable',
  });

  const { data: menus = [], refetch: refetchMenus } = useQuery({
    queryKey: ['admin-canteen-menus', menuDate],
    queryFn: () => adminApi.getCanteenDailyMenus({ menuDate }),
    enabled: tab === 'canteen-menu',
  });

  const { data: mealCheckIns = [], refetch: refetchMeals } = useQuery({
    queryKey: ['admin-canteen-checkins', menuDate],
    queryFn: () => adminApi.getCanteenMealCheckIns(menuDate),
    enabled: tab === 'canteen-checkin',
  });

  const { data: transportCheckIns = [], refetch: refetchTransport } = useQuery({
    queryKey: ['admin-transport-checkins', transportRouteId, today],
    queryFn: () =>
      adminApi.getTransportCheckIns({
        routeId: transportRouteId || undefined,
        date: today,
      }),
    enabled: tab === 'transport-checkin',
  });

  const { data: exams = [], refetch: refetchExams } = useQuery({
    queryKey: ['admin-physical-exams', year],
    queryFn: () => adminApi.getPhysicalExamSessions({ academicYear: year }),
    enabled: tab === 'exams',
  });

  const { data: lessonLogs = [] } = useQuery({
    queryKey: ['admin-lesson-logs'],
    queryFn: () => adminApi.getAdminLessonLogs(),
    enabled: tab === 'lesson-logs',
  });

  const createMenu = useMutation({
    mutationFn: () =>
      adminApi.createCanteenDailyMenu({
        menuDate,
        ...menuForm,
      }),
    onSuccess: () => {
      toast.success('Menu enregistré');
      setMenuForm({ mainCourse: '', sideDish: '', dessert: '', notes: '' });
      void refetchMenus();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mealCheckIn = useMutation({
    mutationFn: () =>
      adminApi.postCanteenMealCheckIn({ studentId: checkInStudentId, menuDate }),
    onSuccess: () => {
      toast.success('Repas pointé');
      setCheckInStudentId('');
      void refetchMeals();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const transportCheckIn = useMutation({
    mutationFn: () =>
      adminApi.postTransportCheckIn({
        routeId: transportRouteId,
        studentId: transportStudentId,
        checkInType: 'BOARD',
      }),
    onSuccess: () => {
      toast.success('Montée bus enregistrée');
      setTransportStudentId('');
      void refetchTransport();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const billCampus = useMutation({
    mutationFn: () => adminApi.billCampusSubscriptions({ academicYear: year }),
    onSuccess: (r: {
      canteen: { created: number; skipped: number };
      transport: { created: number; skipped: number };
    }) => {
      toast.success(
        `Facturation : ${r.canteen.created + r.transport.created} ligne(s) créée(s)`
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const absenceReminders = useMutation({
    mutationFn: () => adminApi.runAbsenceReminders(),
    onSuccess: (r: { remindersSent: number }) =>
      toast.success(`${r.remindersSent} relance(s) envoyée(s)`),
    onError: (e: Error) => toast.error(e.message),
  });

  const createExam = useMutation({
    mutationFn: () => adminApi.createPhysicalExamSession({ ...examForm, isPublished: true }),
    onSuccess: () => {
      toast.success('Session d\'examen créée');
      void refetchExams();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const tabs: { id: OpTab; label: string }[] = useMemo(
    () => [
      { id: 'timetable', label: 'Conflits EDT' },
      { id: 'canteen-menu', label: 'Menus cantine' },
      { id: 'canteen-checkin', label: 'Pointage repas' },
      { id: 'transport-checkin', label: 'Check-in bus' },
      { id: 'billing', label: 'Facturation campus' },
      { id: 'exams', label: 'Examens physiques' },
      { id: 'absences', label: 'Relances absences' },
      { id: 'lesson-logs', label: 'Cahier de texte' },
    ],
    []
  );

  return (
    <div className={`${ADM.root} space-y-4`}>
      <div>
        <h2 className="text-lg font-semibold text-stone-900">Opérations scolaires</h2>
        <p className="text-sm text-stone-500">
          Cantine, transport, examens, EDT, relances et cahier de texte — modules opérationnels.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              tab === t.id
                ? 'bg-orange-600 text-white'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'timetable' && (
        <Card className="p-4 space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-sm text-stone-600">
              {auditLoading
                ? 'Analyse…'
                : `${audit?.scheduleCount ?? 0} créneau(x) — ${audit?.conflicts?.length ?? 0} conflit(s)`}
            </p>
            <Button size="sm" onClick={() => void refetchAudit()}>
              Actualiser
            </Button>
          </div>
          {(audit?.conflicts ?? []).length === 0 ? (
            <p className="text-sm text-emerald-700">Aucun conflit détecté.</p>
          ) : (
            <ul className="space-y-2 max-h-96 overflow-y-auto">
              {(audit?.conflicts ?? []).map((c, i) => (
                <li key={i} className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
                  <p className="font-medium">
                    {DAY_LABELS[c.dayOfWeek] ?? c.dayOfWeek} — {c.kind} — {c.detail}
                  </p>
                  <p className="text-stone-600 mt-1">{c.slotA.label} ↔ {c.slotB.label}</p>
                  <p className="text-xs text-stone-500">
                    {c.slotA.startTime}–{c.slotA.endTime} / {c.slotB.startTime}–{c.slotB.endTime}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {tab === 'canteen-menu' && (
        <Card className="p-4 space-y-3">
          <Input type="date" value={menuDate} onChange={(e) => setMenuDate(e.target.value)} label="Date" />
          <Input
            placeholder="Plat principal *"
            value={menuForm.mainCourse}
            onChange={(e) => setMenuForm((f) => ({ ...f, mainCourse: e.target.value }))}
          />
          <Input
            placeholder="Accompagnement"
            value={menuForm.sideDish}
            onChange={(e) => setMenuForm((f) => ({ ...f, sideDish: e.target.value }))}
          />
          <Input
            placeholder="Dessert"
            value={menuForm.dessert}
            onChange={(e) => setMenuForm((f) => ({ ...f, dessert: e.target.value }))}
          />
          <Button
            onClick={() => createMenu.mutate()}
            disabled={!menuForm.mainCourse.trim() || createMenu.isPending}
          >
            Enregistrer le menu
          </Button>
          <ul className="divide-y text-sm">
            {(menus as Array<{ id: string; mainCourse: string; sideDish?: string; dessert?: string }>).map(
              (m) => (
                <li key={m.id} className="py-2 flex justify-between gap-2">
                  <span>
                    <strong>{m.mainCourse}</strong>
                    {m.sideDish ? ` · ${m.sideDish}` : ''}
                    {m.dessert ? ` · ${m.dessert}` : ''}
                  </span>
                  <button
                    type="button"
                    className="text-red-600 text-xs"
                    onClick={() =>
                      adminApi.deleteCanteenDailyMenu(m.id).then(() => refetchMenus())
                    }
                  >
                    Suppr.
                  </button>
                </li>
              )
            )}
          </ul>
        </Card>
      )}

      {tab === 'canteen-checkin' && (
        <Card className="p-4 space-y-3">
          <Input type="date" value={menuDate} onChange={(e) => setMenuDate(e.target.value)} label="Date" />
          <select
            className="w-full rounded-lg border px-3 py-2 text-sm"
            value={checkInStudentId}
            onChange={(e) => setCheckInStudentId(e.target.value)}
            aria-label="Élève"
          >
            <option value="">Choisir un élève</option>
            {(students as Array<{ id: string; user?: { firstName: string; lastName: string } }>).map(
              (s) => (
                <option key={s.id} value={s.id}>
                  {s.user?.firstName} {s.user?.lastName}
                </option>
              )
            )}
          </select>
          <Button
            onClick={() => mealCheckIn.mutate()}
            disabled={!checkInStudentId || mealCheckIn.isPending}
          >
            Pointer le repas
          </Button>
          <p className="text-sm text-stone-500">{mealCheckIns.length} pointage(s) ce jour</p>
        </Card>
      )}

      {tab === 'transport-checkin' && (
        <Card className="p-4 space-y-3">
          <select
            className="w-full rounded-lg border px-3 py-2 text-sm"
            value={transportRouteId}
            onChange={(e) => setTransportRouteId(e.target.value)}
            aria-label="Ligne"
          >
            <option value="">Choisir une ligne</option>
            {(routes as Array<{ id: string; name: string }>).map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <select
            className="w-full rounded-lg border px-3 py-2 text-sm"
            value={transportStudentId}
            onChange={(e) => setTransportStudentId(e.target.value)}
            aria-label="Élève"
          >
            <option value="">Choisir un élève</option>
            {(students as Array<{ id: string; user?: { firstName: string; lastName: string } }>).map(
              (s) => (
                <option key={s.id} value={s.id}>
                  {s.user?.firstName} {s.user?.lastName}
                </option>
              )
            )}
          </select>
          <Button
            onClick={() => transportCheckIn.mutate()}
            disabled={!transportRouteId || !transportStudentId || transportCheckIn.isPending}
          >
            Enregistrer montée bus
          </Button>
          <p className="text-sm text-stone-500">{transportCheckIns.length} check-in(s) aujourd&apos;hui</p>
        </Card>
      )}

      {tab === 'billing' && (
        <Card className="p-4 space-y-3">
          <p className="text-sm text-stone-600">
            Crée des lignes de frais scolarité (cantine + transport) pour les abonnements actifs de l&apos;année{' '}
            <strong>{year}</strong>. Les doublons sont ignorés.
          </p>
          <Button onClick={() => billCampus.mutate()} disabled={billCampus.isPending}>
            Lancer la facturation campus
          </Button>
        </Card>
      )}

      {tab === 'exams' && (
        <Card className="p-4 space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              placeholder="Titre *"
              value={examForm.title}
              onChange={(e) => setExamForm((f) => ({ ...f, title: e.target.value }))}
            />
            <select
              className="rounded-lg border px-3 py-2 text-sm"
              value={examForm.examKind}
              onChange={(e) => setExamForm((f) => ({ ...f, examKind: e.target.value }))}
              aria-label="Type d'examen"
            >
              <option value="BEPC">BEPC</option>
              <option value="BAC">BAC</option>
              <option value="CONTROLE">Contrôle</option>
              <option value="AUTRE">Autre</option>
            </select>
            <Input
              type="date"
              value={examForm.examDate}
              onChange={(e) => setExamForm((f) => ({ ...f, examDate: e.target.value }))}
            />
            <Input
              placeholder="Matière"
              value={examForm.subject}
              onChange={(e) => setExamForm((f) => ({ ...f, subject: e.target.value }))}
            />
            <Input
              placeholder="Heure début"
              value={examForm.startTime}
              onChange={(e) => setExamForm((f) => ({ ...f, startTime: e.target.value }))}
            />
            <Input
              placeholder="Heure fin"
              value={examForm.endTime}
              onChange={(e) => setExamForm((f) => ({ ...f, endTime: e.target.value }))}
            />
            <Input
              placeholder="Salle"
              value={examForm.room}
              onChange={(e) => setExamForm((f) => ({ ...f, room: e.target.value }))}
            />
          </div>
          <Button
            onClick={() => createExam.mutate()}
            disabled={!examForm.title.trim() || createExam.isPending}
          >
            Planifier l&apos;examen
          </Button>
          <ul className="space-y-2 text-sm max-h-64 overflow-y-auto">
            {(exams as Array<{
              id: string;
              title: string;
              examKind: string;
              examDate: string;
              startTime: string;
              endTime: string;
              room?: string;
            }>).map((ex) => (
              <li key={ex.id} className="rounded-lg border p-2">
                <strong>{ex.title}</strong> ({ex.examKind}) —{' '}
                {format(new Date(ex.examDate), 'PPP', { locale: fr })} {ex.startTime}–{ex.endTime}
                {ex.room ? ` · ${ex.room}` : ''}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {tab === 'absences' && (
        <Card className="p-4 space-y-3">
          <p className="text-sm text-stone-600">
            Relance les parents pour les absences non justifiées du jour (notification, e-mail, SMS, WhatsApp).
            Le job automatique s&apos;active avec{' '}
            <code className="text-xs bg-stone-100 px-1">ENABLE_SCHEDULED_ABSENCE_REMINDERS=true</code>.
          </p>
          <Button onClick={() => absenceReminders.mutate()} disabled={absenceReminders.isPending}>
            Lancer les relances maintenant
          </Button>
        </Card>
      )}

      {tab === 'lesson-logs' && (
        <Card className="p-4">
          {(lessonLogs as Array<{
            id: string;
            lessonDate: string;
            title?: string;
            content: string;
            classId: string;
          }>).length === 0 ? (
            <p className="text-sm text-stone-500">Aucune séance enregistrée par les enseignants.</p>
          ) : (
            <ul className="space-y-2 text-sm max-h-96 overflow-y-auto">
              {(lessonLogs as Array<{
                id: string;
                lessonDate: string;
                title?: string;
                content: string;
              }>).map((log) => (
                <li key={log.id} className="rounded-lg border p-3">
                  <p className="font-medium">
                    {format(new Date(log.lessonDate), 'PPP', { locale: fr })}
                    {log.title ? ` — ${log.title}` : ''}
                  </p>
                  <p className="text-stone-600 mt-1 line-clamp-3">{log.content}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}
