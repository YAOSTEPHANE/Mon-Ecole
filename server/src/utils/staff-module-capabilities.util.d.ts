import type { StaffModuleId } from './staff-visible-modules.util';
/**
 * Modules affichés en consultation seule (registre, rapports, pilotage…).
 * Tous les autres modules visibles accordent création / modification / suppression
 * sur les routes /admin couvertes par le module.
 */
export declare const STAFF_MODULES_READ_ONLY: ReadonlySet<StaffModuleId>;
export declare function staffModuleIsReadOnlyByDesign(moduleId: StaffModuleId): boolean;
/** Le métier peut agir (pas seulement consulter) dans ce module. */
export declare function staffModuleGrantsWriteAccess(moduleId: StaffModuleId, visibleModules: StaffModuleId[]): boolean;
//# sourceMappingURL=staff-module-capabilities.util.d.ts.map