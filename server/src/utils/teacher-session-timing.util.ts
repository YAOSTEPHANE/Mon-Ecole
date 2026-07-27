import { parseTimeOnDate } from './schedule-slot.util';

export type TeacherSessionTiming = {
  scheduledStartAt: Date;
  scheduledEndAt: Date;
  minutesLateStart: number;
  minutesEarlyStart: number;
  minutesEarlyEnd: number;
  minutesOvertimeEnd: number;
};

/** Écarts arrivée vs début EDT (minutes). */
export function computeStartTiming(
  checkInAt: Date,
  startTime: string,
  graceMinutes: number,
): Pick<TeacherSessionTiming, 'scheduledStartAt' | 'minutesLateStart' | 'minutesEarlyStart'> {
  const scheduledStartAt = parseTimeOnDate(startTime, checkInAt);
  const graceEnd = new Date(scheduledStartAt.getTime() + graceMinutes * 60_000);
  const diffMs = checkInAt.getTime() - scheduledStartAt.getTime();

  if (diffMs < 0) {
    return {
      scheduledStartAt,
      minutesEarlyStart: Math.round(Math.abs(diffMs) / 60_000),
      minutesLateStart: 0,
    };
  }
  if (checkInAt.getTime() > graceEnd.getTime()) {
    return {
      scheduledStartAt,
      minutesEarlyStart: 0,
      minutesLateStart: Math.round((checkInAt.getTime() - scheduledStartAt.getTime()) / 60_000),
    };
  }
  return { scheduledStartAt, minutesEarlyStart: 0, minutesLateStart: 0 };
}

/** Écarts départ réel vs fin EDT (minutes). */
export function computeEndTiming(
  actualCheckOutAt: Date,
  endTime: string,
): Pick<TeacherSessionTiming, 'scheduledEndAt' | 'minutesEarlyEnd' | 'minutesOvertimeEnd'> {
  const scheduledEndAt = parseTimeOnDate(endTime, actualCheckOutAt);
  const diffMs = scheduledEndAt.getTime() - actualCheckOutAt.getTime();

  if (diffMs > 0) {
    return {
      scheduledEndAt,
      minutesEarlyEnd: Math.round(diffMs / 60_000),
      minutesOvertimeEnd: 0,
    };
  }
  return {
    scheduledEndAt,
    minutesEarlyEnd: 0,
    minutesOvertimeEnd: Math.round(Math.abs(diffMs) / 60_000),
  };
}

export function resolveScheduledBounds(
  at: Date,
  startTime: string,
  endTime: string,
): { scheduledStartAt: Date; scheduledEndAt: Date } {
  return {
    scheduledStartAt: parseTimeOnDate(startTime, at),
    scheduledEndAt: parseTimeOnDate(endTime, at),
  };
}
