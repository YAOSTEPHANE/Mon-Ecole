import type { HomePageImageSlot } from '@/lib/homePageImages.types';
import { HOME_PAGE_IMAGE_HIDDEN } from '@/lib/homePageImages.types';
import { resolveUploadPublicUrl } from '@/lib/uploadsPublicUrl';

export type { HomePageImageSlot, HomePageImagesRecord } from '@/lib/homePageImages.types';
export {
  HOME_PAGE_IMAGE_DEFINITIONS,
  HOME_PAGE_IMAGE_SLOTS,
  HOME_PAGE_IMAGE_HIDDEN,
} from '@/lib/homePageImages.types';

export function resolveHomePageImageSrc(
  homePageImages: Partial<Record<HomePageImageSlot, string | null>> | undefined,
  slot: HomePageImageSlot,
  defaultPath: string,
): { src: string | null; isCustom: boolean; isHidden: boolean } {
  const custom = homePageImages?.[slot];
  if (custom === HOME_PAGE_IMAGE_HIDDEN) {
    return { src: null, isCustom: false, isHidden: true };
  }
  const resolved = resolveUploadPublicUrl(custom ?? null);
  if (resolved) return { src: resolved, isCustom: true, isHidden: false };
  return { src: defaultPath, isCustom: false, isHidden: false };
}

export function isUploadLikeImageSrc(src: string): boolean {
  return (
    src.startsWith('http://') ||
    src.startsWith('https://') ||
    src.includes('/uploads/') ||
    src.includes('/api/uploads/')
  );
}
