export type ImportantEmailTemplate = {
    subject: string;
    text: string;
    html: string;
};
export type NotifyImportantOptions = {
    type: string;
    title: string;
    content: string;
    /** Lien relatif (ex. /student). Si absent, déduit du rôle utilisateur. */
    link?: string | null;
    /**
     * E-mails : `undefined` = message générique pour chaque destinataire ;
     * objet = même modèle envoyé à tous ;
     * `null` = aucun e-mail (ex. congé : modèle déjà envoyé à part).
     */
    email?: ImportantEmailTemplate | null;
};
/**
 * Notifications in-app + e-mail + Web Push pour les destinataires indiqués.
 * Les erreurs réseau sont journalisées sans faire échouer l’appelant.
 */
/** Après publication des bulletins d’une classe : élèves + parents (sans doublon). */
export declare function notifyBulletinsPublished(rows: {
    studentId: string;
}[], periodLabel: string, academicYear: string): Promise<void>;
export declare function notifyUsersImportant(userIds: string[], options: NotifyImportantOptions): Promise<void>;
//# sourceMappingURL=notify-important.util.d.ts.map