import * as esbuild from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Bundle unique pour Vercel Services : le tracing NFT ne suit pas bien
 * un `require('./dist')` et omet dotenv / express / etc.
 * Prisma reste external (binaires natifs).
 */
await esbuild.build({
  absWorkingDir: root,
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outfile: 'vercel-api.cjs',
  logLevel: 'info',
  banner: {
    js: 'var __import_meta_url = require("url").pathToFileURL(__filename).href;',
  },
  define: {
    'import.meta.url': '__import_meta_url',
  },
  external: [
    '@prisma/client',
    '.prisma/client',
    '@prisma/engines',
    '@prisma/engines-version',
  ],
});

console.log('vercel-api.cjs prêt');
