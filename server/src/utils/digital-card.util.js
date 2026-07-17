"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateDigitalCardPublicId = generateDigitalCardPublicId;
const crypto_1 = require("crypto");
/** Identifiant URL-safe unique pour la carte étudiant numérique (non devinable). */
function generateDigitalCardPublicId() {
    return `sc_${(0, crypto_1.randomBytes)(18).toString('base64url').replace(/=+$/, '')}`;
}
//# sourceMappingURL=digital-card.util.js.map