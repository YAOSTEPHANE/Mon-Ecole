import type { Role } from '@prisma/client';
/** Identifiants des onglets / modules du tableau de bord admin. */
export declare const ADMIN_MODULE_IDS: readonly ['dashboard', 'workspaces', 'activities', 'notifications', 'students', 'academic', 'grading', 'classes', 'teachers', 'educators', 'staff-personnel', 'parent-guardians', 'management', 'roles', 
/** Multi-collèges — réservé SUPER_ADMIN côté UI et API */
'schools', 'pedagogical', 'discipline', 'extracurricular', 'orientation', 'communication', 'library', 'health', 'elearning', 'material', 'reports', 'analytics', 'schedule', 'pointage', 'attendance', 'hr', 'administrative', 'admissions', 'fees', 'tuition-fees', 'payments', 'accounting', 'nfc-scanner', 'security', 'performance', 'settings'];
export type AdminModuleId = (typeof ADMIN_MODULE_IDS)[number];
export declare const ADMIN_MODULE_LABELS: Record<AdminModuleId, string>;
export declare const ADMIN_MODULE_CATEGORIES: {
    title: string;
    hint?: string;
    moduleIds: AdminModuleId[];
}[];
export declare function sanitizeEnabledAdminModules(requested: unknown): AdminModuleId[];
export declare function getAllConfigurableAdminModules(): AdminModuleId[];
export declare function slugifyWorkspaceName(name: string): string;
export declare function resolveAdminVisibleModules(userId: string, role: Role): Promise<{
    visibleModules: AdminModuleId[];
    unrestricted: boolean;
    workspaces: {
        id: string;
        name: string;
        slug: string;
    }[];
}>;
//# sourceMappingURL=admin-visible-modules.util.d.ts.map