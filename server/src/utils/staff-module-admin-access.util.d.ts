import type { StaffModuleId } from './staff-visible-modules.util';
/**
 * Métiers / modules qui consultent le barème scolarité (inscription, admissions, frais)
 * sans avoir obligatoirement fees_mgmt.
 */
export declare const STAFF_TUITION_RATES_READ_MODULE_IDS: StaffModuleId[];
export declare function staffTuitionRatesReadAllowed(visibleModules: StaffModuleId[]): boolean;
/**
 * Suppression définitive d’un élève ou d’une classe : réservée aux administrateurs,
 * pas aux comptes secrétaire (STAFF / supportKind SECRETARY).
 */
export declare function staffSecretaryBlocksDestructiveDelete(path: string, method: string, supportKind: string | null | undefined): boolean;
/** Actions /admin toujours réservées aux administrateurs. */
export declare function isStaffAdminForbidden(path: string, method: string, visibleModules?: StaffModuleId[]): boolean;
/** Au moins une règle de module pourrait couvrir ce chemin (hors interdictions). */
export declare function isStaffModuleAdminPath(path: string, method: string): boolean;
/**
 * Autorise un appel /admin pour un STAFF si un module visible de son espace couvre le chemin et la méthode.
 */
export declare function staffModuleAdminPathAllowed(visibleModules: StaffModuleId[], path: string, method: string, supportKind?: string | null): boolean;
export declare function staffModuleGrantsWriteUi(moduleId: StaffModuleId, visibleModules: StaffModuleId[]): boolean;
/** Préfixes /admin utilisés directement depuis /staff (écriture, pas proxy pédagogie GET). */
export declare function getStaffDirectAdminPrefixes(): string[];
//# sourceMappingURL=staff-module-admin-access.util.d.ts.map