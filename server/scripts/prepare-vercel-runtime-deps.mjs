/**
 * Bundle API dans dist/vercel-entry.js.
 * Prisma est placé dans dist/lambda-node_modules et requis en relatif
 * pour que NFT l'embarque (includeFiles ne le fait pas).
 */
import * as esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const stubFile = path.join(root, 'vercel-shims', 'dotenv', 'index.js');
fs.mkdirSync(path.dirname(stubFile), { recursive: true });
fs.writeFileSync(
  stubFile,
  `module.exports = { config: () => ({ parsed: {} }), parse: () => ({}), populate: () => {} };\n`,
);

const lambdaNm = path.join(dist, 'lambda-node_modules');
fs.rmSync(lambdaNm, { recursive: true, force: true });
fs.mkdirSync(lambdaNm, { recursive: true });

for (const name of ['@prisma', '.prisma']) {
  const from = path.join(root, 'node_modules', name);
  if (!fs.existsSync(from)) throw new Error(`Manquant node_modules/${name}`);
  fs.cpSync(from, path.join(lambdaNm, name), { recursive: true });
}

const enginesDir = path.join(lambdaNm, '.prisma', 'client');
let engineFile = null;
if (fs.existsSync(enginesDir)) {
  for (const f of fs.readdirSync(enginesDir)) {
    const full = path.join(enginesDir, f);
    if (f.includes('.tmp')) {
      fs.rmSync(full, { force: true });
      continue;
    }
    const isEngine =
      f.includes('libquery_engine') ||
      f.includes('query_engine') ||
      f.endsWith('.node') ||
      f === 'libquery-engine';
    if (!isEngine) continue;
    const keepLinux =
      f.includes('linux') || f.includes('debian') || f.includes('rhel') || f.includes('musl');
    const keepWin = process.env.VERCEL !== '1' && f.includes('windows');
    if (keepLinux || keepWin) {
      if (keepLinux && !engineFile) engineFile = f;
      if (keepWin && !engineFile) engineFile = f;
    } else {
      fs.rmSync(full, { force: true });
    }
  }
}

function dirSizeMb(p) {
  let n = 0;
  if (!fs.existsSync(p)) return 0;
  for (const e of fs.readdirSync(p, { withFileTypes: true })) {
    const full = path.join(p, e.name);
    n += e.isDirectory() ? dirSizeMb(full) * 1024 * 1024 : fs.statSync(full).size;
  }
  return n / (1024 * 1024);
}
console.log(`dist/lambda-node_modules ~${dirSizeMb(lambdaNm).toFixed(1)} MB engine=${engineFile || '?'}`);

/** Petit module CJS voisin : NFT suit ce require depuis vercel-entry.js */
const prismaBridge = path.join(dist, 'prisma-bridge.cjs');
fs.writeFileSync(
  prismaBridge,
  [
    '"use strict";',
    'const fs = require("fs");',
    'const path = require("path");',
    'const Module = require("module");',
    'const deps = path.join(__dirname, "lambda-node_modules");',
    'const tmpNm = path.join("/tmp", "school_prisma_nm");',
    'try {',
    '  if (!fs.existsSync(path.join(tmpNm, "@prisma"))) {',
    '    fs.cpSync(deps, tmpNm, { recursive: true });',
    '  }',
    '} catch (e) {',
    '  console.error("[debug-912306-cp]", e && e.message);',
    '}',
    'const resolveRoots = [tmpNm, deps];',
    'process.env.NODE_PATH = resolveRoots.concat(process.env.NODE_PATH ? process.env.NODE_PATH.split(path.delimiter) : []).join(path.delimiter);',
    'Module._initPaths();',
    'const orig = Module._resolveFilename;',
    'Module._resolveFilename = function (request, parent, isMain, options) {',
    '  if (request === "@prisma/client" || request.startsWith("@prisma/") || request === ".prisma/client" || request.startsWith(".prisma/")) {',
    '    for (const root of resolveRoots) {',
    '      const abs = path.join(root, request);',
    '      const candidates = [abs, abs + ".js", path.join(abs, "index.js"), path.join(abs, "default.js")];',
    '      for (const c of candidates) {',
    '        if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;',
    '      }',
    '      try {',
    '        return orig.call(this, request, parent, isMain, Object.assign({}, options || {}, { paths: [root] }));',
    '      } catch (_) {}',
    '    }',
    '  }',
    '  return orig.call(this, request, parent, isMain, options);',
    '};',
    'console.log("[debug-912306]", JSON.stringify({sessionId:"912306",runId:"post-fix",hypothesisId:"H12",location:"prisma-bridge",message:"bridge resolve",data:{tmpExists:fs.existsSync(path.join(tmpNm,"@prisma")),dotPrisma:fs.existsSync(path.join(tmpNm,".prisma","client","default.js"))},timestamp:Date.now()}));',
    'module.exports = require("@prisma/client");',
    '',
  ].join('\n'),
);

const enginePathExpr = engineFile
  ? `path.join(__dirname, "lambda-node_modules", ".prisma", "client", ${JSON.stringify(engineFile)})`
  : 'null';

const banner = [
  'false && require("express");',
  'var __import_meta_url = require("url").pathToFileURL(__filename).href;',
  '(function () {',
  '  var fs = require("fs");',
  '  var path = require("path");',
  '  var deps = path.join(__dirname, "lambda-node_modules");',
  '  var engine = ' + enginePathExpr + ';',
  '  if (engine && fs.existsSync(engine)) {',
  '    process.env.PRISMA_QUERY_ENGINE_LIBRARY = engine;',
  '  }',
  '  console.log("[debug-912306]", JSON.stringify({sessionId:"912306",runId:"post-fix",hypothesisId:"H11",location:"bundle:boot",message:"prisma bridge",data:{depsExists:fs.existsSync(deps),bridgeExists:fs.existsSync(path.join(__dirname,"prisma-bridge.cjs")),engine:engine,engineExists:engine?fs.existsSync(engine):false,listing:fs.existsSync(deps)?fs.readdirSync(deps):[]},timestamp:Date.now()}));',
  '  // Require relatif → NFT embarque dist/lambda-node_modules',
  '  require("./prisma-bridge.cjs");',
  '  console.log("[debug-912306-prisma-ok]");',
  '})();',
].join('\n');

await esbuild.build({
  absWorkingDir: root,
  entryPoints: ['src/vercel-entry.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outfile: 'dist/vercel-entry.js',
  logLevel: 'info',
  external: ['@prisma/client', '.prisma/client', 'prisma', 'fsevents', './prisma-bridge.cjs'],
  alias: { dotenv: stubFile },
  banner: { js: banner },
  footer: { js: 'module.exports = module.exports.default || module.exports;' },
  define: { 'import.meta.url': '__import_meta_url' },
});

fs.copyFileSync(path.join(dist, 'vercel-entry.js'), path.join(root, 'index.cjs'));
// index.cjs au root doit aussi résoudre ./prisma-bridge — copier les assets à côté
const rootBridge = path.join(root, 'prisma-bridge.cjs');
const rootLambda = path.join(root, 'lambda-node_modules');
fs.copyFileSync(prismaBridge, rootBridge);
fs.rmSync(rootLambda, { recursive: true, force: true });
fs.cpSync(lambdaNm, rootLambda, { recursive: true });

console.log(
  `bundle ${(fs.statSync(path.join(root, 'index.cjs')).size / (1024 * 1024)).toFixed(2)} MB`,
);

fs.writeFileSync(
  path.join(dist, 'index.js'),
  '"use strict";\nfalse && require("express");\nmodule.exports = require("./vercel-entry.js");\n',
);

fs.writeFileSync(
  path.join(root, 'vercel-api.cjs'),
  'false && require("express");\nmodule.exports = require("./index.cjs");\n',
);

console.log('prepare-vercel: prêt (NFT via prisma-bridge.cjs)');
