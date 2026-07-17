import type { PrismaClient } from '@prisma/client';
export type ScheduleImportRow = {
    className: string;
    courseName?: string;
    courseCode?: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    room?: string | null;
};
export type ScheduleImportResult = {
    created: number;
    skipped: number;
    errors: Array<{
        line: number;
        message: string;
    }>;
};
export declare function parseDayOfWeek(raw: string): number | null;
export declare function parseTimeRange(combinedOrStart: string, endOptional?: string): {
    startTime: string;
    endTime: string;
} | null;
export declare function parseScheduleCsv(text: string): Record<string, string>[];
export declare function mapRawRowToImport(row: Record<string, string>): ScheduleImportRow | {
    error: string;
};
export declare const SCHEDULE_IMPORT_CSV_TEMPLATE = "Classe;Jour;Heure d\u00E9but;Heure fin;Mati\u00E8re;Code mati\u00E8re;Salle\n6\u00E8me A;Lundi;08:00;09:00;Math\u00E9matiques;;Salle 101\n6\u00E8me A;Mardi;10:00;11:00;Fran\u00E7ais;;Salle 102";
export declare function importSchedulesFromCsv(prisma: PrismaClient, opts: {
    csv: string;
    schoolId?: string | null;
    defaultClassId?: string;
    clearExisting?: boolean;
    skipConstraintErrors?: boolean;
}): Promise<ScheduleImportResult>;
//# sourceMappingURL=schedule-import.util.d.ts.map