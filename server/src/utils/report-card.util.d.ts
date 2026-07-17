export type CourseAverageEntry = {
    total: number;
    count: number;
    average: number;
};
export type TermHistoryEntry = {
    average: number;
    rank: number;
    byCourse: Record<string, {
        average: number;
        rank: number;
    }>;
    bilanLettres?: {
        average: number;
        rank: number;
    };
    bilanSciences?: {
        average: number;
        rank: number;
    };
};
export type ReportCardTermHistory = {
    trim1?: TermHistoryEntry;
    trim2?: TermHistoryEntry;
    trim3?: TermHistoryEntry;
};
export type ReportCardClassStats = {
    periodAverage: number;
    periodMin: number;
    periodMax: number;
    annualAverage?: number;
    annualMin?: number;
    annualMax?: number;
};
/** Année scolaire courante (ex. 2025-2026 à partir de septembre 2025). */
export declare function getCurrentAcademicYear(reference?: Date): string;
/** Trimestre déduit d'une date dans une année scolaire donnée. */
export declare function inferReportingPeriod(date: Date, academicYear: string): string | null;
export declare function getPeriodDates(period: string, academicYear: string): {
    start: Date;
    end: Date;
};
/** Filtre Prisma : notes par dates de période OU rattachement explicite au trimestre. */
export declare function gradePeriodWhere(period: string, academicYear: string): {
    OR: ({
        date: {
            gte: Date;
            lte: Date;
        };
        reportingPeriod?: undefined;
    } | {
        date?: undefined;
        reportingPeriod: string;
    })[];
    date?: undefined;
} | {
    OR?: undefined;
    date: {
        gte: Date;
        lte: Date;
    };
};
export declare function getPeriodLabel(period: string): string;
/**
 * Moyenne générale période (même logique que la génération PDF / preview).
 */
export declare function computeStudentBulletinAverage(studentId: string, classId: string, period: string, academicYear: string): Promise<number>;
export type ClassRankRow = {
    studentId: string;
    average: number;
    rank: number;
};
export declare function computeClassBulletinRanks(classId: string, periodKey: string, academicYear: string): Promise<{
    periodLabel: string;
    periodDates: {
        start: Date;
        end: Date;
    };
    rows: ClassRankRow[];
}>;
/**
 * Enrichit les données bulletin avec historique trimestriel (T1/T2/T3), stats de classe et conduite.
 */
export declare function enrichReportCardsWithTermHistory(classId: string, academicYear: string, activePeriod: string, reportCards: Array<{
    studentId: string;
    average?: number;
    rank?: number;
    termHistory?: ReportCardTermHistory;
    annualSummary?: {
        average: number;
        rank: number;
    };
    classStats?: ReportCardClassStats;
    conduct?: {
        average: number;
        byTerm?: Record<string, number>;
    };
}>): Promise<void>;
//# sourceMappingURL=report-card.util.d.ts.map