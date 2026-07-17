export declare const SCHOOL_PRISMA_HINT = "Client Prisma obsol\u00E8te : arr\u00EAtez npm run dev, puis dans server ex\u00E9cutez npx prisma generate et relancez.";
type SchoolDelegate = {
    findFirst: (args: unknown) => Promise<{
        id: string;
    } | null>;
    findUnique: (args: unknown) => Promise<unknown>;
    findMany: (args: unknown) => Promise<unknown[]>;
    create: (args: unknown) => Promise<{
        id: string;
    }>;
    update: (args: unknown) => Promise<unknown>;
    updateMany: (args: unknown) => Promise<unknown>;
};
type SchoolMemberDelegate = {
    findFirst: (args: unknown) => Promise<unknown>;
    findUnique: (args: unknown) => Promise<unknown>;
    findMany: (args: unknown) => Promise<unknown[]>;
    create: (args: unknown) => Promise<unknown>;
    upsert: (args: unknown) => Promise<unknown>;
    updateMany: (args: unknown) => Promise<unknown>;
};
export declare function getSchoolDelegate(): SchoolDelegate | null;
export declare function getSchoolMemberDelegate(): SchoolMemberDelegate | null;
export declare function isSchoolPrismaReady(): boolean;
export {};
//# sourceMappingURL=school-prisma.util.d.ts.map