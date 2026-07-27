import type { AbsenceStatus } from '@prisma/client';
import prisma from './prisma';
import { notifyParentsOfStudentPunch } from './attendance-parent-notify.util';
import { parseTimeOnDate, toAttendanceDateKey, findActiveScheduleSlotForCourse, findActiveScheduleSlotForTeacher, resolveLateStatus, durationMinutesFromHHMM, computeTeacherTeachingMinutes } from './schedule-slot.util';
import { computeStartTiming, computeEndTiming } from './teacher-session-timing.util';

export type PunchPhase = 'CHECK_IN' | 'CHECK_OUT' | 'ALREADY_COMPLETE';

export type PunchSource = 'NFC' | 'BIOMETRIC' | 'FACE' | 'MANUAL' | 'ADMIN';

function dayBounds(at: Date): { startOfDay: Date; endOfDay: Date } {
  const startOfDay = new Date(at);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);
  return { startOfDay, endOfDay };
}

function lateGraceMinutes(): number {
  const n = parseInt(process.env.ATTENDANCE_LATE_GRACE_MINUTES || '10', 10);
  return Number.isFinite(n) ? Math.max(0, n) : 10;
}

function earlyCheckInMinutes(): number {
  const n = parseInt(process.env.ATTENDANCE_EARLY_CHECKIN_MINUTES || '20', 10);
  return Number.isFinite(n) ? Math.max(0, n) : 20;
}

export async function punchStudentCourseAttendance(params: {
  studentId: string;
  courseId: string;
  teacherId: string;
  at: Date;
  source: PunchSource;
  forceStatus?: AbsenceStatus;
  minutesLate?: number | null;
  /** false = ne pas alerter les parents (défaut true) */
  notifyParents?: boolean;
}) {
  const { studentId, courseId, teacherId, at, source } = params;
  const notifyParents = params.notifyParents !== false;
  const { startOfDay, endOfDay } = dayBounds(at);

  const slot = await findActiveScheduleSlotForCourse(courseId, at, earlyCheckInMinutes());
  const grace = lateGraceMinutes();

  let existing = await prisma.absence.findFirst({
    where: { studentId, courseId, date: { gte: startOfDay, lt: endOfDay } },
  });

  if (!existing) {
    const status =
      params.forceStatus ??
      (slot ? resolveLateStatus(at, slot.startTime, grace) : ('PRESENT' as AbsenceStatus));
    const lateMins =
      status === 'LATE' && slot
        ? (params.minutesLate ??
          Math.max(
            0,
            Math.round(
              (at.getTime() - parseTimeOnDate(slot.startTime, at).getTime()) / 60_000,
            ),
          ))
        : params.minutesLate ?? undefined;

    const created = await prisma.absence.create({
      data: {
        studentId,
        courseId,
        teacherId,
        date: at,
        status,
        excused: false,
        justificationDocuments: [],
        attendanceSource: source,
        minutesLate: lateMins ?? undefined,
        checkInAt: at,
        scheduleId: slot?.id,
      },
    });
    if (notifyParents) {
      void notifyParentsOfStudentPunch({
        studentId,
        courseId,
        absenceId: created.id,
        punchPhase: 'CHECK_IN',
        at,
        status: created.status,
        minutesLate: created.minutesLate,
      });
    }
    return { absence: created, punchPhase: 'CHECK_IN' as PunchPhase };
  }

  if (!existing.checkInAt) {
    const status =
      params.forceStatus ??
      (slot ? resolveLateStatus(at, slot.startTime, grace) : existing.status);
    const updated = await prisma.absence.update({
      where: { id: existing.id },
      data: {
        checkInAt: at,
        status,
        attendanceSource: source,
        scheduleId: slot?.id ?? existing.scheduleId,
        updatedAt: new Date(),
      },
    });
    if (notifyParents) {
      void notifyParentsOfStudentPunch({
        studentId,
        courseId,
        absenceId: updated.id,
        punchPhase: 'CHECK_IN',
        at,
        status: updated.status,
        minutesLate: updated.minutesLate,
      });
    }
    return { absence: updated, punchPhase: 'CHECK_IN' as PunchPhase };
  }

  if (!existing.checkOutAt) {
    const updated = await prisma.absence.update({
      where: { id: existing.id },
      data: {
        checkOutAt: at,
        attendanceSource: source,
        updatedAt: new Date(),
      },
    });
    if (notifyParents) {
      void notifyParentsOfStudentPunch({
        studentId,
        courseId,
        absenceId: updated.id,
        punchPhase: 'CHECK_OUT',
        at,
        status: updated.status,
        minutesLate: updated.minutesLate,
      });
    }
    return { absence: updated, punchPhase: 'CHECK_OUT' as PunchPhase };
  }

  return { absence: existing, punchPhase: 'ALREADY_COMPLETE' as PunchPhase };
}

export async function punchStaffAttendance(params: {
  staffId: string;
  at: Date;
  source: PunchSource;
  recordedByUserId?: string | null;
}) {
  const dateKey = toAttendanceDateKey(params.at);

  let row = await prisma.staffAttendance.findUnique({
    where: {
      staffId_attendanceDate: { staffId: params.staffId, attendanceDate: dateKey },
    },
  });

  if (!row) {
    row = await prisma.staffAttendance.create({
      data: {
        staffId: params.staffId,
        attendanceDate: dateKey,
        status: 'PRESENT',
        source: params.source,
        checkInAt: params.at,
        recordedByUserId: params.recordedByUserId ?? undefined,
      },
    });
    return { attendance: row, punchPhase: 'CHECK_IN' as PunchPhase };
  }

  if (!row.checkInAt) {
    row = await prisma.staffAttendance.update({
      where: { id: row.id },
      data: {
        checkInAt: params.at,
        status: 'PRESENT',
        source: params.source,
        recordedByUserId: params.recordedByUserId ?? undefined,
      },
    });
    return { attendance: row, punchPhase: 'CHECK_IN' as PunchPhase };
  }

  if (!row.checkOutAt) {
    row = await prisma.staffAttendance.update({
      where: { id: row.id },
      data: {
        checkOutAt: params.at,
        source: params.source,
        recordedByUserId: params.recordedByUserId ?? undefined,
      },
    });
    return { attendance: row, punchPhase: 'CHECK_OUT' as PunchPhase };
  }

  return { attendance: row, punchPhase: 'ALREADY_COMPLETE' as PunchPhase };
}

export async function punchTeacherCourseAttendance(params: {
  teacherId: string;
  at: Date;
  source: 'NFC' | 'BIOMETRIC' | 'FACE' | 'ADMIN' | 'SELF';
  courseId?: string;
  recordedByUserId?: string | null;
}) {
  const dateKey = toAttendanceDateKey(params.at);
  const grace = lateGraceMinutes();
  const early = earlyCheckInMinutes();

  const slot = await findActiveScheduleSlotForTeacher(
    params.teacherId,
    params.at,
    params.courseId,
    early,
  );

  let courseId = params.courseId ?? slot?.courseId ?? undefined;

  async function completeCheckout(
    target: {
      id: string;
      checkInAt: Date | null;
      courseId: string | null;
      scheduleId: string | null;
      scheduledEndAt: Date | null;
      checkOutAt: Date | null;
    },
  ) {
    if (!target.checkInAt) {
      const err = new Error('Session sans arrivée enregistrée');
      (err as Error & { statusCode?: number }).statusCode = 400;
      throw err;
    }

    let endTime: string | null = null;
    if (target.scheduleId) {
      const sched = await prisma.schedule.findUnique({
        where: { id: target.scheduleId },
        select: { endTime: true },
      });
      endTime = sched?.endTime ?? null;
    }
    if (!endTime && slot && target.courseId === slot.courseId) {
      endTime = slot.endTime;
    }

    const endTiming = endTime
      ? computeEndTiming(params.at, endTime)
      : {
          scheduledEndAt: target.scheduledEndAt ?? target.checkOutAt ?? params.at,
          minutesEarlyEnd: 0,
          minutesOvertimeEnd: 0,
        };

    // Décompte = arrivée réelle → fin du cours (emploi du temps), pas le départ réel.
    const teachingMinutes = computeTeacherTeachingMinutes(
      target.checkInAt,
      endTiming.scheduledEndAt,
    );

    const saved = await prisma.teacherAttendance.update({
      where: { id: target.id },
      data: {
        actualCheckOutAt: params.at,
        teachingMinutes,
        scheduledEndAt: endTiming.scheduledEndAt,
        checkOutAt: endTiming.scheduledEndAt,
        minutesEarlyEnd: endTiming.minutesEarlyEnd,
        minutesOvertimeEnd: endTiming.minutesOvertimeEnd,
        source: params.source,
        recordedByUserId: params.recordedByUserId ?? undefined,
      },
      include: {
        teacher: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    return {
      attendance: saved,
      punchPhase: 'CHECK_OUT' as PunchPhase,
      slot,
      courseId: target.courseId,
    };
  }

  // —— Départ : session ouverte pour le cours ciblé ——
  if (courseId) {
    const sessionKey = `${dateKey}:${courseId}`;
    const existing = await prisma.teacherAttendance.findUnique({
      where: { teacherId_sessionKey: { teacherId: params.teacherId, sessionKey } },
    });
    if (existing?.actualCheckOutAt) {
      return {
        attendance: existing,
        punchPhase: 'ALREADY_COMPLETE' as PunchPhase,
        slot,
        courseId,
      };
    }
    if (existing?.checkInAt && !existing.actualCheckOutAt) {
      return completeCheckout(existing);
    }
  }

  // —— Départ : sans courseId, clôturer la session ouverte la plus proche de la fin EDT ——
  if (!courseId) {
    const openSessions = await prisma.teacherAttendance.findMany({
      where: {
        teacherId: params.teacherId,
        attendanceDate: dateKey,
        checkInAt: { not: null },
        actualCheckOutAt: null,
      },
      orderBy: { checkInAt: 'asc' },
    });
    if (openSessions.length > 0) {
      const target =
        openSessions.length === 1
          ? openSessions[0]
          : openSessions.reduce((best, row) => {
              const end = row.scheduledEndAt ?? row.checkOutAt;
              if (!end) return best;
              const diff = Math.abs(params.at.getTime() - end.getTime());
              const bestEnd = best.scheduledEndAt ?? best.checkOutAt;
              if (!bestEnd) return row;
              return diff < Math.abs(params.at.getTime() - bestEnd.getTime()) ? row : best;
            });
      return completeCheckout(target);
    }
  }

  // —— Arrivée : nouveau pointage ——
  courseId = courseId ?? slot?.courseId;
  if (!courseId) {
    const err = new Error(
      'Aucun cours en cours : précisez courseId ou vérifiez l’emploi du temps de l’enseignant.',
    );
    (err as Error & { statusCode?: number }).statusCode = 400;
    throw err;
  }

  if (!slot) {
    const err = new Error(
      'Aucun créneau actif pour l’arrivée (fenêtre : début − 20 min → fin du cours).',
    );
    (err as Error & { statusCode?: number }).statusCode = 400;
    throw err;
  }

  const sessionKey = `${dateKey}:${courseId}`;
  const checkInAt = params.at;
  const plannedMinutes = durationMinutesFromHHMM(slot.startTime, slot.endTime);
  const startTiming = computeStartTiming(checkInAt, slot.startTime, grace);
  const scheduledEndAt = parseTimeOnDate(slot.endTime, checkInAt);
  const teachingMinutes = computeTeacherTeachingMinutes(checkInAt, scheduledEndAt);
  const status: AbsenceStatus = resolveLateStatus(checkInAt, slot.startTime, grace);

  const saved = await prisma.teacherAttendance.upsert({
    where: {
      teacherId_sessionKey: { teacherId: params.teacherId, sessionKey },
    },
    create: {
      teacherId: params.teacherId,
      sessionKey,
      attendanceDate: dateKey,
      courseId,
      scheduleId: slot.id,
      status,
      source: params.source,
      recordedByUserId: params.recordedByUserId ?? undefined,
      checkInAt,
      checkOutAt: scheduledEndAt,
      scheduledStartAt: startTiming.scheduledStartAt,
      scheduledEndAt,
      minutesLateStart: startTiming.minutesLateStart,
      minutesEarlyStart: startTiming.minutesEarlyStart,
      minutesEarlyEnd: 0,
      minutesOvertimeEnd: 0,
      plannedMinutes,
      teachingMinutes,
    },
    update: {
      status,
      source: params.source,
      checkInAt,
      checkOutAt: scheduledEndAt,
      scheduledStartAt: startTiming.scheduledStartAt,
      scheduledEndAt,
      minutesLateStart: startTiming.minutesLateStart,
      minutesEarlyStart: startTiming.minutesEarlyStart,
      plannedMinutes,
      teachingMinutes,
      scheduleId: slot.id,
      recordedByUserId: params.recordedByUserId ?? undefined,
    },
    include: {
      teacher: {
        include: {
          user: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });

  return {
    attendance: saved,
    punchPhase: 'CHECK_IN' as PunchPhase,
    slot,
    courseId,
  };
}
