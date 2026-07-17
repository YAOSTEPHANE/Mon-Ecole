"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findSchedulesWithRelations = findSchedulesWithRelations;
exports.findScheduleByIdWithRelations = findScheduleByIdWithRelations;
const prisma_1 = __importDefault(require("./prisma"));
const userBriefSelect = { firstName: true, lastName: true, email: true };
async function enrichSchedules(rows) {
    if (rows.length === 0)
        return [];
    const classIds = [...new Set(rows.map((r) => r.classId))];
    const courseIds = [...new Set(rows.map((r) => r.courseId))];
    const substituteIds = [
        ...new Set(rows.map((r) => r.substituteTeacherId).filter((id) => Boolean(id))),
    ];
    const [classes, courses, substitutes] = await Promise.all([
        prisma_1.default.class.findMany({
            where: { id: { in: classIds } },
            select: { id: true, name: true, level: true },
        }),
        prisma_1.default.course.findMany({
            where: { id: { in: courseIds } },
            select: { id: true, name: true, code: true, teacherId: true },
        }),
        substituteIds.length > 0
            ? prisma_1.default.teacher.findMany({
                where: { id: { in: substituteIds } },
                select: { id: true, user: { select: userBriefSelect } },
            })
            : [],
    ]);
    const teacherIds = [...new Set(courses.map((c) => c.teacherId))];
    const teachers = teacherIds.length > 0
        ? await prisma_1.default.teacher.findMany({
            where: { id: { in: teacherIds } },
            select: { id: true, user: { select: userBriefSelect } },
        })
        : [];
    const classMap = new Map(classes.map((c) => [c.id, c]));
    const courseMap = new Map(courses.map((c) => [c.id, c]));
    const teacherMap = new Map(teachers.map((t) => [t.id, t]));
    const substituteMap = new Map(substitutes.map((t) => [t.id, t]));
    const enriched = [];
    for (const row of rows) {
        const cls = classMap.get(row.classId);
        const courseRow = courseMap.get(row.courseId);
        if (!cls || !courseRow)
            continue;
        const courseTeacher = teacherMap.get(courseRow.teacherId) ?? null;
        enriched.push({
            ...row,
            class: cls,
            course: {
                id: courseRow.id,
                name: courseRow.name,
                code: courseRow.code,
                teacher: courseTeacher,
            },
            substituteTeacher: row.substituteTeacherId
                ? substituteMap.get(row.substituteTeacherId) ?? null
                : null,
        });
    }
    return enriched;
}
/** Charge les créneaux EDT sans échouer si une relation MongoDB est orpheline. */
async function findSchedulesWithRelations(where = {}, orderBy = [
    { dayOfWeek: 'asc' },
    { startTime: 'asc' },
]) {
    const rows = await prisma_1.default.schedule.findMany({ where, orderBy });
    return enrichSchedules(rows);
}
async function findScheduleByIdWithRelations(id) {
    const row = await prisma_1.default.schedule.findUnique({ where: { id } });
    if (!row)
        return null;
    const [enriched] = await enrichSchedules([row]);
    return enriched ?? null;
}
//# sourceMappingURL=safe-schedule-query.util.js.map