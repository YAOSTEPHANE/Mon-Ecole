import type { StaffCategory, SupportStaffKind } from '@prisma/client';
import { STAFF_MODULE_LABELS, type StaffModuleId } from './staff-visible-modules.util';
export declare const SUPPORT_STAFF_KINDS: SupportStaffKind[];
export declare const DEFAULT_SUPPORT_KIND_LABELS: Record<SupportStaffKind, string>;
export type SchoolStaffMetierDto = {
    id: string;
    schoolId: string;
    supportKind: SupportStaffKind;
    label: string;
    description: string | null;
    defaultModules: StaffModuleId[];
    isActive: boolean;
    sortOrder: number;
};
export declare function labelForSupportKind(supportKind: SupportStaffKind, customLabel?: string | null): string;
/** Crée ou met à jour les métiers standard pour un établissement (à la création d’un collège). */
export declare function seedSchoolStaffMetiers(schoolId: string): Promise<number>;
export declare function seedAllSchoolsStaffMetiers(): Promise<void>;
export declare function listSchoolStaffMetiers(schoolId: string): Promise<SchoolStaffMetierDto[]>;
export declare function getSchoolMetierDefaults(schoolId: string, supportKind: SupportStaffKind): Promise<StaffModuleId[] | null>;
export declare function assertSupportKindActiveForSchool(schoolId: string, supportKind: SupportStaffKind): Promise<void>;
export declare function getEligibleModulesForStaffMemberAtSchool(staffCategory: StaffCategory, supportKind: SupportStaffKind | null | undefined, schoolId?: string | null): Promise<StaffModuleId[]>;
export declare function resolveVisibleStaffModulesAtSchool(staffCategory: StaffCategory, supportKind: SupportStaffKind | null | undefined, stored: string[] | null | undefined, schoolId?: string | null): Promise<StaffModuleId[]>;
export declare function sanitizeVisibleStaffModulesForSchool(staffCategory: StaffCategory, supportKind: SupportStaffKind | null | undefined, requested: unknown, schoolId: string): Promise<StaffModuleId[]>;
export { STAFF_MODULE_LABELS };
//# sourceMappingURL=school-staff-metiers.util.d.ts.map