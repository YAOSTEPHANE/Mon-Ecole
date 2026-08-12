/**
 * Entrée Express CommonJS pour Vercel Services.
 * Le shim runtime Vercel (`__vc_service_vc_init`) doit être en CJS : un entry
 * .mjs/.ts est rebundle en index.js ESM et casse sans "type":"module" dans /var/task.
 */
require('express'); // détection @vercel/express

const mod = require('./dist/index.js');
module.exports = mod.default || mod;
