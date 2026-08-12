/**
 * Entrée Vercel (experimental Express service).
 * Extension .mjs pour que le shim `__vc_service_vc_init` soit aussi en ESM (.mjs),
 * sinon Node charge un shim ESM en .js comme du CommonJS → crash 500 sur toutes les routes /api.
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const mod = require('./dist/index.js');

export default mod?.default ?? mod;
