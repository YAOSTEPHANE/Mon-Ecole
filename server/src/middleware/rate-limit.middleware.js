"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.gdprErasureRequestLimiter = exports.gdprExportLimiter = exports.authResetPasswordLimiter = exports.authForgotPasswordLimiter = exports.authRegisterLimiter = exports.authLoginLimiter = exports.fneLookupLimiter = exports.publicFormLimiter = exports.deviceBiometricLimiter = exports.apiGlobalLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const isProd = process.env.NODE_ENV === 'production';
/** Plafond global API (anti scan / flood). */
exports.apiGlobalLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: isProd ? 2000 : 20000,
    message: { error: 'Trop de requêtes. Réessayez plus tard.' },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        const p = req.path || '';
        return p.endsWith('/health') || p === '/health';
    },
});
/** Terminaux NFC / reconnaissance faciale (anti brute-force biométrique). */
exports.deviceBiometricLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: isProd ? 45 : 500,
    message: { error: 'Trop de tentatives de pointage. Patientez une minute.' },
    standardHeaders: true,
    legacyHeaders: false,
});
/** Formulaires publics (pré-inscription, admissions). */
exports.publicFormLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000,
    max: isProd ? 40 : 500,
    message: { error: 'Trop de soumissions depuis cette adresse. Réessayez plus tard.' },
    standardHeaders: true,
    legacyHeaders: false,
});
/** Recherche publique de matricule FNE (proxy vers SIGFNE). */
exports.fneLookupLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000,
    max: isProd ? 30 : 300,
    message: { error: 'Trop de recherches de matricule depuis cette adresse. Réessayez plus tard.' },
    standardHeaders: true,
    legacyHeaders: false,
});
/**
 * Limite les tentatives de connexion (anti brute-force).
 */
exports.authLoginLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: isProd ? 20 : 300,
    message: { error: 'Trop de tentatives de connexion. Réessayez dans quelques minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
});
/**
 * Inscription publique (élève / parent).
 */
exports.authRegisterLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000,
    max: isProd ? 15 : 200,
    message: { error: 'Trop de créations de compte depuis cette adresse. Réessayez plus tard.' },
    standardHeaders: true,
    legacyHeaders: false,
});
/**
 * Demande de lien « mot de passe oublié » (anti abus e-mail / énumération).
 */
exports.authForgotPasswordLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000,
    max: isProd ? 8 : 100,
    message: { error: 'Trop de demandes de réinitialisation. Réessayez plus tard.' },
    standardHeaders: true,
    legacyHeaders: false,
});
/**
 * Soumission du nouveau mot de passe avec token.
 */
exports.authResetPasswordLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000,
    max: isProd ? 25 : 200,
    message: { error: 'Trop de tentatives. Réessayez plus tard.' },
    standardHeaders: true,
    legacyHeaders: false,
});
/** Export RGPD (évite abus / charge serveur). */
exports.gdprExportLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000,
    max: isProd ? 12 : 200,
    message: { error: 'Trop de demandes d’export. Réessayez dans une heure.' },
    standardHeaders: true,
    legacyHeaders: false,
});
/** Demande d’effacement RGPD. */
exports.gdprErasureRequestLimiter = (0, express_rate_limit_1.default)({
    windowMs: 24 * 60 * 60 * 1000,
    max: isProd ? 5 : 100,
    message: { error: 'Limite de demandes d’effacement atteinte. Réessayez plus tard.' },
    standardHeaders: true,
    legacyHeaders: false,
});
//# sourceMappingURL=rate-limit.middleware.js.map