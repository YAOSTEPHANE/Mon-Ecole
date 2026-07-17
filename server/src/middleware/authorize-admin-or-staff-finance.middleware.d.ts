import type { Response, NextFunction } from 'express';
import type { AuthRequest } from './auth.middleware';
/**
 * Autorise ADMIN / SUPER_ADMIN, ou STAFF dont un module visible couvre la route /admin demandée.
 */
export declare function authorizeAdminOrStaffFinance(req: AuthRequest, res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=authorize-admin-or-staff-finance.middleware.d.ts.map