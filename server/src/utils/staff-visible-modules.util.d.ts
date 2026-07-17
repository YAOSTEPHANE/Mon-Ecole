import type { StaffCategory, SupportStaffKind } from '@prisma/client';
/** Identifiants des modules de l’espace personnel STAFF. */
export declare const STAFF_MODULE_IDS: readonly ['overview', 'counter', 'admissions', 'appointments', 'student_registry', 'treasury', 'validations', 'academic_overview', 'class_councils', 'health_log', 'library', 'digital_library', 'it_requests', 'maintenance_requests', 'students_mgmt', 'academic_mgmt', 'grading_mgmt', 'classes_mgmt', 'teachers_mgmt', 'educators_mgmt', 'staff_mgmt', 'parents_mgmt', 'pedagogical_tracking', 'discipline_mgmt', 'extracurricular_mgmt', 'orientation_mgmt', 'communication_mgmt', 'library_mgmt', 'material_mgmt', 'reports_mgmt', 'analytics_mgmt', 'schedule_mgmt', 'pointage_mgmt', 'attendance_mgmt', 'hr_mgmt', 'notifications_mgmt', 'fees_mgmt', 'tuition_fees_mgmt', 'payments_mgmt', 'accounting_mgmt', 'administrative_mgmt'];
export type StaffModuleId = (typeof STAFF_MODULE_IDS)[number];
export declare function getAllStaffVisibleModules(): StaffModuleId[];
export declare function normalizeStaffModuleId(raw: unknown): StaffModuleId | null;
export declare const STAFF_MODULE_LABELS: Record<StaffModuleId, string>;
/** Tous les modules STAFF sont cochables pour chaque métier. */
export declare function getEligibleModulesForSupportKind(_supportKind: SupportStaffKind | null | undefined): StaffModuleId[];
export declare function getEligibleModulesForStaffMember(staffCategory: StaffCategory, supportKind: SupportStaffKind | null | undefined): StaffModuleId[];
export declare function sanitizeVisibleStaffModules(staffCategory: StaffCategory, supportKind: SupportStaffKind | null | undefined, requested: unknown): StaffModuleId[];
export declare function resolveVisibleStaffModules(staffCategory: StaffCategory, supportKind: SupportStaffKind | null | undefined, stored: string[] | null | undefined): StaffModuleId[];
/**
 * Première connexion uniquement : enregistre les modules par défaut du métier si la liste est vide.
 * Ne réécrit pas une personnalisation déjà enregistrée.
 */
export declare function syncStaffVisibleModulesIfStale(staff: {
    id: string;
    staffCategory: StaffCategory;
    supportKind: SupportStaffKind | null;
    visibleStaffModules: string[];
    schoolId?: string | null;
}): Promise<StaffModuleId[] | null>;
export declare function getStaffMemberModuleContext(userId: string): Promise<{
    staff: {
        id: string;
        schoolId: string | null;
        staffCategory: import(".prisma/client").$Enums.StaffCategory;
        supportKind: import(".prisma/client").$Enums.SupportStaffKind | null;
        visibleStaffModules: string[];
    };
    visibleModules: any;
    metierLabel: string | null;
} | null>;
export declare function assertStaffHasModule(userId: string, moduleId: StaffModuleId): Promise<void>;
//# sourceMappingURL=staff-visible-modules.util.d.ts.map