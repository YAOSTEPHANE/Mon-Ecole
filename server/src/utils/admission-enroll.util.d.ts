import type { Request } from 'express';
import type { ParentEnrollmentResult } from './parent-account-from-enrollment.util';
export type EnrollFromAdmissionBody = {
    password?: string;
    studentId?: string;
    classId?: string;
    stateAssignment?: 'STATE_ASSIGNED' | 'NOT_STATE_ASSIGNED';
    address?: string;
    emergencyContact?: string;
    emergencyPhone?: string;
    medicalInfo?: string;
};
export type EnrollFromAdmissionResult = {
    message: string;
    user: Record<string, unknown>;
    reference: string;
    passwordSetupEmailSent: boolean;
    parentAccount?: ParentEnrollmentResult;
};
/**
 * Crée le compte élève à partir d’un dossier de pré-inscription accepté.
 */
export declare function enrollStudentFromAdmission(admissionId: string, reviewerUserId: string, body: EnrollFromAdmissionBody, req?: Pick<Request, 'ip' | 'socket' | 'get'>, contextSchoolId?: string): Promise<EnrollFromAdmissionResult>;
//# sourceMappingURL=admission-enroll.util.d.ts.map