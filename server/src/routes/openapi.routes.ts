import express from 'express';
import openapi from '../openapi/openapi.json';
import { authenticate, authorize, type AuthRequest } from '../middleware/auth.middleware';

const router = express.Router();

function openApiPubliclyEnabled(): boolean {
  const raw = process.env.OPENAPI_PUBLIC?.trim().toLowerCase();
  if (raw) return ['1', 'true', 'yes', 'on'].includes(raw);
  return process.env.NODE_ENV !== 'production';
}

function requireOpenApiAccess(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
): void {
  if (openApiPubliclyEnabled()) {
    next();
    return;
  }
  void authenticate(req as AuthRequest, res, () =>
    authorize('SUPER_ADMIN')(req as AuthRequest, res, next),
  );
}

router.get('/openapi.json', requireOpenApiAccess, (_req, res) => {
  res.setHeader('Cache-Control', 'private, no-store');
  res.json(openapi);
});

router.get('/docs', requireOpenApiAccess, (_req, res) => {
  res.type('html').send(`<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>API École à jour</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 720px; margin: 2rem auto; padding: 0 1rem; color: #1c1917; }
    a { color: #b45309; }
    code { background: #f5f5f4; padding: 0.15rem 0.35rem; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>Documentation API</h1>
  <p>Spécification OpenAPI 3 disponible en JSON :</p>
  <p><a href="./openapi.json"><code>/api/openapi.json</code></a></p>
  <p>Importer ce fichier dans Postman, Insomnia ou Swagger UI.</p>
</body>
</html>`);
});

export default router;
