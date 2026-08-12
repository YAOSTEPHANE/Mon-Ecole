import type { PrismaClient } from '@prisma/client';
import { overlaps } from './timetable-constraints.util';

export type TimetableConflict = {
  kind: 'TEACHER' | 'CLASS' | 'ROOM';
  dayOfWeek: number;
  slotA: { scheduleId: string; label: string; startTime: string; endTime: string; room?: string | null };
  slotB: { scheduleId: string; label: string; startTime: string; endTime: string; room?: string | null };
  detail: string;
};

function slotLabel(
  courseName: string,
  className: string,
  teacherName: string,
  room?: string | null
): string {
  const parts = [courseName, className, teacherName];
  if (room?.trim()) parts.push(`salle ${room.trim()}`);
  return parts.join(' · ');
}

/**
 * Audit global des conflits EDT (enseignant, classe, salle) pour une école ou tout l'établissement.
 */
export async function auditTimetableConflicts(
  prisma: PrismaClient,
  options?: { classIds?: string[] }
): Promise<{ conflicts: TimetableConflict[]; scheduleCount: number }> {
  const schedules = await prisma.schedule.findMany({
    where: options?.classIds?.length ? { classId: { in: options.classIds } } : undefined,
    include: {
      course: {
        select: {
          name: true,
          teacherId: true,
          teacher: { include: { user: { select: { firstName: true, lastName: true } } } },
        },
      },
      class: { select: { id: true, name: true } },
      substituteTeacher: { include: { user: { select: { firstName: true, lastName: true } } } },
    },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
  });

  const conflicts: TimetableConflict[] = [];
  const seen = new Set<string>();

  const teacherName = (s: (typeof schedules)[0]) => {
    const sub = s.substituteTeacher?.user;
    if (sub) return `${sub.firstName} ${sub.lastName}`.trim();
    const u = s.course.teacher.user;
    return `${u.firstName} ${u.lastName}`.trim();
  };

  const effectiveTeacherId = (s: (typeof schedules)[0]) =>
    s.substituteTeacherId?.trim() || s.course.teacherId;

  for (let i = 0; i < schedules.length; i++) {
    for (let j = i + 1; j < schedules.length; j++) {
      const a = schedules[i];
      const b = schedules[j];
      if (a.dayOfWeek !== b.dayOfWeek) continue;
      if (!overlaps(a.startTime, a.endTime, b.startTime, b.endTime)) continue;

      const labelA = slotLabel(a.course.name, a.class.name, teacherName(a), a.room);
      const labelB = slotLabel(b.course.name, b.class.name, teacherName(b), b.room);
      const slotA = {
        scheduleId: a.id,
        label: labelA,
        startTime: a.startTime,
        endTime: a.endTime,
        room: a.room,
      };
      const slotB = {
        scheduleId: b.id,
        label: labelB,
        startTime: b.startTime,
        endTime: b.endTime,
        room: b.room,
      };

      const push = (kind: TimetableConflict['kind'], detail: string) => {
        const key = [kind, a.id, b.id].sort().join(':');
        if (seen.has(key)) return;
        seen.add(key);
        conflicts.push({ kind, dayOfWeek: a.dayOfWeek, slotA, slotB, detail });
      };

      if (effectiveTeacherId(a) === effectiveTeacherId(b)) {
        push('TEACHER', `Enseignant en double sur le même créneau`);
      }
      if (a.classId === b.classId) {
        push('CLASS', `Classe ${a.class.name} en double sur le même créneau`);
      }
      const roomA = a.room?.trim().toUpperCase();
      const roomB = b.room?.trim().toUpperCase();
      if (roomA && roomB && roomA === roomB) {
        push('ROOM', `Salle ${a.room} occupée deux fois`);
      }
    }
  }

  return { conflicts, scheduleCount: schedules.length };
}
