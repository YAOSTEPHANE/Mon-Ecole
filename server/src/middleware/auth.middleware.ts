import { Request, Response, NextFunction } from 'express';
import type { ParamsFlatDictionary } from 'express-serve-static-core';
import jwt from 'jsonwebtoken';
import {
  PrismaClientInitializationError,
  PrismaClientKnownRequestError,
  PrismaClientUnknownRequestError,
} from '@prisma/client/runtime/library';
import prisma from '../utils/prisma';
import { verifyAccessToken } from '../utils/jwt.util';
import { extractAccessToken } from '../utils/auth-cookie.util';

export interface AuthRequest extends Request<ParamsFlatDictionary> {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

function isPrismaConnectivityError(error: unknown): boolean {
  return (
    error instanceof PrismaClientKnownRequestError ||
    error instanceof PrismaClientUnknownRequestError ||
    error instanceof PrismaClientInitializationError
  );
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = extractAccessToken(req);

    if (!token) {
      return res.status(401).json({ error: 'Token manquant' });
    }

    const decoded = verifyAccessToken(token);

    const user = await prisma.user.findUnique({
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
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: 'Session expirée. Reconnectez-vous.' });
    }
    if (error instanceof jwt.NotBeforeError || error instanceof jwt.JsonWebTokenError) {
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
    const message =
      process.env.NODE_ENV === 'development' && error instanceof Error
        ? error.message
        : 'Erreur serveur';
    return res.status(500).json({ error: message });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Non authentifié' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    next();
  };
};
