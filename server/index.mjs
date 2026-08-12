/**
 * Entrée Vercel Services (ESM) : "type":"module" valide le shim runtime.
 * Le handler applicatif est pré-bundlé en CommonJS (vercel-api.cjs).
 */
import express from 'express';
import { createRequire } from 'node:module';

// Détection framework @vercel/express
void express;

const require = createRequire(import.meta.url);
const mod = require('./vercel-api.cjs');

export default mod?.default ?? mod;
