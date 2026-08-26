/**
 * Export iCalendar (ICS) des créneaux hebdomadaires d’emploi du temps.
 */
import type { ScheduleWithRelations } from './safe-schedule-query.util';

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Escape ICS TEXT (RFC 5545). */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

function parseHm(hm: string): { h: number; m: number } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min) || h > 23 || min > 59) return null;
  return { h, m: min };
}

/** Prochaine occurrence de dayOfWeek (0=dim … 6=sam) à partir de `from` (inclus). */
function nextDateForDow(from: Date, dayOfWeek: number): Date {
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  const current = d.getDay();
  const delta = (dayOfWeek - current + 7) % 7;
  d.setDate(d.getDate() + delta);
  return d;
}

function formatIcsLocal(dt: Date): string {
  return (
    `${dt.getFullYear()}${pad2(dt.getMonth() + 1)}${pad2(dt.getDate())}` +
    `T${pad2(dt.getHours())}${pad2(dt.getMinutes())}${pad2(dt.getSeconds())}`
  );
}

function formatIcsUtcStamp(dt: Date): string {
  return (
    `${dt.getUTCFullYear()}${pad2(dt.getUTCMonth() + 1)}${pad2(dt.getUTCDate())}` +
    `T${pad2(dt.getUTCHours())}${pad2(dt.getUTCMinutes())}${pad2(dt.getUTCSeconds())}Z`
  );
}

export type IcsScheduleOptions = {
  weeks?: number;
  calendarName?: string;
  from?: Date;
};

/**
 * Génère un calendrier ICS à partir de créneaux hebdomadaires (répétition COUNT = weeks).
 */
export function buildScheduleIcs(
  schedules: ScheduleWithRelations[],
  options: IcsScheduleOptions = {},
): string {
  const weeks = Math.min(52, Math.max(1, options.weeks ?? 16));
  const from = options.from ?? new Date();
  const calName = escapeIcsText(options.calendarName ?? 'Emploi du temps');
  const nowStamp = formatIcsUtcStamp(new Date());

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Ecole a jour//Emploi du temps//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${calName}`,
  ];

  for (const slot of schedules) {
    const startHm = parseHm(slot.startTime);
    const endHm = parseHm(slot.endTime);
    if (!startHm || !endHm) continue;
    if (slot.dayOfWeek < 0 || slot.dayOfWeek > 6) continue;

    const firstDay = nextDateForDow(from, slot.dayOfWeek);
    const start = new Date(firstDay);
    start.setHours(startHm.h, startHm.m, 0, 0);
    const end = new Date(firstDay);
    end.setHours(endHm.h, endHm.m, 0, 0);
    if (end <= start) {
      end.setDate(end.getDate() + 1);
    }

    const teacher =
      slot.substituteTeacher?.user ??
      slot.course.teacher?.user ??
      null;
    const teacherName = teacher
      ? `${teacher.firstName} ${teacher.lastName}`.trim()
      : '';
    const summary = escapeIcsText(
      `${slot.course.name}${slot.class?.name ? ` — ${slot.class.name}` : ''}`,
    );
    const location = escapeIcsText(slot.room?.trim() || 'Salle non précisée');
    const description = escapeIcsText(
      [
        `Cours : ${slot.course.name} (${slot.course.code})`,
        slot.class?.name ? `Classe : ${slot.class.name}` : null,
        teacherName ? `Enseignant : ${teacherName}` : null,
        slot.replacementNote ? `Note : ${slot.replacementNote}` : null,
      ]
        .filter(Boolean)
        .join('\n'),
    );

    lines.push(
      'BEGIN:VEVENT',
      `UID:schedule-${slot.id}@ecole-a-jour`,
      `DTSTAMP:${nowStamp}`,
      `DTSTART:${formatIcsLocal(start)}`,
      `DTEND:${formatIcsLocal(end)}`,
      `RRULE:FREQ=WEEKLY;COUNT=${weeks}`,
      `SUMMARY:${summary}`,
      `LOCATION:${location}`,
      `DESCRIPTION:${description}`,
      'END:VEVENT',
    );
  }

  lines.push('END:VCALENDAR');
  return `${lines.join('\r\n')}\r\n`;
}
