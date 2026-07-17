import express from 'express';
import { authorize, type AuthRequest } from '../middleware/auth.middleware';
import digitalLibraryManagementRoutes from './shared/digital-library-management.routes';

const router = express.Router();

/** N’applique l’admin strict qu’aux routes /library (évite de bloquer tout /admin pour le STAFF). */
router.use((req, res, next) => {
  if (!req.path.startsWith('/library')) return next();
  return authorize('ADMIN', 'SUPER_ADMIN')(req as AuthRequest, res, next);
});

router.use(digitalLibraryManagementRoutes);

export default router;
