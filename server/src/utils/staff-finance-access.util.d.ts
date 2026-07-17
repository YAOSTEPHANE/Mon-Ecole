import type { StaffModuleId } from './staff-visible-modules.util';
/** @deprecated Utiliser staff-module-admin-access.util — conservé pour compatibilité scripts. */
export declare const BURSAR_STAFF_MODULES: StaffModuleId[];
/** @deprecated */
export declare function isStaffFinanceAdminPath(path: string, method: string): boolean;
/** @deprecated */
export declare function staffFinancePathAllowed(visibleModules: StaffModuleId[], path: string, method: string): boolean;
//# sourceMappingURL=staff-finance-access.util.d.ts.map