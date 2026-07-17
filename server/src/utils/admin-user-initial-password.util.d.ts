/**
 * Si l’admin fournit un mot de passe, il doit respecter la politique de complexité.
 * Sinon : hash aléatoire + invitation par e-mail pour définir le mot de passe (lien type « oublié »).
 */
export declare function resolveAdminProvidedOrInvitePassword(passwordFromBody: unknown): Promise<{
    hashedPassword: string;
    shouldSendSetupEmail: boolean;
}>;
export declare function inviteNewUserToSetPassword(userId: string, email: string, firstName: string): Promise<void>;
//# sourceMappingURL=admin-user-initial-password.util.d.ts.map