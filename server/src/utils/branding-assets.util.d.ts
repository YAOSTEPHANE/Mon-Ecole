import { type HomePageImagesRecord } from './home-page-images.util';
/** Vérifie qu’un fichier d’upload local existe encore sur le disque. */
export declare function uploadAssetExists(publicUrl: string | null | undefined): boolean;
export declare function sanitizeBrandingAssetUrl(publicUrl: string | null | undefined): string | null;
export type BrandingPublicRow = {
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
    schoolCode?: string | null;
    schoolDrena?: string | null;
    schoolIepp?: string | null;
    schoolStatus?: string | null;
    schoolMilieu?: string | null;
    schoolRegion?: string | null;
    classroomCount?: number | null;
    studiesDirectorPhotoUrl?: string | null;
    studiesDirectorName?: string | null;
    studiesDirectorOccasionBadge?: string | null;
    studiesDirectorMessageTitle?: string | null;
    studiesDirectorMessage?: string | null;
    studiesDirectorClosing?: string | null;
    studiesDirectorFooterLine?: string | null;
    homePageImages?: HomePageImagesRecord | null;
};
export declare function toPublicBrandingShape(row: BrandingPublicRow): BrandingPublicRow;
//# sourceMappingURL=branding-assets.util.d.ts.map