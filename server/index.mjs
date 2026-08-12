/**
 * Entrée Express pour Vercel Services.
 * Le package a "type":"module" pour que le shim `__vc_service_vc_init.js` (ESM)
 * soit accepté ; dist/ reste CommonJS via dist/package.json.
 */
import express from 'express';
import { createRequire } from 'node:module';

// Détection @vercel/express (imports express).
void express;

const require = createRequire(import.meta.url);
const mod = require('./dist/index.js');

export default mod?.default ?? mod;
