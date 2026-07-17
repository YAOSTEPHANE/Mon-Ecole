type CreateLoansInput = {
    bookIds: string[];
    borrowerId: string;
    dueDate: Date;
    notes?: string | null;
    createdById?: string | null;
};
export declare function createLibraryLoansBatch(input: CreateLoansInput): Promise<{
    id: string;
    bookId: string;
    borrowerId: string;
    status: import(".prisma/client").$Enums.LibraryLoanStatus;
    loanedAt: Date;
    dueDate: Date;
    returnedAt: Date | null;
    notes: string | null;
    createdById: string | null;
}[]>;
export {};
//# sourceMappingURL=library-create-loans.util.d.ts.map