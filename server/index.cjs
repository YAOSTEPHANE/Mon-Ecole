/**
 * Entrée Express CommonJS de secours (vercel.json pointe sur src/index.ts).
 * Ne pas servir dist/build/output comme racine lambda Vercel Services :
 * le shim ESM `index.__vc_service_vc_init.js` provoque des 500 sur /api.
 */
require('express');

const mod = require('./compiled/index.js');
module.exports = mod.default || mod;
