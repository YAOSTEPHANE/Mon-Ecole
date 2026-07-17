export type AppBrandingDelegate = {
    findUnique: (args: {
        where: {
            id: string;
        };
    }) => Promise<AppBrandingRow | null>;
    upsert: (args: {
        where: {
            id: string;
        };
        create: Record<string, unknown>;
        update: Record<string, unknown>;
    }) => Promise<AppBrandingRow>;
    create: (args: {
        data: Record<string, unknown>;
    }) => Promise<AppBrandingRow>;
};
export type AppBrandingRow = {
    navigationLogoUrl: string | null;
    loginLogoUrl: string | null;
    faviconUrl: string | null;
    appTitle: string | null;
    appTagline: string | null;
    currentAcademicYear?: string | null;
    schoolDisplayName: string | null;
    schoolAddress: string | null;
    schoolPhone: string | null;
    schoolEmail: string | null;
    schoolWebsite: string | null;
    schoolPrincipal: string | null;
};
/** Après ajout du modèle AppBranding, un `npx prisma generate` est requis. */
export declare function getAppBrandingDelegate(): AppBrandingDelegate | null;
export declare const APP_BRANDING_ID = "default";
export declare const APP_BRANDING_PRISMA_HINT = "Ex\u00E9cutez dans le dossier server : npx prisma generate puis npx prisma db push (client Prisma ou base pas \u00E0 jour).";
//# sourceMappingURL=app-branding-prisma.util.d.ts.map