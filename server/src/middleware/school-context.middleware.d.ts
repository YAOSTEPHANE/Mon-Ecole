import { Response, NextFunction } from 'express';
import { type SchoolContextRequest } from '../utils/school-context.util';
/**
 * Résout l’établissement actif (header X-School-Id ou établissement par défaut de l’utilisateur).
 * Les routes publiques peuvent l’utiliser sans authentification (query ?school=slug).
 */
export declare function attachSchoolContext(req: SchoolContextRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/** Contexte optionnel : ne bloque pas si aucun établissement (stats globales super-admin). */
export declare function attachSchoolContextOptional(req: SchoolContextRequest, res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=school-context.middleware.d.ts.map