"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_USER_UI_PREFERENCES = void 0;
exports.normalizeUserUiPreferences = normalizeUserUiPreferences;
exports.mergeUserUiPreferences = mergeUserUiPreferences;
exports.DEFAULT_USER_UI_PREFERENCES = {
    language: 'fr',
    theme: 'light',
    timezone: 'Europe/Paris',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
};
const ALLOWED_THEMES = new Set(['light', 'dark', 'auto']);
const ALLOWED_TIME_FORMATS = new Set(['12h', '24h']);
const ALLOWED_DATE_FORMATS = new Set(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']);
const ALLOWED_LANGUAGES = new Set(['fr', 'en', 'es']);
const ALLOWED_TIMEZONES = new Set([
    'Europe/Paris',
    'Europe/London',
    'America/New_York',
]);
function asRecord(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        return null;
    return value;
}
function normalizeUserUiPreferences(input) {
    const raw = asRecord(input) ?? {};
    const themeRaw = String(raw.theme ?? exports.DEFAULT_USER_UI_PREFERENCES.theme);
    const timeFormatRaw = String(raw.timeFormat ?? exports.DEFAULT_USER_UI_PREFERENCES.timeFormat);
    const dateFormatRaw = String(raw.dateFormat ?? exports.DEFAULT_USER_UI_PREFERENCES.dateFormat);
    const languageRaw = String(raw.language ?? exports.DEFAULT_USER_UI_PREFERENCES.language);
    const timezoneRaw = String(raw.timezone ?? exports.DEFAULT_USER_UI_PREFERENCES.timezone);
    return {
        language: ALLOWED_LANGUAGES.has(languageRaw) ? languageRaw : exports.DEFAULT_USER_UI_PREFERENCES.language,
        theme: ALLOWED_THEMES.has(themeRaw)
            ? themeRaw
            : exports.DEFAULT_USER_UI_PREFERENCES.theme,
        timezone: ALLOWED_TIMEZONES.has(timezoneRaw) ? timezoneRaw : exports.DEFAULT_USER_UI_PREFERENCES.timezone,
        dateFormat: ALLOWED_DATE_FORMATS.has(dateFormatRaw)
            ? dateFormatRaw
            : exports.DEFAULT_USER_UI_PREFERENCES.dateFormat,
        timeFormat: ALLOWED_TIME_FORMATS.has(timeFormatRaw)
            ? timeFormatRaw
            : exports.DEFAULT_USER_UI_PREFERENCES.timeFormat,
    };
}
function mergeUserUiPreferences(current, patch) {
    const base = normalizeUserUiPreferences(current);
    const delta = asRecord(patch);
    if (!delta)
        return base;
    return normalizeUserUiPreferences({ ...base, ...delta });
}
//# sourceMappingURL=user-ui-preferences.util.js.map