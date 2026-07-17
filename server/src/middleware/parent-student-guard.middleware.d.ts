import type { Response, NextFunction } from 'express';
import type { AuthRequest } from './auth.middleware';
export type ParentAuthRequest = AuthRequest & {
    parentId?: string;
};
/** Vérifie que le parent connecté est bien lié à l’élève :studentId. */
export declare function guardParentOwnsStudentParam(req: ParentAuthRequest, res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=parent-student-guard.middleware.d.ts.map