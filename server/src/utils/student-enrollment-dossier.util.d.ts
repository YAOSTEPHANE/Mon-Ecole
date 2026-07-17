export type StudentEnrollmentDossierPayload = {
    generatedAt: string;
    school: {
        name: string;
        address?: string | null;
        phone?: string | null;
        email?: string | null;
        principalName?: string | null;
        schoolCode?: string | null;
        motto?: string | null;
        logoUrl?: string | null;
    } | null;
    student: {
        id: string;
        studentId: string;
        enrollmentDate: string;
        enrollmentStatus: string;
        stateAssignment?: string | null;
        dateOfBirth: string;
        birthPlace?: string | null;
        isRepeating?: boolean;
        gender: string;
        address?: string | null;
        emergencyContact?: string | null;
        emergencyPhone?: string | null;
        emergencyContact2?: string | null;
        emergencyPhone2?: string | null;
        medicalInfo?: string | null;
        allergies?: string | null;
        specialNeeds?: string | null;
    };
    user: {
        firstName: string;
        lastName: string;
        email: string;
        phone?: string | null;
    };
    class: {
        name: string;
        level: string;
        academicYear: string;
        trackName?: string | null;
    } | null;
    subjectOptions: {
        name: string;
        code?: string | null;
    }[];
    parents: {
        relation?: string | null;
        firstName: string;
        lastName: string;
        email?: string | null;
        phone?: string | null;
    }[];
    admission: {
        reference: string;
        desiredLevel?: string | null;
        academicYear?: string | null;
        previousSchool?: string | null;
        motivation?: string | null;
        parentName?: string | null;
        parentPhone?: string | null;
        parentEmail?: string | null;
        gradeTerm1?: number | null;
        gradeTerm2?: number | null;
        gradeAnnualGeneral?: number | null;
        gradeAnnualSpecific?: number | null;
        gradeAnnualLiterary?: number | null;
        term3ReportCardOriginalName?: string | null;
        reviewedAt?: string | null;
    } | null;
    identityDocuments: {
        type: string;
        typeLabel: string;
        label?: string | null;
        originalName: string;
        createdAt: string;
    }[];
    digitalCard: {
        cardPageUrl: string;
        qrDataUrl: string;
    } | null;
};
export declare function buildStudentEnrollmentDossierPayload(studentId: string): Promise<StudentEnrollmentDossierPayload | null>;
//# sourceMappingURL=student-enrollment-dossier.util.d.ts.map