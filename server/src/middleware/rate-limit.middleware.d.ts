/** Plafond global API (anti scan / flood). */
export declare const apiGlobalLimiter: import("express-rate-limit").RateLimitRequestHandler;
/** Terminaux NFC / reconnaissance faciale (anti brute-force biométrique). */
export declare const deviceBiometricLimiter: import("express-rate-limit").RateLimitRequestHandler;
/** Formulaires publics (pré-inscription, admissions). */
export declare const publicFormLimiter: import("express-rate-limit").RateLimitRequestHandler;
/** Recherche publique de matricule FNE (proxy vers SIGFNE). */
export declare const fneLookupLimiter: import("express-rate-limit").RateLimitRequestHandler;
/**
 * Limite les tentatives de connexion (anti brute-force).
 */
export declare const authLoginLimiter: import("express-rate-limit").RateLimitRequestHandler;
/**
 * Inscription publique (élève / parent).
 */
export declare const authRegisterLimiter: import("express-rate-limit").RateLimitRequestHandler;
/**
 * Demande de lien « mot de passe oublié » (anti abus e-mail / énumération).
 */
export declare const authForgotPasswordLimiter: import("express-rate-limit").RateLimitRequestHandler;
/**
 * Soumission du nouveau mot de passe avec token.
 */
export declare const authResetPasswordLimiter: import("express-rate-limit").RateLimitRequestHandler;
/** Export RGPD (évite abus / charge serveur). */
export declare const gdprExportLimiter: import("express-rate-limit").RateLimitRequestHandler;
/** Demande d’effacement RGPD. */
export declare const gdprErasureRequestLimiter: import("express-rate-limit").RateLimitRequestHandler;
//# sourceMappingURL=rate-limit.middleware.d.ts.map