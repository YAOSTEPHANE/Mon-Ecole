export type FacePersonType = 'STUDENT' | 'TEACHER' | 'STAFF';
export type FaceMatchResult = {
    personType: FacePersonType;
    personId: string;
    displayName: string;
    distance: number;
    employeeOrStudentCode?: string | null;
};
export declare function parseFaceDescriptor(raw: unknown): number[];
export declare function euclideanDistance(a: number[], b: number[]): number;
/** Retourne la meilleure correspondance sous le seuil, ou null. */
export declare function findBestFaceMatch(probe: number[], options?: {
    personType?: FacePersonType;
}): Promise<FaceMatchResult | null>;
export declare function countFaceEnrollments(): Promise<{
    students: number;
    teachers: number;
    staff: number;
    total: number;
}>;
export declare function saveFaceDescriptor(personType: FacePersonType, personId: string, descriptor: number[]): Promise<void>;
export declare function clearFaceDescriptor(personType: FacePersonType, personId: string): Promise<void>;
//# sourceMappingURL=face-recognition.util.d.ts.map