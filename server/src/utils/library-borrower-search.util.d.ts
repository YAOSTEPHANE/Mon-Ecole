export declare function searchLibraryBorrowers(q: string): Promise<{
    email: string;
    firstName: string;
    id: string;
    lastName: string;
    role: import(".prisma/client").$Enums.Role;
    staffProfile: {
        jobTitle: string | null;
    } | null;
    studentProfile: {
        class: {
            level: string;
            name: string;
        } | null;
        studentId: string;
    } | null;
    teacherProfile: {
        employeeId: string;
    } | null;
}[]>;
//# sourceMappingURL=library-borrower-search.util.d.ts.map