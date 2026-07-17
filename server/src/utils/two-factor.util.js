"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTwoFactorSecret = generateTwoFactorSecret;
exports.verifyTwoFactorToken = verifyTwoFactorToken;
const preset_default_1 = require("@otplib/preset-default");
const field_encryption_util_1 = require("./field-encryption.util");
preset_default_1.authenticator.options = {
    step: 30,
    digits: 6,
    window: 1,
};
function issuer() {
    return process.env.TWO_FACTOR_ISSUER?.trim() || 'School Manager';
}
function generateTwoFactorSecret(email) {
    const secretPlain = preset_default_1.authenticator.generateSecret();
    const secretEncrypted = (0, field_encryption_util_1.encryptSensitiveString)(secretPlain) || secretPlain;
    const otpauthUrl = preset_default_1.authenticator.keyuri(email, issuer(), secretPlain);
    return { secretPlain, secretEncrypted, otpauthUrl };
}
function verifyTwoFactorToken(secretEncrypted, token) {
    const secretPlain = (0, field_encryption_util_1.decryptSensitiveString)(secretEncrypted) || secretEncrypted;
    return preset_default_1.authenticator.verify({ token: token.trim(), secret: secretPlain });
}
//# sourceMappingURL=two-factor.util.js.map