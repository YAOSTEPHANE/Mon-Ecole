/** Clés des visuels de la page d’accueil publique (stockées dans AppBranding.homePageImages). */
export declare const HOME_PAGE_IMAGE_SLOTS: readonly ['homeHeroPlatform', 'homePillarPedagogy', 'homePillarPortals', 'homePillarSecurity', 'homePillarAdministration', 'homeRoleAdmin', 'homeRoleTeacher', 'homeRoleStudent', 'homeRoleParent', 'homeSplitCampus'];
export type HomePageImageSlot = (typeof HOME_PAGE_IMAGE_SLOTS)[number];
export type HomePageImagesRecord = Partial<Record<HomePageImageSlot, string | null>>;
export declare function isHomePageImageSlot(value: string): value is HomePageImageSlot;
export declare function parseHomePageImages(raw: unknown): HomePageImagesRecord;
export declare function sanitizeHomePageImages(raw: unknown): HomePageImagesRecord;
export declare function mergeHomePageImageUpdate(prev: HomePageImagesRecord, slot: HomePageImageSlot, fileUrl: string): HomePageImagesRecord;
export declare function clearHomePageImageSlot(prev: HomePageImagesRecord, slot: HomePageImageSlot): HomePageImagesRecord;
//# sourceMappingURL=home-page-images.util.d.ts.map