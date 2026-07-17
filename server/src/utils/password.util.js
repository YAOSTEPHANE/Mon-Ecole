"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.comparePassword = exports.hashSecret = exports.hashPassword = exports.PASSWORD_POLICY_HINT = void 0;
exports.validatePasswordStrength = validatePasswordStrength;
exports.assertPasswordPolicy = assertPasswordPolicy;
exports.optionalPasswordPolicyValidator = optionalPasswordPolicyValidator;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const MIN_LENGTH = 8;
/**
 * Politique mot de passe : longueur, majuscule, minuscule, chiffre, caractère spécial.
 */
function validatePasswordStrength(password) {
    if (typeof password !== 'string' || password.length < MIN_LENGTH) {
        throw new Error(`Le mot de passe doit contenir au moins ${MIN_LENGTH} caractères.`);
    }
    if (!/[a-z]/.test(password)) {
        throw new Error('Le mot de passe doit contenir au moins une minuscule.');
    }
    if (!/[A-Z]/.test(password)) {
        throw new Error('Le mot de passe doit contenir au moins une majuscule.');
    }
    if (!/[0-9]/.test(password)) {
        throw new Error('Le mot de passe doit contenir au moins un chiffre.');
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
        throw new Error('Le mot de passe doit contenir au moins un caractère spécial.');
    }
}
exports.PASSWORD_POLICY_HINT = 'Au moins 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial.';
/** Validateur express-validator pour body('password'). */
function assertPasswordPolicy(value) {
    validatePasswordStrength(String(value ?? ''));
    return true;
}
/** Validateur express-validator pour body('password') optionnel (création compte admin). */
function optionalPasswordPolicyValidator(value) {
    const raw = typeof value === 'string' ? value.trim() : '';
    if (!raw)
        return true;
    validatePasswordStrength(raw);
    return true;
}
const hashPassword = async (password) => {
    validatePasswordStrength(password);
    return bcryptjs_1.default.hash(password, 12);
};
exports.hashPassword = hashPassword;
/** Hash bcrypt sans validation — secrets internes / jetons aléatoires (invitation mot de passe). */
const hashSecret = async (secret) => {
    return bcryptjs_1.default.hash(secret, 12);
};
exports.hashSecret = hashSecret;
const comparePassword = async (password, hashedPassword) => {
    return bcryptjs_1.default.compare(password, hashedPassword);
};
exports.comparePassword = comparePassword;
//# sourceMappingURL=password.util.js.map