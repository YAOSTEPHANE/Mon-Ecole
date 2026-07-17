"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = exports.generateToken = void 0;
exports.ensureJwtConfiguration = ensureJwtConfiguration;
exports.uploadAccessSigningMaterial = uploadAccessSigningMaterial;
exports.verifyAccessToken = verifyAccessToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const DEV_FALLBACK = 'dev-jwt-secret-change-in-production';
const WEAK_SECRETS = new Set(['', 'secret', DEV_FALLBACK]);
function jwtSecret() {
    const raw = (process.env.JWT_SECRET ?? '').trim();
    const isProd = process.env.NODE_ENV === 'production';
    if (isProd) {
        if (!raw || WEAK_SECRETS.has(raw) || raw.length < 32) {
            throw new Error('JWT_SECRET doit être défini en production, être unique et faire au moins 32 caractères.');
        }
        return raw;
    }
    return raw.length > 0 ? raw : DEV_FALLBACK;
}
function expiresInOption() {
    const raw = (process.env.JWT_EXPIRES_IN ?? '7d').trim();
    return (raw.length > 0 ? raw : '7d');
}
/** À appeler au démarrage du serveur pour échouer tôt si la config JWT est invalide. */
function ensureJwtConfiguration() {
    jwtSecret();
}
const generateToken = (userId, email, role) => {
    const options = { expiresIn: expiresInOption() };
    return jsonwebtoken_1.default.sign({
        userId: String(userId),
        email: String(email),
        role: String(role),
    }, jwtSecret(), { ...options, algorithm: 'HS256' });
};
exports.generateToken = generateToken;
const verifyToken = (token) => {
    return jsonwebtoken_1.default.verify(token, jwtSecret(), { algorithms: ['HS256'] });
};
exports.verifyToken = verifyToken;
/** Matériel de signature pour jetons d’accès fichiers (dérivé du secret JWT). */
function uploadAccessSigningMaterial() {
    return jwtSecret();
}
/** Vérifie un JWT d’accès et retourne un payload typé (sinon lève). */
function verifyAccessToken(token) {
    const decoded = (0, exports.verifyToken)(token);
    if (typeof decoded === 'string' || !decoded || typeof decoded !== 'object') {
        throw new Error('Token invalide');
    }
    const d = decoded;
    if (typeof d.userId !== 'string' || typeof d.email !== 'string' || typeof d.role !== 'string') {
        throw new Error('Token invalide');
    }
    return { userId: d.userId, email: d.email, role: d.role };
}
//# sourceMappingURL=jwt.util.js.map