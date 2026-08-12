/**
 * Entrée Express pour Vercel Services.
 * Doit s'appeler index.mjs (détecté par @vercel/express) pour que le shim
 * runtime soit émis en .mjs et non en .js (sinon crash ESM → 500 sur /api/*).
 */
import express from 'express';
import { createRequire } from 'node:module';

// Référence pour la détection « imports express » du builder Vercel.
void express;

const require = createRequire(import.meta.url);
const mod = require('./dist/index.js');

export default mod?.default ?? mod;
