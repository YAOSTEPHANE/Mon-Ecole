"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.secureCompareStrings = secureCompareStrings;
const crypto_1 = __importDefault(require("crypto"));
/**
 * Comparaison à temps constant pour secrets (clés API, tokens).
 * Évite les attaques par timing sur `===`.
 */
function secureCompareStrings(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string')
        return false;
    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');
    if (bufA.length !== bufB.length) {
        crypto_1.default.timingSafeEqual(bufA, bufA);
        return false;
    }
    return crypto_1.default.timingSafeEqual(bufA, bufB);
}
//# sourceMappingURL=secure-compare.util.js.map