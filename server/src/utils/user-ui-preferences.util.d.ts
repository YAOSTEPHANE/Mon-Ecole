export type UserUiPreferences = {
    language: string;
    theme: 'light' | 'dark' | 'auto';
    timezone: string;
    dateFormat: string;
    timeFormat: '12h' | '24h';
};
export declare const DEFAULT_USER_UI_PREFERENCES: UserUiPreferences;
export declare function normalizeUserUiPreferences(input: unknown): UserUiPreferences;
export declare function mergeUserUiPreferences(current: unknown, patch: unknown): UserUiPreferences;
//# sourceMappingURL=user-ui-preferences.util.d.ts.map