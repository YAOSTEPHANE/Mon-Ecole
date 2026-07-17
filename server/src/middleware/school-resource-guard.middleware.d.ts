import type { Response, NextFunction } from 'express';
import type { SchoolContextRequest } from '../utils/school-context.util';
/** Vérifie que :id ou :studentId désigne un élève de l’établissement actif (routes admin). */
export declare function guardAdminStudentRoute(req: SchoolContextRequest, res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=school-resource-guard.middleware.d.ts.map