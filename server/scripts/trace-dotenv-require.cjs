const Module = require('module');
const orig = Module.prototype.require;
Module.prototype.require = function (id) {
  if (id === 'dotenv' || String(id).includes('dotenv')) {
    const err = new Error('TRACE dotenv require: ' + id);
    console.error(err.stack);
    const e = new Error("Cannot find module 'dotenv'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
  }
  return orig.apply(this, arguments);
};
process.env.VERCEL = '1';
try {
  require('../vercel-api.cjs');
  console.log('LOADED OK without dotenv');
} catch (e) {
  console.error('FAIL', e.message);
  process.exitCode = 1;
}
