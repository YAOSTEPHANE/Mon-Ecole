import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Empêche Node de traiter dist/*.js comme ESM quand le package racine a "type":"module". */
const distDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
fs.mkdirSync(distDir, { recursive: true });
fs.writeFileSync(
  path.join(distDir, 'package.json'),
  `${JSON.stringify({ type: 'commonjs' }, null, 2)}\n`,
);
