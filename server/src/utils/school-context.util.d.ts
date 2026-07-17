import type { Role } from '@prisma/client';
import type { Request } from 'express';
import { SchoolPrismaNotReadyError } from './ensure-default-school.util';
export { SchoolPrismaNotReadyError };
import type { AuthRequest } from '../middleware/auth.middleware';
export type SchoolSummary = {
    id: string;
    name: string;
    slug: string;
    shortName?: string | null;
    isDefault: boolean;
};
export type SchoolContextRequest = AuthRequest & {
    schoolId?: string;
    school?: SchoolSummary;
};
export declare function readSchoolIdFromRequest(req: Request): string | undefined;
export declare function readSchoolSlugFromRequest(req: Request): string | undefined;
export declare function resolveSchoolBySlug(slug: string): Promise<SchoolSummary | null>;
export declare function listSchoolsForUser(userId: string, role: Role): Promise<SchoolSummary[]>;
export declare function userCanAccessSchool(userId: string, role: Role, schoolId: string): Promise<boolean>;
export declare function resolveActiveSchoolForRequest(req: SchoolContextRequest): Promise<{
    schoolId: string;
    school: SchoolSummary;
} | null>;
/** Filtre élèves pour l’établissement actif */
export declare function studentScopeWhere(schoolId: string, isDefaultSchool?: boolean): {
    OR: ({
        schoolId: string;
        OR?: undefined;
    } | {
        schoolId?: undefined;
        OR: ({
            schoolId: string;
        } | {
            schoolId: null;
        })[];
    } | {
        class: {
            schoolId: string;
            OR?: undefined;
        } | {
            schoolId?: undefined;
            OR: ({
                schoolId: string;
            } | {
                schoolId: null;
            })[];
        };
    })[];
};
export declare function classScopeWhere(schoolId: string, isDefaultSchool?: boolean): {
    schoolId: string;
    OR?: undefined;
} | {
    schoolId?: undefined;
    OR: ({
        schoolId: string;
    } | {
        schoolId: null;
    })[];
};
/**
 * Filtre pré-inscriptions pour l’établissement actif.
 * Les dossiers sans schoolId (anciennes données) sont rattachés à l’établissement par défaut uniquement.
 */
export declare function admissionScopeWhere(schoolId: string, isDefaultSchool?: boolean): {
    schoolId: string;
    OR?: undefined;
} | {
    schoolId?: undefined;
    OR: ({
        schoolId: string;
    } | {
        schoolId: null;
    })[];
};
/** Filtre compta (fournisseurs, dépenses, caisse, budget) par établissement. */
export declare function accountingScopeWhere(schoolId: string, isDefaultSchool?: boolean): {
    schoolId: string;
    OR?: undefined;
} | {
    schoolId?: undefined;
    OR: ({
        schoolId: string;
    } | {
        schoolId: null;
    })[];
};
export declare function brandingIdForSchool(schoolId: string): Promise<string>;
//# sourceMappingURL=school-context.util.d.ts.map