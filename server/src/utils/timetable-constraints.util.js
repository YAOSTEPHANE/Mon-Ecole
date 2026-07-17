"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.overlaps = exports.normalizeRoomKey = void 0;
exports.assertScheduleConstraints = assertScheduleConstraints;
exports.getClassScheduleVolumeSummary = getClassScheduleVolumeSummary;
exports.autoGenerateTimetableForClass = autoGenerateTimetableForClass;
const course_fields_util_1 = require("./course-fields.util");
const normalizeRoomKey = (room) => {
    if (!room || !room.trim())
        return null;
    return room.trim().toUpperCase().replace(/\s+/g, ' ');
};
exports.normalizeRoomKey = normalizeRoomKey;
const toMinutes = (time) => {
    const [h, m] = time.split(':').map(Number);
    if (!Number.isFinite(h) || !Number.isFinite(m))
        return NaN;
    return h * 60 + m;
};
const overlaps = (aStart, aEnd, bStart, bEnd) => {
    const as = toMinutes(aStart);
    const ae = toMinutes(aEnd);
    const bs = toMinutes(bStart);
    const be = toMinutes(bEnd);
    return as < be && bs < ae;
};
exports.overlaps = overlaps;
const isInsideAtLeastOneWindow = (target, windows) => {
    if (windows.length === 0)
        return true;
    const tStart = toMinutes(target.startTime);
    const tEnd = toMinutes(target.endTime);
    return windows
        .filter((w) => w.dayOfWeek === target.dayOfWeek)
        .some((w) => toMinutes(w.startTime) <= tStart && toMinutes(w.endTime) >= tEnd);
};
async function assertScheduleConstraints(prisma, input, excludeScheduleId) {
    const start = toMinutes(input.startTime);
    const end = toMinutes(input.endTime);
    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
        throw new Error('Créneau horaire invalide');
    }
    const course = await prisma.course.findUnique({
        where: { id: input.courseId },
        select: { id: true, classId: true, teacherId: true },
    });
    if (!course)
        throw new Error('Cours introuvable');
    if (course.classId !== input.classId) {
        throw new Error('Le cours sélectionné ne correspond pas à la classe');
    }
    const effectiveTeacherId = input.substituteTeacherId?.trim() || course.teacherId;
    if (effectiveTeacherId === course.teacherId && input.substituteTeacherId?.trim()) {
        throw new Error('Le remplaçant doit être différent de l’enseignant titulaire');
    }
    const daySchedules = await prisma.schedule.findMany({
        where: {
            dayOfWeek: input.dayOfWeek,
            ...(excludeScheduleId ? { id: { not: excludeScheduleId } } : {}),
        },
        include: {
            course: { select: { classId: true, teacherId: true } },
        },
    });
    for (const row of daySchedules) {
        if (!(0, exports.overlaps)(input.startTime, input.endTime, row.startTime, row.endTime))
            continue;
        if (row.course.classId === input.classId) {
            throw new Error('Conflit : la classe a déjà un cours sur ce créneau');
        }
        const rowEffectiveTeacher = row.substituteTeacherId || row.course.teacherId;
        if (rowEffectiveTeacher === effectiveTeacherId) {
            throw new Error('Conflit : enseignant déjà occupé sur ce créneau');
        }
        const roomA = (0, exports.normalizeRoomKey)(input.room);
        const roomB = (0, exports.normalizeRoomKey)(row.room);
        if (roomA && roomB && roomA === roomB) {
            throw new Error('Conflit : salle déjà occupée sur ce créneau');
        }
    }
    const availability = await prisma.teacherScheduleAvailabilitySlot.findMany({
        where: { teacherId: effectiveTeacherId, dayOfWeek: input.dayOfWeek },
    });
    if (!isInsideAtLeastOneWindow(input, availability)) {
        throw new Error("Le créneau est hors disponibilité de l'enseignant");
    }
    const roomKey = (0, exports.normalizeRoomKey)(input.room);
    if (roomKey) {
        const roomBlocks = await prisma.roomScheduleUnavailableSlot.findMany({
            where: { roomKey, dayOfWeek: input.dayOfWeek },
        });
        const blocked = roomBlocks.some((b) => (0, exports.overlaps)(input.startTime, input.endTime, b.startTime, b.endTime));
        if (blocked)
            throw new Error('La salle est indisponible sur ce créneau');
    }
}
const addMinutes = (time, delta) => {
    const value = toMinutes(time);
    const m = value + delta;
    const hh = String(Math.floor(m / 60)).padStart(2, '0');
    const mm = String(m % 60).padStart(2, '0');
    return `${hh}:${mm}`;
};
async function getClassScheduleVolumeSummary(prisma, classId) {
    const courses = await prisma.course.findMany({
        where: { classId },
        select: { id: true, name: true, weeklyHours: true },
        orderBy: { name: 'asc' },
    });
    const scheduleRows = await prisma.schedule.findMany({
        where: { classId },
        select: { courseId: true, startTime: true, endTime: true },
    });
    const minutesByCourse = new Map();
    for (const row of scheduleRows) {
        const dur = (0, course_fields_util_1.scheduleDurationMinutes)(row.startTime, row.endTime);
        minutesByCourse.set(row.courseId, (minutesByCourse.get(row.courseId) ?? 0) + dur);
    }
    const rows = courses.map((course) => {
        const targetMinutes = (0, course_fields_util_1.weeklyHoursToTargetMinutes)(course.weeklyHours);
        const scheduledMinutes = minutesByCourse.get(course.id) ?? 0;
        const missingMinutes = Math.max(0, targetMinutes - scheduledMinutes);
        const excessMinutes = Math.max(0, scheduledMinutes - targetMinutes);
        return {
            courseId: course.id,
            courseName: course.name,
            weeklyHours: course.weeklyHours,
            targetMinutes,
            scheduledMinutes,
            missingMinutes,
            excessMinutes,
            targetSlots: Math.max(1, Math.ceil(targetMinutes / 60)),
            scheduledSlots: Math.ceil(scheduledMinutes / 60),
            missingSlots: Math.ceil(missingMinutes / 60),
            excessSlots: Math.ceil(excessMinutes / 60),
        };
    });
    return { classId, courses: rows };
}
async function autoGenerateTimetableForClass(prisma, opts) {
    const days = opts.days?.length ? opts.days : [1, 2, 3, 4, 5];
    const slotDuration = Math.max(1, Math.min(180, opts.slotDurationMinutes ?? 60));
    const slotStep = Math.max(1, Math.min(60, opts.slotStepMinutes ?? 1));
    const morningStart = opts.morningStart ?? '07:00';
    const morningEnd = opts.morningEnd ?? '12:00';
    const afternoonStart = opts.afternoonStart ?? '14:00';
    const afternoonEnd = opts.afternoonEnd ?? '18:00';
    const mode = opts.clearExisting ? 'replace' : 'reconcile';
    if (opts.clearExisting) {
        await prisma.schedule.deleteMany({ where: { classId: opts.classId } });
    }
    const courses = await prisma.course.findMany({
        where: { classId: opts.classId },
        select: { id: true, name: true, weeklyHours: true },
        orderBy: { name: 'asc' },
    });
    const existingScheduleRows = opts.clearExisting
        ? []
        : await prisma.schedule.findMany({
            where: { classId: opts.classId },
            select: { courseId: true, startTime: true, endTime: true },
        });
    const existingMinutesByCourse = new Map();
    for (const row of existingScheduleRows) {
        const dur = (0, course_fields_util_1.scheduleDurationMinutes)(row.startTime, row.endTime);
        existingMinutesByCourse.set(row.courseId, (existingMinutesByCourse.get(row.courseId) ?? 0) + dur);
    }
    const slots = [];
    for (const day of days) {
        let cursor = morningStart;
        while (toMinutes(cursor) + slotDuration <= toMinutes(morningEnd)) {
            const end = addMinutes(cursor, slotDuration);
            slots.push({ dayOfWeek: day, startTime: cursor, endTime: end });
            cursor = addMinutes(cursor, slotStep);
        }
        cursor = afternoonStart;
        while (toMinutes(cursor) + slotDuration <= toMinutes(afternoonEnd)) {
            const end = addMinutes(cursor, slotDuration);
            slots.push({ dayOfWeek: day, startTime: cursor, endTime: end });
            cursor = addMinutes(cursor, slotStep);
        }
    }
    let created = 0;
    const errors = [];
    const skippedCourses = [];
    for (const course of courses) {
        const targetMinutes = (0, course_fields_util_1.weeklyHoursToTargetMinutes)(course.weeklyHours);
        const alreadyMinutes = existingMinutesByCourse.get(course.id) ?? 0;
        let minutesToPlace = mode === 'replace' ? targetMinutes : Math.max(0, targetMinutes - alreadyMinutes);
        let placedMinutes = 0;
        if (mode === 'reconcile' && minutesToPlace === 0) {
            continue;
        }
        for (const slot of slots) {
            if (minutesToPlace <= 0)
                break;
            const slotMinutes = (0, course_fields_util_1.scheduleDurationMinutes)(slot.startTime, slot.endTime);
            if (slotMinutes <= 0)
                continue;
            try {
                await assertScheduleConstraints(prisma, {
                    classId: opts.classId,
                    courseId: course.id,
                    dayOfWeek: slot.dayOfWeek,
                    startTime: slot.startTime,
                    endTime: slot.endTime,
                    room: null,
                    substituteTeacherId: null,
                });
                await prisma.schedule.create({
                    data: {
                        classId: opts.classId,
                        courseId: course.id,
                        dayOfWeek: slot.dayOfWeek,
                        startTime: slot.startTime,
                        endTime: slot.endTime,
                        room: null,
                    },
                });
                created += 1;
                placedMinutes += slotMinutes;
                minutesToPlace -= slotMinutes;
            }
            catch {
                // créneau non compatible, on continue
            }
        }
        if (placedMinutes === 0 && minutesToPlace > 0)
            skippedCourses.push(course.name);
        if (minutesToPlace > 0) {
            const target = targetMinutes;
            const done = mode === 'replace' ? placedMinutes : alreadyMinutes + placedMinutes;
            errors.push(`Placement partiel pour ${course.name} (${(0, course_fields_util_1.formatScheduleMinutesLabel)(done)} / ${(0, course_fields_util_1.formatScheduleMinutesLabel)(target)})`);
        }
    }
    return { created, errors, skippedCourses, mode, slotDurationMinutes: slotDuration, slotStepMinutes: slotStep };
}
//# sourceMappingURL=timetable-constraints.util.js.map