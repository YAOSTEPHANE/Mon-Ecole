/**
 * JWT d’accès : HS256, secret fort en prod, tokenVersion pour révocation.
 */
import jwt, { type SignOptions } from 'jsonwebtoken';

const DEV_FALLBACK = 'dev-jwt-secret-change-in-production';
const WEAK_SECRETS = new Set(['', 'secret', DEV_FALLBACK]);

function jwtSecret(): string {
  const raw = (process.env.JWT_SECRET ?? '').trim();
  const isProd = process.env.NODE_ENV === 'production';

  if (isProd) {
    if (!raw || WEAK_SECRETS.has(raw) || raw.length < 32) {
      throw new Error(
        'JWT_SECRET doit être défini en production, être unique et faire au moins 32 caractères.',
      );
    }
    return raw;
  }

  return raw.length > 0 ? raw : DEV_FALLBACK;
}

function expiresInOption(): SignOptions['expiresIn'] {
  const raw = (process.env.JWT_EXPIRES_IN ?? '12h').trim();
  return (raw.length > 0 ? raw : '12h') as SignOptions['expiresIn'];
}

/** À appeler au démarrage du serveur pour échouer tôt si la config JWT est invalide. */
export function ensureJwtConfiguration(): void {
  jwtSecret();
}

export type JwtAccessPayload = {
  userId: string;
  email: string;
  role: string;
  /** Absent sur anciens jetons → traité comme 0 */
  tokenVersion: number;
};

export const generateToken = (
  userId: string,
  email: string,
  role: string,
  tokenVersion = 0,
): string => {
  const options: SignOptions = { expiresIn: expiresInOption() };
  return jwt.sign(
    {
      userId: String(userId),
      email: String(email),
      role: String(role),
      tokenVersion: Number.isFinite(tokenVersion) ? Math.max(0, Math.floor(tokenVersion)) : 0,
    },
    jwtSecret(),
    { ...options, algorithm: 'HS256' },
  );
};

export const verifyToken = (token: string) => {
  return jwt.verify(token, jwtSecret(), { algorithms: ['HS256'] });
};

/** Matériel de signature pour jetons d’accès fichiers (dérivé du secret JWT). */
export function uploadAccessSigningMaterial(): string {
  return jwtSecret();
}

/** Vérifie un JWT d’accès et retourne un payload typé (sinon lève). */
export function verifyAccessToken(token: string): JwtAccessPayload {
  const decoded = verifyToken(token);
  if (typeof decoded === 'string' || !decoded || typeof decoded !== 'object') {
    throw new Error('Token invalide');
  }
  const d = decoded as Record<string, unknown>;
  if (typeof d.userId !== 'string' || typeof d.email !== 'string' || typeof d.role !== 'string') {
    throw new Error('Token invalide');
  }
  const tv =
    typeof d.tokenVersion === 'number' && Number.isFinite(d.tokenVersion)
      ? Math.floor(d.tokenVersion)
      : 0;
  return { userId: d.userId, email: d.email, role: d.role, tokenVersion: tv };
}
