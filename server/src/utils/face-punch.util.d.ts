import type { FaceMatchResult } from './face-recognition.util';
export type FacePunchResult = {
    success: true;
    message: string;
    personType: FaceMatchResult['personType'];
    punchPhase: string;
    match: FaceMatchResult;
    data: Record<string, unknown>;
};
export declare function executeFacePunch(params: {
    match: FaceMatchResult;
    courseId?: string;
    at?: Date;
    notifyParents?: boolean;
    recordedByUserId?: string;
}): Promise<FacePunchResult>;
//# sourceMappingURL=face-punch.util.d.ts.map