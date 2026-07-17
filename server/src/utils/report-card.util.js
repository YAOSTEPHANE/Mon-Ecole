"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCurrentAcademicYear = getCurrentAcademicYear;
exports.inferReportingPeriod = inferReportingPeriod;
exports.getPeriodDates = getPeriodDates;
exports.gradePeriodWhere = gradePeriodWhere;
exports.getPeriodLabel = getPeriodLabel;
exports.computeStudentBulletinAverage = computeStudentBulletinAverage;
exports.computeClassBulletinRanks = computeClassBulletinRanks;
exports.enrichReportCardsWithTermHistory = enrichReportCardsWithTermHistory;
const prisma_1 = __importDefault(require("./prisma"));
const TRIMESTER_KEYS = ['trim1', 'trim2', 'trim3'];
function endOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}
/** Année scolaire courante (ex. 2025-2026 à partir de septembre 2025). */
function getCurrentAcademicYear(reference = new Date()) {
    const month = reference.getMonth();
    const year = reference.getFullYear();
    const startYear = month >= 8 ? year : year - 1;
    return `${startYear}-${startYear + 1}`;
}
/** Trimestre déduit d'une date dans une année scolaire donnée. */
function inferReportingPeriod(date, academicYear) {
    for (const period of TRIMESTER_KEYS) {
        const { start, end } = getPeriodDates(period, academicYear);
        if (date >= start && date <= end)
            return period;
    }
    return null;
}
function getPeriodDates(period, academicYear) {
    const parts = academicYear.split('-').map(Number);
    const yearStart = parts[0];
    const yearEnd = parts[1] ?? yearStart + 1;
    let start;
    let end;
    switch (period) {
        case 'trim1':
            start = new Date(yearStart, 8, 1);
            end = endOfDay(new Date(yearStart, 10, 30));
            break;
        case 'trim2':
            start = new Date(yearStart, 11, 1);
            end = endOfDay(new Date(yearEnd, 1, 28));
            break;
        case 'trim3':
            start = new Date(yearEnd, 2, 1);
            end = endOfDay(new Date(yearEnd, 5, 30));
            break;
        case 'sem1':
            start = new Date(yearStart, 8, 1);
            end = endOfDay(new Date(yearEnd, 1, 28));
            break;
        case 'sem2':
            start = new Date(yearEnd, 2, 1);
            end = endOfDay(new Date(yearEnd, 5, 30));
            break;
        default:
            start = new Date(yearStart, 8, 1);
            end = endOfDay(new Date(yearEnd, 5, 30));
    }
    return { start, end };
}
/** Filtre Prisma : notes par dates de période OU rattachement explicite au trimestre. */
function gradePeriodWhere(period, academicYear) {
    const { start, end } = getPeriodDates(period, academicYear);
    if (TRIMESTER_KEYS.includes(period)) {
        return {
            OR: [{ date: { gte: start, lte: end } }, { reportingPeriod: period }],
        };
    }
    return { date: { gte: start, lte: end } };
}
function getPeriodLabel(period) {
    const labels = {
        trim1: 'Trimestre 1',
        trim2: 'Trimestre 2',
        trim3: 'Trimestre 3',
        sem1: 'Semestre 1',
        sem2: 'Semestre 2',
    };
    return labels[period] || period;
}
/**
 * Moyenne générale période (même logique que la génération PDF / preview).
 */
async function computeStudentBulletinAverage(studentId, classId, period, academicYear) {
    const [grades, classCourses] = await Promise.all([
        prisma_1.default.grade.findMany({
            where: {
                studentId,
                ...gradePeriodWhere(period, academicYear),
            },
        }),
        prisma_1.default.course.findMany({
            where: { classId },
            select: { id: true },
        }),
    ]);
    const courseAverages = {};
    grades.forEach((grade) => {
        const courseId = grade.courseId;
        if (!courseAverages[courseId]) {
            courseAverages[courseId] = { total: 0, count: 0, average: 0 };
        }
        const gradeOn20 = (grade.score / grade.maxScore) * 20;
        courseAverages[courseId].total += gradeOn20 * grade.coefficient;
        courseAverages[courseId].count += grade.coefficient;
    });
    Object.keys(courseAverages).forEach((courseId) => {
        const c = courseAverages[courseId];
        c.average = c.count > 0 ? c.total / c.count : 0;
    });
    classCourses.forEach((course) => {
        if (!courseAverages[course.id]) {
            courseAverages[course.id] = { total: 0, count: 0, average: 0 };
        }
    });
    let totalWeightedAverage = 0;
    let totalCoefficient = 0;
    Object.entries(courseAverages).forEach(([courseId, course]) => {
        const hasGrades = grades.some((g) => g.courseId === courseId);
        if (hasGrades && course.count > 0) {
            totalWeightedAverage += course.average * course.count;
            totalCoefficient += course.count;
        }
    });
    return totalCoefficient > 0 ? totalWeightedAverage / totalCoefficient : 0;
}
async function computeClassBulletinRanks(classId, periodKey, academicYear) {
    const periodDates = getPeriodDates(periodKey, academicYear);
    const periodLabel = getPeriodLabel(periodKey);
    const students = await prisma_1.default.student.findMany({
        where: { classId },
        select: { id: true },
    });
    const withAvg = await Promise.all(students.map(async (s) => ({
        studentId: s.id,
        average: await computeStudentBulletinAverage(s.id, classId, periodKey, academicYear),
    })));
    withAvg.sort((a, b) => b.average - a.average);
    const rows = withAvg.map((r, i) => ({
        studentId: r.studentId,
        average: r.average,
        rank: i + 1,
    }));
    return { periodLabel, periodDates, rows };
}
function computeCourseAveragesFromGrades(grades, classCourseIds) {
    const courseAverages = {};
    grades.forEach((grade) => {
        const courseId = grade.courseId;
        if (!courseAverages[courseId]) {
            courseAverages[courseId] = { total: 0, count: 0, average: 0 };
        }
        const gradeOn20 = (grade.score / grade.maxScore) * 20;
        courseAverages[courseId].total += gradeOn20 * grade.coefficient;
        courseAverages[courseId].count += grade.coefficient;
    });
    Object.keys(courseAverages).forEach((courseId) => {
        const course = courseAverages[courseId];
        course.average = course.count > 0 ? course.total / course.count : 0;
    });
    classCourseIds.forEach((courseId) => {
        if (!courseAverages[courseId]) {
            courseAverages[courseId] = { total: 0, count: 0, average: 0 };
        }
    });
    return courseAverages;
}
function computeOverallFromCourseAverages(courseAverages, grades) {
    let totalWeightedAverage = 0;
    let totalCoefficient = 0;
    Object.entries(courseAverages).forEach(([courseId, course]) => {
        const hasGrades = grades.some((g) => g.courseId === courseId);
        if (hasGrades && course.count > 0) {
            totalWeightedAverage += course.average * course.count;
            totalCoefficient += course.count;
        }
    });
    return totalCoefficient > 0 ? totalWeightedAverage / totalCoefficient : 0;
}
function rankByAverage(values) {
    const sorted = [...values].sort((a, b) => b.average - a.average);
    const ranks = new Map();
    sorted.forEach((row, index) => ranks.set(row.id, index + 1));
    return ranks;
}
function rankCourseAverages(snapshots, courseIds) {
    const result = new Map();
    snapshots.forEach((s) => result.set(s.studentId, {}));
    courseIds.forEach((courseId) => {
        const rows = snapshots
            .map((s) => ({
            id: s.studentId,
            average: s.courseAverages[courseId]?.average ?? 0,
        }))
            .filter((r) => r.average > 0);
        const ranks = rankByAverage(rows);
        snapshots.forEach((s) => {
            const rank = ranks.get(s.studentId);
            if (rank !== undefined) {
                result.get(s.studentId)[courseId] = rank;
            }
        });
    });
    return result;
}
const TRIMESTER_PERIODS = ['trim1', 'trim2', 'trim3'];
const BILAN_LETTRES_COURSE_MATCH = /français|francais|anglais|english|histoire|géographie|geographie|\bhg\b|lettres/i;
const BILAN_SCIENCES_COURSE_MATCH = /math|physique|chimie|svt|science/i;
function bilanAverageFromSnapshot(snap, courses, match) {
    const matchedIds = courses.filter((c) => match.test(c.name)).map((c) => c.id);
    const values = matchedIds
        .map((id) => snap.courseAverages[id]?.average ?? 0)
        .filter((v) => v > 0);
    return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}
function rankBilanAverages(snapshots, courses, match) {
    const rows = snapshots
        .map((s) => ({
        id: s.studentId,
        average: bilanAverageFromSnapshot(s, courses, match),
    }))
        .filter((r) => r.average > 0);
    return rankByAverage(rows);
}
function conductPeriodLabel(period) {
    const map = {
        trim1: 'Trimestre 1',
        trim2: 'Trimestre 2',
        trim3: 'Trimestre 3',
    };
    return map[period];
}
/**
 * Enrichit les données bulletin avec historique trimestriel (T1/T2/T3), stats de classe et conduite.
 */
async function enrichReportCardsWithTermHistory(classId, academicYear, activePeriod, reportCards) {
    if (!TRIMESTER_PERIODS.includes(activePeriod)) {
        return;
    }
    const classCourses = await prisma_1.default.course.findMany({
        where: { classId },
        select: { id: true, name: true },
    });
    const courseIds = classCourses.map((c) => c.id);
    const studentIds = reportCards.map((r) => r.studentId);
    const termSnapshots = {
        trim1: [],
        trim2: [],
        trim3: [],
    };
    for (const term of TRIMESTER_PERIODS) {
        const periodDates = getPeriodDates(term, academicYear);
        const snapshots = [];
        for (const studentId of studentIds) {
            const grades = await prisma_1.default.grade.findMany({
                where: {
                    studentId,
                    ...gradePeriodWhere(term, academicYear),
                },
                select: {
                    courseId: true,
                    score: true,
                    maxScore: true,
                    coefficient: true,
                },
            });
            const courseAverages = computeCourseAveragesFromGrades(grades, courseIds);
            snapshots.push({
                studentId,
                courseAverages,
                overallAverage: computeOverallFromCourseAverages(courseAverages, grades),
            });
        }
        termSnapshots[term] = snapshots;
    }
    const annualAverages = reportCards.map((card) => {
        const t1 = termSnapshots.trim1.find((s) => s.studentId === card.studentId)?.overallAverage ?? 0;
        const t2 = termSnapshots.trim2.find((s) => s.studentId === card.studentId)?.overallAverage ?? 0;
        const t3 = termSnapshots.trim3.find((s) => s.studentId === card.studentId)?.overallAverage ?? 0;
        const parts = [t1, t2, t3].filter((v) => v > 0);
        const average = parts.length > 0 ? parts.reduce((a, b) => a + b, 0) / parts.length : 0;
        return { studentId: card.studentId, average };
    });
    const annualRanks = rankByAverage(annualAverages.map((a) => ({ id: a.studentId, average: a.average })));
    const activeSnapshots = termSnapshots[activePeriod];
    const activeAverages = activeSnapshots.map((s) => ({ id: s.studentId, average: s.overallAverage }));
    const periodAverage = activeAverages.length > 0
        ? activeAverages.reduce((sum, row) => sum + row.average, 0) / activeAverages.length
        : 0;
    const periodMin = activeAverages.length > 0 ? Math.min(...activeAverages.map((r) => r.average)) : 0;
    const periodMax = activeAverages.length > 0 ? Math.max(...activeAverages.map((r) => r.average)) : 0;
    const annualValues = annualAverages.map((a) => a.average).filter((v) => v > 0);
    const annualClassAverage = annualValues.length > 0 ? annualValues.reduce((a, b) => a + b, 0) / annualValues.length : 0;
    const annualMin = annualValues.length > 0 ? Math.min(...annualValues) : 0;
    const annualMax = annualValues.length > 0 ? Math.max(...annualValues) : 0;
    const conducts = await prisma_1.default.conduct.findMany({
        where: {
            studentId: { in: studentIds },
            academicYear,
            period: { in: TRIMESTER_PERIODS.map(conductPeriodLabel) },
        },
        select: { studentId: true, period: true, average: true },
    });
    for (const card of reportCards) {
        const termHistory = {};
        for (const term of TRIMESTER_PERIODS) {
            const snapshots = termSnapshots[term];
            const courseRanks = rankCourseAverages(snapshots, courseIds);
            const lettresRanks = rankBilanAverages(snapshots, classCourses, BILAN_LETTRES_COURSE_MATCH);
            const sciencesRanks = rankBilanAverages(snapshots, classCourses, BILAN_SCIENCES_COURSE_MATCH);
            const overallRanks = rankByAverage(snapshots.map((s) => ({ id: s.studentId, average: s.overallAverage })));
            const snap = snapshots.find((s) => s.studentId === card.studentId);
            if (!snap)
                continue;
            const byCourse = {};
            courseIds.forEach((courseId) => {
                const avg = snap.courseAverages[courseId]?.average ?? 0;
                const rank = courseRanks.get(card.studentId)?.[courseId];
                if (avg > 0 && rank !== undefined) {
                    byCourse[courseId] = { average: avg, rank };
                }
            });
            const lettresAvg = bilanAverageFromSnapshot(snap, classCourses, BILAN_LETTRES_COURSE_MATCH);
            const sciencesAvg = bilanAverageFromSnapshot(snap, classCourses, BILAN_SCIENCES_COURSE_MATCH);
            const lettresRank = lettresRanks.get(card.studentId);
            const sciencesRank = sciencesRanks.get(card.studentId);
            termHistory[term] = {
                average: snap.overallAverage,
                rank: overallRanks.get(card.studentId) ?? 0,
                byCourse,
                ...(lettresAvg > 0 && lettresRank !== undefined
                    ? { bilanLettres: { average: lettresAvg, rank: lettresRank } }
                    : {}),
                ...(sciencesAvg > 0 && sciencesRank !== undefined
                    ? { bilanSciences: { average: sciencesAvg, rank: sciencesRank } }
                    : {}),
            };
        }
        card.termHistory = termHistory;
        const annualAvg = annualAverages.find((a) => a.studentId === card.studentId)?.average ?? 0;
        card.annualSummary = {
            average: annualAvg,
            rank: annualRanks.get(card.studentId) ?? 0,
        };
        card.classStats = {
            periodAverage,
            periodMin,
            periodMax,
            annualAverage: annualClassAverage,
            annualMin,
            annualMax,
        };
        const studentConducts = conducts.filter((c) => c.studentId === card.studentId);
        if (studentConducts.length > 0) {
            const byTerm = {};
            studentConducts.forEach((c) => {
                if (c.period.includes('1'))
                    byTerm['trim1'] = c.average;
                else if (c.period.includes('2'))
                    byTerm['trim2'] = c.average;
                else if (c.period.includes('3'))
                    byTerm['trim3'] = c.average;
            });
            const activeConduct = studentConducts.find((c) => c.period === conductPeriodLabel(activePeriod));
            card.conduct = {
                average: activeConduct?.average ?? studentConducts[studentConducts.length - 1]?.average ?? 0,
                byTerm,
            };
        }
    }
}
//# sourceMappingURL=report-card.util.js.map