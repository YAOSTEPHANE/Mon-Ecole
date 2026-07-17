import type { Prisma, PrismaClient, Role } from '@prisma/client';
type Db = PrismaClient | Prisma.TransactionClient;
export declare function listPendingCashPayments(client?: Db, schoolId?: string): Promise<({
    payer: {
        email: string;
        firstName: string;
        id: string;
        lastName: string;
        role: import(".prisma/client").$Enums.Role;
    };
    student: {
        class: {
            level: string;
            name: string;
        } | null;
        user: {
            email: string;
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        userId: string;
        studentId: string;
        nfcId: string | null;
        biometricId: string | null;
        faceDescriptor: Prisma.JsonValue | null;
        faceEnrolledAt: Date | null;
        dateOfBirth: Date;
        birthPlace: string | null;
        isRepeating: boolean;
        gender: import(".prisma/client").$Enums.Gender;
        address: string | null;
        emergencyContact: string | null;
        emergencyPhone: string | null;
        emergencyContact2: string | null;
        emergencyPhone2: string | null;
        medicalInfo: string | null;
        allergies: string | null;
        specialNeeds: string | null;
        nationalMatricule: string | null;
        digitalCardPublicId: string | null;
        archivedAt: Date | null;
        lastReenrollmentAt: Date | null;
        enrollmentDate: Date;
        enrollmentStatus: import(".prisma/client").$Enums.EnrollmentStatus;
        isActive: boolean;
        schoolId: string | null;
        createdAt: Date;
        updatedAt: Date;
        classId: string | null;
        classGroupId: string | null;
        stateAssignment: string | null;
    };
    tuitionFee: {
        academicYear: string;
        amount: number;
        period: string;
    };
} & {
    id: string;
    tuitionFeeId: string;
    studentId: string;
    payerId: string;
    payerRole: import(".prisma/client").$Enums.Role;
    amount: number;
    paymentMethod: import(".prisma/client").$Enums.PaymentMethod;
    status: import(".prisma/client").$Enums.PaymentStatus;
    transactionId: string | null;
    paymentReference: string | null;
    receiptUrl: string | null;
    notes: string | null;
    paidAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
})[]>;
export declare function validateCashPayment(client: Db, paymentId: string, validator: {
    id: string;
    role: Role;
    name: string;
}, schoolId?: string): Promise<{
    payer: {
        email: string;
        firstName: string;
        id: string;
        lastName: string;
        role: import(".prisma/client").$Enums.Role;
    };
    student: {
        class: {
            level: string;
            name: string;
        } | null;
        user: {
            email: string;
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        userId: string;
        studentId: string;
        nfcId: string | null;
        biometricId: string | null;
        faceDescriptor: Prisma.JsonValue | null;
        faceEnrolledAt: Date | null;
        dateOfBirth: Date;
        birthPlace: string | null;
        isRepeating: boolean;
        gender: import(".prisma/client").$Enums.Gender;
        address: string | null;
        emergencyContact: string | null;
        emergencyPhone: string | null;
        emergencyContact2: string | null;
        emergencyPhone2: string | null;
        medicalInfo: string | null;
        allergies: string | null;
        specialNeeds: string | null;
        nationalMatricule: string | null;
        digitalCardPublicId: string | null;
        archivedAt: Date | null;
        lastReenrollmentAt: Date | null;
        enrollmentDate: Date;
        enrollmentStatus: import(".prisma/client").$Enums.EnrollmentStatus;
        isActive: boolean;
        schoolId: string | null;
        createdAt: Date;
        updatedAt: Date;
        classId: string | null;
        classGroupId: string | null;
        stateAssignment: string | null;
    };
    tuitionFee: {
        academicYear: string;
        amount: number;
        period: string;
    };
} & {
    id: string;
    tuitionFeeId: string;
    studentId: string;
    payerId: string;
    payerRole: import(".prisma/client").$Enums.Role;
    amount: number;
    paymentMethod: import(".prisma/client").$Enums.PaymentMethod;
    status: import(".prisma/client").$Enums.PaymentStatus;
    transactionId: string | null;
    paymentReference: string | null;
    receiptUrl: string | null;
    notes: string | null;
    paidAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}>;
export declare function rejectCashPayment(client: Db, paymentId: string, validator: {
    name: string;
}, reason?: string, schoolId?: string): Promise<{
    payer: {
        email: string;
        firstName: string;
        id: string;
        lastName: string;
        role: import(".prisma/client").$Enums.Role;
    };
    student: {
        class: {
            level: string;
            name: string;
        } | null;
        user: {
            email: string;
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        userId: string;
        studentId: string;
        nfcId: string | null;
        biometricId: string | null;
        faceDescriptor: Prisma.JsonValue | null;
        faceEnrolledAt: Date | null;
        dateOfBirth: Date;
        birthPlace: string | null;
        isRepeating: boolean;
        gender: import(".prisma/client").$Enums.Gender;
        address: string | null;
        emergencyContact: string | null;
        emergencyPhone: string | null;
        emergencyContact2: string | null;
        emergencyPhone2: string | null;
        medicalInfo: string | null;
        allergies: string | null;
        specialNeeds: string | null;
        nationalMatricule: string | null;
        digitalCardPublicId: string | null;
        archivedAt: Date | null;
        lastReenrollmentAt: Date | null;
        enrollmentDate: Date;
        enrollmentStatus: import(".prisma/client").$Enums.EnrollmentStatus;
        isActive: boolean;
        schoolId: string | null;
        createdAt: Date;
        updatedAt: Date;
        classId: string | null;
        classGroupId: string | null;
        stateAssignment: string | null;
    };
    tuitionFee: {
        academicYear: string;
        amount: number;
        period: string;
    };
} & {
    id: string;
    tuitionFeeId: string;
    studentId: string;
    payerId: string;
    payerRole: import(".prisma/client").$Enums.Role;
    amount: number;
    paymentMethod: import(".prisma/client").$Enums.PaymentMethod;
    status: import(".prisma/client").$Enums.PaymentStatus;
    transactionId: string | null;
    paymentReference: string | null;
    receiptUrl: string | null;
    notes: string | null;
    paidAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}>;
export type PendingCashPaymentRow = Awaited<ReturnType<typeof listPendingCashPayments>>[number];
export {};
//# sourceMappingURL=cash-payment-validation.util.d.ts.map