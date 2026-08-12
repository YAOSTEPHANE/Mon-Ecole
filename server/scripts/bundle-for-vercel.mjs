/**
 * Génère index.cjs = bundle Express complet pour @vercel/express.
 * Un fichier séparé vercel-api.bundle.cjs n'était pas chargé au runtime
 * (/var/task utilisait dist/*.js → modules npm absents).
 */
import * as esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const stubDir = path.join(root, 'vercel-shims', 'dotenv');
const stubFile = path.join(stubDir, 'index.js');

fs.mkdirSync(stubDir, { recursive: true });
fs.writeFileSync(
  stubFile,
  `module.exports = { config: () => ({ parsed: {} }), parse: () => ({}), populate: () => {} };\n`,
);
fs.writeFileSync(
  path.join(stubDir, 'package.json'),
  `${JSON.stringify({ name: 'dotenv', version: '0.0.0-stub', main: 'index.js' }, null, 2)}\n`,
);

await esbuild.build({
  absWorkingDir: root,
  entryPoints: ['src/vercel-entry.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outfile: 'index.cjs',
  logLevel: 'info',
  external: ['@prisma/client', '.prisma/client', 'prisma', 'fsevents'],
  alias: {
    dotenv: stubFile,
  },
  banner: {
    js: [
      'var __import_meta_url = require("url").pathToFileURL(__filename).href;',
      'require("express");',
      'var __vercel_mod = null;',
    ].join('\n'),
  },
  footer: {
    // esbuild CJS may set exports.default; Vercel needs the Express app.
    js: 'module.exports = module.exports.default || module.exports;',
  },
  define: {
    'import.meta.url': '__import_meta_url',
  },
});

// Thin wrappers kept for older vercel.json entrypoints / local probes.
const thin = [
  '/** Auto-généré : redirige vers index.cjs (bundle). */',
  'require("express");',
  'module.exports = require("./index.cjs");',
  '',
].join('\n');
fs.writeFileSync(path.join(root, 'vercel-api.cjs'), thin);

const out = path.join(root, 'index.cjs');
const sizeMb = (fs.statSync(out).size / (1024 * 1024)).toFixed(2);
console.log(`index.cjs bundle prêt (${sizeMb} MB)`);
