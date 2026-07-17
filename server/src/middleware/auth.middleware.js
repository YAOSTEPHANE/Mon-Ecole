"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = exports.authenticate = void 0;
const jsonwebtoken_1 = require("jsonwebtoken");
const library_1 = require("@prisma/client/runtime/library");
const prisma_1 = __importDefault(require("../utils/prisma"));
const jwt_util_1 = require("../utils/jwt.util");
function isPrismaConnectivityError(error) {
    return (error instanceof library_1.PrismaClientKnownRequestError ||
        error instanceof library_1.PrismaClientUnknownRequestError ||
        error instanceof library_1.PrismaClientInitializationError);
}
const authenticate = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Token manquant' });
        }
        const decoded = (0, jwt_util_1.verifyAccessToken)(token);
        const user = await prisma_1.default.user.findUnique({
            where: { id: decoded.userId },
            select: { id: true, email: true, role: true, isActive: true },
        });
        if (!user || !user.isActive) {
            return res.status(401).json({ error: 'Utilisateur non autorisé' });
        }
        req.user = {
            id: user.id,
            email: user.email,
            role: user.role,
        };
        next();
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.TokenExpiredError) {
            return res.status(401).json({ error: 'Session expirée. Reconnectez-vous.' });
        }
        if (error instanceof jsonwebtoken_1.NotBeforeError || error instanceof jsonwebtoken_1.JsonWebTokenError) {
            return res.status(401).json({ error: 'Token invalide' });
        }
        if (error instanceof Error && error.message === 'Token invalide') {
            return res.status(401).json({ error: 'Token invalide' });
        }
        if (isPrismaConnectivityError(error)) {
            console.error('Erreur base de données (authenticate):', error);
            return res.status(503).json({ error: 'Service temporairement indisponible' });
        }
        console.error('Erreur inattendue (authenticate):', error);
        const message = process.env.NODE_ENV === 'development' && error instanceof Error
            ? error.message
            : 'Erreur serveur';
        return res.status(500).json({ error: message });
    }
};
exports.authenticate = authenticate;
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Non authentifié' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Accès refusé' });
        }
        next();
    };
};
exports.authorize = authorize;
//# sourceMappingURL=auth.middleware.js.map