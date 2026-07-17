/**
 * Politique mot de passe : longueur, majuscule, minuscule, chiffre, caractère spécial.
 */
export declare function validatePasswordStrength(password: string): void;
export declare const PASSWORD_POLICY_HINT = "Au moins 8 caract\u00E8res, une majuscule, une minuscule, un chiffre et un caract\u00E8re sp\u00E9cial.";
/** Validateur express-validator pour body('password'). */
export declare function assertPasswordPolicy(value: unknown): true;
/** Validateur express-validator pour body('password') optionnel (création compte admin). */
export declare function optionalPasswordPolicyValidator(value: unknown): true;
export declare const hashPassword: (password: string) => Promise<string>;
/** Hash bcrypt sans validation — secrets internes / jetons aléatoires (invitation mot de passe). */
export declare const hashSecret: (secret: string) => Promise<string>;
export declare const comparePassword: (password: string, hashedPassword: string) => Promise<boolean>;
//# sourceMappingURL=password.util.d.ts.map