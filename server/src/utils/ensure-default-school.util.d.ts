export declare class SchoolPrismaNotReadyError extends Error {
    constructor();
}
/**
 * Garantit au moins un établissement actif et rattache les données existantes sans schoolId.
 */
export declare function ensureDefaultSchool(): Promise<string>;
//# sourceMappingURL=ensure-default-school.util.d.ts.map