"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveAdminProvidedOrInvitePassword = resolveAdminProvidedOrInvitePassword;
exports.inviteNewUserToSetPassword = inviteNewUserToSetPassword;
const crypto_1 = __importDefault(require("crypto"));
const password_util_1 = require("./password.util");
const email_util_1 = require("./email.util");
const SETUP_TOKEN_HOURS = 48;
/**
 * Si l’admin fournit un mot de passe, il doit respecter la politique de complexité.
 * Sinon : hash aléatoire + invitation par e-mail pour définir le mot de passe (lien type « oublié »).
 */
async function resolveAdminProvidedOrInvitePassword(passwordFromBody) {
    const raw = typeof passwordFromBody === 'string' ? passwordFromBody.trim() : '';
    if (raw.length > 0) {
        (0, password_util_1.validatePasswordStrength)(raw);
        return { hashedPassword: await (0, password_util_1.hashPassword)(raw), shouldSendSetupEmail: false };
    }
    const placeholder = crypto_1.default.randomBytes(48).toString('base64url');
    return { hashedPassword: await (0, password_util_1.hashSecret)(placeholder), shouldSendSetupEmail: true };
}
async function inviteNewUserToSetPassword(userId, email, firstName) {
    const token = await (0, email_util_1.createPasswordResetToken)(userId, SETUP_TOKEN_HOURS);
    await (0, email_util_1.sendWelcomeSetPasswordEmail)(email, token, firstName);
}
//# sourceMappingURL=admin-user-initial-password.util.js.map