import express from 'express';
import openapi from '../openapi/openapi.json';

const router = express.Router();

router.get('/openapi.json', (_req, res) => {
  res.json(openapi);
});

router.get('/docs', (_req, res) => {
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
