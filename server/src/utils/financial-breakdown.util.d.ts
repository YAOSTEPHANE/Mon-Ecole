/** Agrégations financières paiements / impayés par classe, niveau, genre. */
export type GenderKey = 'MALE' | 'FEMALE' | 'OTHER' | 'UNKNOWN';
export declare const GENDER_LABELS: Record<GenderKey, string>;
export declare function normalizeGender(raw: string | null | undefined): GenderKey;
export type MoneyBucket = {
    key: string;
    label: string;
    level?: string;
    paidAmount: number;
    paidCount: number;
    unpaidAmount: number;
    unpaidCount: number;
    overdueAmount: number;
    overdueCount: number;
    studentsPaid: number;
    studentsUnpaid: number;
};
export declare function emptyMoneyBucket(key: string, label: string, level?: string): MoneyBucket;
export declare function roundMoney(n: number): number;
export declare function finalizeMoneyBuckets(map: Map<string, MoneyBucket>): MoneyBucket[];
export type StudentDim = {
    gender: GenderKey;
    classId: string | null;
    className: string;
    level: string;
};
export declare function studentDimFrom(student: {
    gender?: string | null;
    classId?: string | null;
    class?: {
        id: string;
        name: string;
        level: string;
    } | null;
}): StudentDim;
//# sourceMappingURL=financial-breakdown.util.d.ts.map