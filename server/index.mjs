/**
 * Ancien entry ESM — désactivé : @vercel/express privilégie index.cjs.
 * Conservé pour ne pas casser d'anciens scripts locaux éventuels.
 */
import express from 'express';
import { createRequire } from 'node:module';

void express;

const require = createRequire(import.meta.url);
const mod = require('./vercel-api.bundle.cjs');

export default mod?.default ?? mod;
