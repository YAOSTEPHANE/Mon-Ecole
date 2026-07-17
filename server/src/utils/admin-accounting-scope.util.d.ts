import type { SchoolContextRequest } from './school-context.util';
export declare function resolveAccountingScope(req: SchoolContextRequest): {
    schoolId: string;
    isDefault: boolean;
    where: {
        schoolId: string;
        OR?: undefined;
    } | {
        schoolId?: undefined;
        OR: ({
            schoolId: string;
        } | {
            schoolId: null;
        })[];
    };
};
export declare function resolvePaymentStudentScope(req: SchoolContextRequest): {
    OR: ({
        schoolId: string;
        OR?: undefined;
    } | {
        schoolId?: undefined;
        OR: ({
            schoolId: string;
        } | {
            schoolId: null;
        })[];
    } | {
        class: {
            schoolId: string;
            OR?: undefined;
        } | {
            schoolId?: undefined;
            OR: ({
                schoolId: string;
            } | {
                schoolId: null;
            })[];
        };
    })[];
};
export declare function assertSupplierInSchool(id: string, req: SchoolContextRequest): Promise<boolean>;
export declare function assertSchoolExpenseInSchool(id: string, req: SchoolContextRequest): Promise<boolean>;
export declare function assertPettyCashInSchool(id: string, req: SchoolContextRequest): Promise<boolean>;
export declare function assertBudgetLineInSchool(id: string, req: SchoolContextRequest): Promise<boolean>;
//# sourceMappingURL=admin-accounting-scope.util.d.ts.map