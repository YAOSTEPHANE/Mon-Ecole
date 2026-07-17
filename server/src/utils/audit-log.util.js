"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildFieldChanges = buildFieldChanges;
exports.auditActorFromRequest = auditActorFromRequest;
exports.recordAuditLog = recordAuditLog;
exports.studentSnapshotForAudit = studentSnapshotForAudit;
exports.diffStudentAudit = diffStudentAudit;
exports.studentSelfProfileSnapshotForAudit = studentSelfProfileSnapshotForAudit;
exports.diffStudentSelfProfile = diffStudentSelfProfile;
const prisma_1 = __importDefault(require("./prisma"));
const field_encryption_util_1 = require("./field-encryption.util");
const REDACT_KEYS = new Set([
    'password',
    'hashedPassword',
    'token',
    'refreshToken',
    'authorization',
    'newPassword',
]);
function valuesDiffer(b, a) {
    const jb = JSON.stringify(b ?? null);
    const ja = JSON.stringify(a ?? null);
    return jb !== ja;
}
/** Compare deux objets plats sur une liste de clés ; ignore les clés secrètes. */
function buildFieldChanges(before, after, keys) {
    const out = {};
    for (const k of keys) {
        if (REDACT_KEYS.has(k))
            continue;
        const bv = before && k in before ? before[k] : undefined;
        const av = after && k in after ? after[k] : undefined;
        if (valuesDiffer(bv, av)) {
            out[k] = { before: bv ?? null, after: av ?? null };
        }
    }
    return Object.keys(out).length > 0 ? out : undefined;
}
function auditActorFromRequest(req, user) {
    return {
        actorUserId: user?.id,
        actorEmail: user?.email,
        actorRole: user?.role,
        ipAddress: (req.ip || req.socket.remoteAddress || undefined),
        userAgent: req.get('user-agent') || undefined,
    };
}
async function recordAuditLog(params) {
    const a = auditActorFromRequest(params.req, params.actor ?? undefined);
    try {
        await prisma_1.default.auditLog.create({
            data: {
                actorUserId: a.actorUserId,
                actorEmail: a.actorEmail,
                actorRole: a.actorRole,
                action: params.action,
                entityType: params.entityType,
                entityId: params.entityId,
                summary: params.summary,
                changes: params.changes,
                ipAddress: a.ipAddress,
                userAgent: a.userAgent,
            },
        });
    }
    catch (e) {
        console.error('[AuditLog] échec enregistrement:', e);
    }
}
/** Vue « métier » d’un élève pour comparaison (champs sensibles déchiffrés si besoin). */
function studentSnapshotForAudit(s) {
    return {
        firstName: s.user.firstName,
        lastName: s.user.lastName,
        phone: s.user.phone,
        address: s.address ? (0, field_encryption_util_1.decryptSensitiveString)(s.address) : null,
        emergencyContact: s.emergencyContact ? (0, field_encryption_util_1.decryptSensitiveString)(s.emergencyContact) : null,
        emergencyPhone: s.emergencyPhone ? (0, field_encryption_util_1.decryptSensitiveString)(s.emergencyPhone) : null,
        medicalInfo: s.medicalInfo ? (0, field_encryption_util_1.decryptSensitiveString)(s.medicalInfo) : null,
        classId: s.classId,
        classGroupId: s.classGroupId,
        isActive: s.isActive,
        nfcId: s.nfcId,
        biometricId: s.biometricId,
        enrollmentStatus: s.enrollmentStatus,
        stateAssignment: s.stateAssignment,
    };
}
const STUDENT_AUDIT_KEYS = [
    'firstName',
    'lastName',
    'phone',
    'address',
    'emergencyContact',
    'emergencyPhone',
    'medicalInfo',
    'classId',
    'classGroupId',
    'isActive',
    'nfcId',
    'biometricId',
    'enrollmentStatus',
    'stateAssignment',
];
function diffStudentAudit(before, after) {
    return buildFieldChanges(before, after, [...STUDENT_AUDIT_KEYS]);
}
/** Champs élève modifiables par l’élève lui-même (profil). */
function studentSelfProfileSnapshotForAudit(s) {
    return {
        address: s.address ? (0, field_encryption_util_1.decryptSensitiveString)(s.address) : null,
        emergencyContact: s.emergencyContact ? (0, field_encryption_util_1.decryptSensitiveString)(s.emergencyContact) : null,
        emergencyPhone: s.emergencyPhone ? (0, field_encryption_util_1.decryptSensitiveString)(s.emergencyPhone) : null,
        medicalInfo: s.medicalInfo ? (0, field_encryption_util_1.decryptSensitiveString)(s.medicalInfo) : null,
    };
}
const STUDENT_SELF_KEYS = ['address', 'emergencyContact', 'emergencyPhone', 'medicalInfo'];
function diffStudentSelfProfile(before, after) {
    return buildFieldChanges(before, after, [...STUDENT_SELF_KEYS]);
}
//# sourceMappingURL=audit-log.util.js.map