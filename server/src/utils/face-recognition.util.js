"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseFaceDescriptor = parseFaceDescriptor;
exports.euclideanDistance = euclideanDistance;
exports.findBestFaceMatch = findBestFaceMatch;
exports.countFaceEnrollments = countFaceEnrollments;
exports.saveFaceDescriptor = saveFaceDescriptor;
exports.clearFaceDescriptor = clearFaceDescriptor;
const prisma_1 = __importDefault(require("./prisma"));
const DESCRIPTOR_LENGTH = 128;
function parseFaceDescriptor(raw) {
    if (!Array.isArray(raw) || raw.length !== DESCRIPTOR_LENGTH) {
        throw Object.assign(new Error(`Le descripteur facial doit contenir ${DESCRIPTOR_LENGTH} valeurs.`), {
            status: 400,
        });
    }
    const descriptor = raw.map((v) => Number(v));
    if (descriptor.some((n) => !Number.isFinite(n))) {
        throw Object.assign(new Error('Descripteur facial invalide.'), { status: 400 });
    }
    return descriptor;
}
function euclideanDistance(a, b) {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
        const d = a[i] - b[i];
        sum += d * d;
    }
    return Math.sqrt(sum);
}
function matchThreshold() {
    const n = parseFloat(process.env.FACE_MATCH_THRESHOLD || '0.55');
    return Number.isFinite(n) ? Math.max(0.3, Math.min(0.9, n)) : 0.55;
}
function descriptorFromJson(value) {
    if (!value || !Array.isArray(value) || value.length !== DESCRIPTOR_LENGTH)
        return null;
    const arr = value.map((v) => Number(v));
    if (arr.some((n) => !Number.isFinite(n)))
        return null;
    return arr;
}
async function loadEnrolledRows(filter) {
    const rows = [];
    if (!filter || filter === 'STUDENT') {
        const students = await prisma_1.default.student.findMany({
            where: { faceEnrolledAt: { not: null }, isActive: true },
            select: {
                id: true,
                studentId: true,
                faceDescriptor: true,
                user: { select: { firstName: true, lastName: true } },
            },
        });
        for (const s of students) {
            const descriptor = descriptorFromJson(s.faceDescriptor);
            if (!descriptor)
                continue;
            rows.push({
                personType: 'STUDENT',
                personId: s.id,
                displayName: `${s.user.firstName} ${s.user.lastName}`.trim(),
                employeeOrStudentCode: s.studentId,
                descriptor,
            });
        }
    }
    if (!filter || filter === 'TEACHER') {
        const teachers = await prisma_1.default.teacher.findMany({
            where: { faceEnrolledAt: { not: null } },
            select: {
                id: true,
                employeeId: true,
                faceDescriptor: true,
                user: { select: { firstName: true, lastName: true, isActive: true } },
            },
        });
        for (const t of teachers) {
            if (!t.user.isActive)
                continue;
            const descriptor = descriptorFromJson(t.faceDescriptor);
            if (!descriptor)
                continue;
            rows.push({
                personType: 'TEACHER',
                personId: t.id,
                displayName: `${t.user.firstName} ${t.user.lastName}`.trim(),
                employeeOrStudentCode: t.employeeId,
                descriptor,
            });
        }
    }
    if (!filter || filter === 'STAFF') {
        const staff = await prisma_1.default.staffMember.findMany({
            where: { faceEnrolledAt: { not: null } },
            select: {
                id: true,
                employeeId: true,
                faceDescriptor: true,
                user: { select: { firstName: true, lastName: true, isActive: true } },
            },
        });
        for (const s of staff) {
            if (!s.user.isActive)
                continue;
            const descriptor = descriptorFromJson(s.faceDescriptor);
            if (!descriptor)
                continue;
            rows.push({
                personType: 'STAFF',
                personId: s.id,
                displayName: `${s.user.firstName} ${s.user.lastName}`.trim(),
                employeeOrStudentCode: s.employeeId,
                descriptor,
            });
        }
    }
    return rows;
}
/** Retourne la meilleure correspondance sous le seuil, ou null. */
async function findBestFaceMatch(probe, options) {
    const enrolled = await loadEnrolledRows(options?.personType);
    if (enrolled.length === 0)
        return null;
    const threshold = matchThreshold();
    let best = null;
    for (const row of enrolled) {
        const distance = euclideanDistance(probe, row.descriptor);
        if (distance > threshold)
            continue;
        if (!best || distance < best.distance) {
            best = {
                personType: row.personType,
                personId: row.personId,
                displayName: row.displayName,
                distance,
                employeeOrStudentCode: row.employeeOrStudentCode ?? null,
            };
        }
    }
    return best;
}
async function countFaceEnrollments() {
    const [students, teachers, staff] = await Promise.all([
        prisma_1.default.student.count({ where: { faceEnrolledAt: { not: null } } }),
        prisma_1.default.teacher.count({ where: { faceEnrolledAt: { not: null } } }),
        prisma_1.default.staffMember.count({ where: { faceEnrolledAt: { not: null } } }),
    ]);
    return { students, teachers, staff, total: students + teachers + staff };
}
async function saveFaceDescriptor(personType, personId, descriptor) {
    const data = {
        faceDescriptor: descriptor,
        faceEnrolledAt: new Date(),
    };
    if (personType === 'STUDENT') {
        await prisma_1.default.student.update({ where: { id: personId }, data });
        return;
    }
    if (personType === 'TEACHER') {
        await prisma_1.default.teacher.update({ where: { id: personId }, data });
        return;
    }
    await prisma_1.default.staffMember.update({ where: { id: personId }, data });
}
async function clearFaceDescriptor(personType, personId) {
    const data = { faceDescriptor: null, faceEnrolledAt: null };
    if (personType === 'STUDENT') {
        await prisma_1.default.student.update({ where: { id: personId }, data });
        return;
    }
    if (personType === 'TEACHER') {
        await prisma_1.default.teacher.update({ where: { id: personId }, data });
        return;
    }
    await prisma_1.default.staffMember.update({ where: { id: personId }, data });
}
//# sourceMappingURL=face-recognition.util.js.map