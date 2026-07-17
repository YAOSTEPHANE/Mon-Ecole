"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadAssetExists = uploadAssetExists;
exports.sanitizeBrandingAssetUrl = sanitizeBrandingAssetUrl;
exports.toPublicBrandingShape = toPublicBrandingShape;
const fs_1 = __importDefault(require("fs"));
const upload_file_path_util_1 = require("./upload-file-path.util");
const home_page_images_util_1 = require("./home-page-images.util");
/** Vérifie qu’un fichier d’upload local existe encore sur le disque. */
function uploadAssetExists(publicUrl) {
    if (!publicUrl?.trim())
        return false;
    if (publicUrl.startsWith('http://') || publicUrl.startsWith('https://'))
        return true;
    const local = (0, upload_file_path_util_1.localPathFromUploadUrl)(publicUrl);
    if (!local)
        return false;
    try {
        return fs_1.default.existsSync(local);
    }
    catch {
        return false;
    }
}
function sanitizeBrandingAssetUrl(publicUrl) {
    if (!publicUrl?.trim())
        return null;
    return uploadAssetExists(publicUrl) ? publicUrl : null;
}
function toPublicBrandingShape(row) {
    return {
        navigationLogoUrl: sanitizeBrandingAssetUrl(row.navigationLogoUrl),
        loginLogoUrl: sanitizeBrandingAssetUrl(row.loginLogoUrl),
        faviconUrl: sanitizeBrandingAssetUrl(row.faviconUrl),
        studiesDirectorPhotoUrl: sanitizeBrandingAssetUrl(row.studiesDirectorPhotoUrl),
        studiesDirectorName: row.studiesDirectorName ?? null,
        studiesDirectorOccasionBadge: row.studiesDirectorOccasionBadge ?? null,
        studiesDirectorMessageTitle: row.studiesDirectorMessageTitle ?? null,
        studiesDirectorMessage: row.studiesDirectorMessage ?? null,
        studiesDirectorClosing: row.studiesDirectorClosing ?? null,
        studiesDirectorFooterLine: row.studiesDirectorFooterLine ?? null,
        homePageImages: (0, home_page_images_util_1.sanitizeHomePageImages)(row.homePageImages),
        appTitle: row.appTitle,
        appTagline: row.appTagline,
        currentAcademicYear: row.currentAcademicYear ?? null,
        schoolDisplayName: row.schoolDisplayName,
        schoolAddress: row.schoolAddress,
        schoolPhone: row.schoolPhone,
        schoolEmail: row.schoolEmail,
        schoolWebsite: row.schoolWebsite,
        schoolPrincipal: row.schoolPrincipal,
        schoolCode: row.schoolCode ?? null,
        schoolDrena: row.schoolDrena ?? null,
        schoolIepp: row.schoolIepp ?? null,
        schoolStatus: row.schoolStatus ?? null,
        schoolMilieu: row.schoolMilieu ?? null,
        schoolRegion: row.schoolRegion ?? null,
        classroomCount: row.classroomCount ?? null,
    };
}
//# sourceMappingURL=branding-assets.util.js.map