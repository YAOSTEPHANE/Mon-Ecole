"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HOME_PAGE_IMAGE_SLOTS = void 0;
exports.isHomePageImageSlot = isHomePageImageSlot;
exports.parseHomePageImages = parseHomePageImages;
exports.sanitizeHomePageImages = sanitizeHomePageImages;
exports.mergeHomePageImageUpdate = mergeHomePageImageUpdate;
exports.clearHomePageImageSlot = clearHomePageImageSlot;
const branding_assets_util_1 = require("./branding-assets.util");
/** Clés des visuels de la page d’accueil publique (stockées dans AppBranding.homePageImages). */
exports.HOME_PAGE_IMAGE_SLOTS = [
    'homeHeroPlatform',
    'homePillarPedagogy',
    'homePillarPortals',
    'homePillarSecurity',
    'homePillarAdministration',
    'homeRoleAdmin',
    'homeRoleTeacher',
    'homeRoleStudent',
    'homeRoleParent',
    'homeSplitCampus',
];
function isHomePageImageSlot(value) {
    return exports.HOME_PAGE_IMAGE_SLOTS.includes(value);
}
function parseHomePageImages(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw))
        return {};
    const out = {};
    for (const key of exports.HOME_PAGE_IMAGE_SLOTS) {
        const v = raw[key];
        if (typeof v === 'string' && v.trim())
            out[key] = v.trim();
        else if (v === null)
            out[key] = null;
    }
    return out;
}
function sanitizeHomePageImages(raw) {
    const parsed = parseHomePageImages(raw);
    const out = {};
    for (const key of exports.HOME_PAGE_IMAGE_SLOTS) {
        const url = parsed[key];
        if (url === null) {
            out[key] = null;
            continue;
        }
        const clean = (0, branding_assets_util_1.sanitizeBrandingAssetUrl)(url);
        if (clean)
            out[key] = clean;
    }
    return out;
}
function mergeHomePageImageUpdate(prev, slot, fileUrl) {
    return { ...prev, [slot]: fileUrl };
}
function clearHomePageImageSlot(prev, slot) {
    return { ...prev, [slot]: null };
}
//# sourceMappingURL=home-page-images.util.js.map