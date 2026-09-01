import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.util';
import { extractAccessToken } from '../utils/auth-cookie.util';

/**
 * Middleware de protection des uploads sensibles (documents d'identité, admission).
 * Vérifie l'authentification avant de servir les fichiers sensibles.
 * 
 * Les chemins protégés :
 * - /uploads/identity-documents/* (CNI, passeport, etc.)
 * - /uploads/admission-documents/* (diplômes, dossiers)
 * 
 * Autres documents (avatars, etc.) restent publics.
 */

export async function protectSensitiveUploads(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const path = req.path || req.url || '';

    // Chemins à protéger strictement
    const sensitivePatterns = [
      '/identity-documents/',
      '/admission-documents/',
      '/medical-records/',
      '/emergency-contacts/',
    ];

    const isSensitive = sensitivePatterns.some((pattern) =>
      path.includes(pattern)
    );

    if (!isSensitive) {
      // Fichier public — continuer
      return next();
    }

    // Fichier sensible — vérifier l'authentification
    const token = extractAccessToken(req);
    if (!token) {
      console.warn(
        `[Protected Upload] Tentative d'accès sans auth: ${path}`
      );
      return res.status(401).json({ error: 'Authentification requise' });
    }

    try {
      const payload = verifyAccessToken(token);

      // Contrôle d'accès basique :
      // - L'utilisateur peut accéder à ses propres documents
      // - Les admins peuvent accéder à tous
      // TODO: Implémenter contrôle granulaire (studentId, etc.)

      if (
        payload.role !== 'ADMIN' &&
        payload.role !== 'SUPER_ADMIN' &&
        payload.role !== 'PARENT' &&
        payload.role !== 'STUDENT'
      ) {
        console.warn(
          `[Protected Upload] Rôle non autorisé: ${payload.role} (${payload.email})`
        );
        return res.status(403).json({ error: 'Accès non autorisé' });
      }

      // Authentification valide — continuer
      next();
    } catch (err) {
      console.warn(
        `[Protected Upload] Token invalide ou expiré: ${err instanceof Error ? err.message : err}`
      );
      return res.status(401).json({ error: 'Token invalide ou expiré' });
    }
  } catch (error) {
    console.error('[Protected Upload] Erreur:', error);
    res.status(500).json({ error: 'Erreur vérification accès' });
  }
}
