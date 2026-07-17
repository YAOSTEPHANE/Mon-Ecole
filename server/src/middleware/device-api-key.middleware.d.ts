import type { Request, Response, NextFunction } from 'express';
/**
 * Authentifie un terminal de pointage (NFC / visage) via X-NFC-API-Key.
 * En production, la clé dans l’URL (?apiKey) est refusée (fuite dans logs / historique).
 */
export declare function verifyDeviceApiKey(req: Request, res: Response, next: NextFunction): void;
//# sourceMappingURL=device-api-key.middleware.d.ts.map