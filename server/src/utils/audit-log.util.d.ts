import type { Request } from 'express';
export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE';
/** Compare deux objets plats sur une liste de clés ; ignore les clés secrètes. */
export declare function buildFieldChanges(before: Record<string, unknown> | null, after: Record<string, unknown> | null, keys: string[]): Record<string, {
    before: unknown;
    after: unknown;
}> | undefined;
export declare function auditActorFromRequest(req: Request, user?: {
    id: string;
    email: string;
    role: string;
} | null): {
    actorUserId: string | undefined;
    actorEmail: string | undefined;
    actorRole: string | undefined;
    ipAddress: string | undefined;
    userAgent: string | undefined;
};
export declare function recordAuditLog(params: {
    req: Request;
    actor?: {
        id: string;
        email: string;
        role: string;
    } | null;
    action: AuditAction;
    entityType: string;
    entityId: string;
    summary: string;
    changes?: Record<string, {
        before: unknown;
        after: unknown;
    }>;
}): Promise<void>;
/** Vue « métier » d’un élève pour comparaison (champs sensibles déchiffrés si besoin). */
export declare function studentSnapshotForAudit(s: {
    user: {
        firstName: string;
        lastName: string;
        phone: string | null;
    };
    address: string | null;
    emergencyContact: string | null;
    emergencyPhone: string | null;
    medicalInfo: string | null;
    classId: string | null;
    classGroupId: string | null;
    isActive: boolean;
    nfcId: string | null;
    biometricId: string | null;
    enrollmentStatus: string;
    stateAssignment: string | null;
}): Record<string, unknown>;
export declare function diffStudentAudit(before: ReturnType<typeof studentSnapshotForAudit>, after: ReturnType<typeof studentSnapshotForAudit>): Record<string, {
    before: unknown;
    after: unknown;
}> | undefined;
/** Champs élève modifiables par l’élève lui-même (profil). */
export declare function studentSelfProfileSnapshotForAudit(s: {
    address: string | null;
    emergencyContact: string | null;
    emergencyPhone: string | null;
    medicalInfo: string | null;
}): Record<string, unknown>;
export declare function diffStudentSelfProfile(before: ReturnType<typeof studentSelfProfileSnapshotForAudit>, after: ReturnType<typeof studentSelfProfileSnapshotForAudit>): Record<string, {
    before: unknown;
    after: unknown;
}> | undefined;
//# sourceMappingURL=audit-log.util.d.ts.map