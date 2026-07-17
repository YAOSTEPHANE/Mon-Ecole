import type { Request, Response, NextFunction } from 'express';
/**
 * Bloque l’accès anonyme aux pièces d’identité, bulletins d’admission, dossiers RH enseignants.
 * Autorise : jeton signé `?access=` (15 min) ou session Bearer + contrôle métier.
 */
export declare function protectSensitiveUploads(req: Request, res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=protected-uploads.middleware.d.ts.map