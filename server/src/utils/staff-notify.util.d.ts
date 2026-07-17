import { type StaffModuleId } from './staff-visible-modules.util';
/** Utilisateurs STAFF actifs ayant au moins un des modules indiqués. */
export declare function resolveStaffUserIdsWithAnyModule(moduleIds: StaffModuleId[]): Promise<string[]>;
/** Comptes admin actifs (alertes opérationnelles). */
export declare function resolveActiveAdminUserIds(): Promise<string[]>;
//# sourceMappingURL=staff-notify.util.d.ts.map