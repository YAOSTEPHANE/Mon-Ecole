import type { Response, NextFunction } from 'express';
import type { SchoolContextRequest } from '../utils/school-context.util';
/** Vérifie que le parent ciblé appartient à l’établissement actif (:id ou :parentId). */
export declare function guardAdminParentRoute(req: SchoolContextRequest, res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=admin-parent-school-guard.middleware.d.ts.map