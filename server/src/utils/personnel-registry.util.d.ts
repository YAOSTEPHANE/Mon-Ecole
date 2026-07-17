export type PersonnelKind = 'STAFF' | 'TEACHER' | 'EDUCATOR';
export type PersonnelRegistryEntry = {
    id: string;
    kind: PersonnelKind;
    employeeId: string;
    user: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        phone: string | null;
        avatar: string | null;
        isActive: boolean;
    };
    hireDate: string;
    contractType: string | null;
    salary: number | null;
    displayCategory: string;
    displaySubCategory: string | null;
    displayRole: string | null;
    manager: {
        id: string;
        name: string;
    } | null;
    staffCategory?: string;
    supportKind?: string | null;
    jobTitle?: string | null;
    department?: string | null;
    specialization?: string | null;
    jobDescription?: {
        id: string;
        title: string;
        code: string | null;
    } | null;
};
export declare function listPersonnelRegistry(schoolId?: string): Promise<PersonnelRegistryEntry[]>;
//# sourceMappingURL=personnel-registry.util.d.ts.map