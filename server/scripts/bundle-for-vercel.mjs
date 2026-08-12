import * as esbuild from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Bundle léger pour Vercel Services (sans Socket.IO / jobs).
 * Prisma reste external (binaires natifs).
 */
await esbuild.build({
  absWorkingDir: root,
  entryPoints: ['src/vercel-entry.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outfile: 'vercel-api.cjs',
  minify: true,
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
