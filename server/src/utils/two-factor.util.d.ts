export declare function generateTwoFactorSecret(email: string): {
    secretPlain: string;
    secretEncrypted: string;
    otpauthUrl: string;
};
export declare function verifyTwoFactorToken(secretEncrypted: string, token: string): boolean;
//# sourceMappingURL=two-factor.util.d.ts.map