"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizePortalCategory = normalizePortalCategory;
exports.normalizeCoverImageUrl = normalizeCoverImageUrl;
exports.parseImageUrlsField = parseImageUrlsField;
function normalizePortalCategory(input) {
    if (input == null || input === '')
        return null;
    const v = String(input).trim().toLowerCase();
    if (v === 'auto' || v === 'automatic')
        return null;
    if (v === 'circular' || v === 'news' || v === 'gallery')
        return v;
    return null;
}
function normalizeCoverImageUrl(input) {
    if (typeof input !== 'string' || !input.trim())
        return null;
    return input.trim();
}
/** Jusqu’à 40 URLs (lignes ou séparées par virgule / point-virgule). */
function parseImageUrlsField(input) {
    if (Array.isArray(input)) {
        return input.map(String).map((s) => s.trim()).filter(Boolean).slice(0, 40);
    }
    if (typeof input === 'string') {
        return input
            .split(/[\n,;]+/)
            .map((s) => s.trim())
            .filter(Boolean)
            .slice(0, 40);
    }
    return [];
}
//# sourceMappingURL=announcement-portal-fields.util.js.map