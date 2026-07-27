import prisma from './prisma';

/** Parse "HH:MM" sur la date civile locale du serveur. */
export function parseTimeOnDate(hhmm: string, base: Date): Date {
  const [h, m] = hhmm.split(':').map((x) => parseInt(x, 10));
  const d = new Date(base);
  d.setHours(Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0, 0, 0);
  return d;
}

export function toAttendanceDateKey(input: Date): string {
  const d = new Date(input);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function durationMinutesFromHHMM(start: string, end: string): number {
  const [sh, sm] = start.split(':').map((x) => parseInt(x, 10));
  const [eh, em] = end.split(':').map((x) => parseInt(x, 10));
  if (![sh, sm, eh, em].every(Number.isFinite)) return 0;
  return Math.max(0, eh * 60 + em - (sh * 60 + sm));
}

export type ScheduleSlotRow = {
  id: string;
  classId: string;
  courseId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room: string | null;
  course: { id: string; name: string; code: string; teacherId: string };
};

function isWithinSlotWindow(
  at: Date,
  startTime: string,
  endTime: string,
  earlyCheckInMinutes: number,
): boolean {
  const start = parseTimeOnDate(startTime, at);
  const end = parseTimeOnDate(endTime, at);
  const windowStart = new Date(start.getTime() - earlyCheckInMinutes * 60_000);
  return at.getTime() >= windowStart.getTime() && at.getTime() <= end.getTime();
}

export async function findActiveScheduleSlotForCourse(
  courseId: string,
  at: Date,
  earlyCheckInMinutes = 20,
): Promise<ScheduleSlotRow | null> {
  const dayOfWeek = at.getDay();
  const slots = await prisma.schedule.findMany({
    where: { courseId, dayOfWeek },
    include: {
      course: { select: { id: true, name: true, code: true, teacherId: true } },
    },
  });
  const active = slots.filter((s) =>
    isWithinSlotWindow(at, s.startTime, s.endTime, earlyCheckInMinutes),
  );
  if (active.length === 0) return null;
  active.sort((a, b) => a.startTime.localeCompare(b.startTime));
  return active[0] as ScheduleSlotRow;
}

export async function findActiveScheduleSlotForTeacher(
  teacherId: string,
  at: Date,
  courseId?: string,
  earlyCheckInMinutes = 20,
): Promise<ScheduleSlotRow | null> {
  const dayOfWeek = at.getDay();
  const slots = await prisma.schedule.findMany({
    where: {
      dayOfWeek,
      OR: [{ course: { teacherId } }, { substituteTeacherId: teacherId }],
      ...(courseId ? { courseId } : {}),
    },
    include: {
      course: { select: { id: true, name: true, code: true, teacherId: true } },
    },
  });
  const active = slots.filter((s) =>
    isWithinSlotWindow(at, s.startTime, s.endTime, earlyCheckInMinutes),
  );
  if (active.length === 0) return null;
  active.sort((a, b) => a.startTime.localeCompare(b.startTime));
  return active[0] as ScheduleSlotRow;
}

export function scheduledCheckOutAt(at: Date, endTime: string): Date {
  return parseTimeOnDate(endTime, at);
}

/** Minutes effectivement décomptées : du 1er pointage jusqu'à la fin du créneau (emploi du temps). */
export function computeTeacherTeachingMinutes(checkInAt: Date, checkOutAt: Date): number {
  return Math.max(0, Math.round((checkOutAt.getTime() - checkInAt.getTime()) / 60_000));
}

/** Fenêtre de sortie après la fin EDT (minutes). */
export function checkoutGraceMinutes(): number {
  const n = parseInt(process.env.ATTENDANCE_CHECKOUT_GRACE_MINUTES || '30', 10);
  return Number.isFinite(n) ? Math.max(0, n) : 30;
}

export function isWithinCheckoutWindow(
  at: Date,
  startTime: string,
  endTime: string,
  earlyCheckInMinutes: number,
): boolean {
  const start = parseTimeOnDate(startTime, at);
  const end = parseTimeOnDate(endTime, at);
  const windowStart = new Date(start.getTime() - earlyCheckInMinutes * 60_000);
  const windowEnd = new Date(end.getTime() + checkoutGraceMinutes() * 60_000);
  return at.getTime() >= windowStart.getTime() && at.getTime() <= windowEnd.getTime();
}

export function resolveLateStatus(
  at: Date,
  startTime: string,
  graceMinutes: number,
): 'PRESENT' | 'LATE' {
  const start = parseTimeOnDate(startTime, at);
  const graceEnd = new Date(start.getTime() + graceMinutes * 60_000);
  return at.getTime() > graceEnd.getTime() ? 'LATE' : 'PRESENT';
}
