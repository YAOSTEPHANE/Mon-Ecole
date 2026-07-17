"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STUDENT_SENSITIVE_FIELD_KEYS = void 0;
exports.decryptStudentRecord = decryptStudentRecord;
exports.decryptSessionUserPayload = decryptSessionUserPayload;
exports.encryptStudentScalarsForPrismaCreate = encryptStudentScalarsForPrismaCreate;
exports.decryptParentTeacherAppointmentRow = decryptParentTeacherAppointmentRow;
exports.encryptStudentSensitiveWritePayload = encryptStudentSensitiveWritePayload;
const field_encryption_util_1 = require("./field-encryption.util");
exports.STUDENT_SENSITIVE_FIELD_KEYS = [
    'address',
    'emergencyContact',
    'emergencyPhone',
    'medicalInfo',
];
/** Déchiffre les champs sensibles d’un enregistrement élève (réponse API). */
function decryptStudentRecord(row) {
    const next = { ...row };
    for (const key of exports.STUDENT_SENSITIVE_FIELD_KEYS) {
        if (!(key in next))
            continue;
        const v = next[key];
        if (typeof v === 'string') {
            next[key] = (0, field_encryption_util_1.decryptSensitiveString)(v);
        }
    }
    return next;
}
/** Déchiffre studentProfile et les élèves imbriqués sous parentProfile (session / utilisateur). */
function decryptSessionUserPayload(user) {
    const out = { ...user };
    if (out.studentProfile && typeof out.studentProfile === 'object') {
        out.studentProfile = decryptStudentRecord(out.studentProfile);
    }
    if (out.parentProfile &&
        typeof out.parentProfile === 'object' &&
        'students' in out.parentProfile &&
        Array.isArray(out.parentProfile.students)) {
        const pp = out.parentProfile;
        out.parentProfile = {
            ...out.parentProfile,
            students: pp.students.map((sp) => sp.student && typeof sp.student === 'object'
                ? { ...sp, student: decryptStudentRecord(sp.student) }
                : sp),
        };
    }
    return out;
}
/**
 * Prépare les chaînes pour écriture Prisma (null / chaîne chiffrée).
 * Ignore les clés absentes ou à undefined ; conserve explicitement null.
 */
function encryptStudentScalarsForPrismaCreate(fields) {
    const out = {};
    for (const key of exports.STUDENT_SENSITIVE_FIELD_KEYS) {
        if (!(key in fields))
            continue;
        const raw = fields[key];
        if (raw === undefined)
            continue;
        if (raw === null) {
            out[key] = null;
        }
        else {
            const t = String(raw).trim();
            out[key] = t === '' ? null : (0, field_encryption_util_1.encryptSensitiveString)(t);
        }
    }
    return out;
}
/** Met à jour uniquement les champs présents dans le payload (après normalisation route). */
/** Rendez-vous : l’include `student` expose les champs scalaires élève. */
function decryptParentTeacherAppointmentRow(row) {
    if (!row.student || typeof row.student !== 'object')
        return row;
    return {
        ...row,
        student: decryptStudentRecord(row.student),
    };
}
function encryptStudentSensitiveWritePayload(payload) {
    const next = { ...payload };
    for (const key of exports.STUDENT_SENSITIVE_FIELD_KEYS) {
        if (!(key in next))
            continue;
        const v = next[key];
        if (v === undefined)
            continue;
        if (v === null) {
            next[key] = null;
        }
        else {
            const t = String(v).trim();
            next[key] = t === '' ? null : (0, field_encryption_util_1.encryptSensitiveString)(t);
        }
    }
    return next;
}
//# sourceMappingURL=student-sensitive-crypto.util.js.map