import type { SchoolCalendarEvent, SchoolGalleryItem } from '@prisma/client';
/** Catégorie affichée portail : circulaire (officielle), actualité, galerie (post riche médias). */
export declare function inferPortalCategory(title: string, portalCategory: string | null | undefined): 'circular' | 'news' | 'gallery';
export declare function isCircularForAdminFilters(title: string, portalCategory: string | null | undefined): boolean;
type PortalRole = 'STUDENT' | 'PARENT';
export declare function fetchAnnouncementsForPortal(role: PortalRole, classIds: string[]): Promise<({
    author: {
        avatar: string | null;
        email: string;
        firstName: string;
        id: string;
        lastName: string;
    };
    targetClass: {
        id: string;
        level: string;
        name: string;
    } | null;
} & {
    id: string;
    authorId: string;
    title: string;
    content: string;
    targetRole: import(".prisma/client").$Enums.Role | null;
    targetClassId: string | null;
    priority: string;
    portalCategory: string | null;
    coverImageUrl: string | null;
    imageUrls: string[];
    published: boolean;
    publishedAt: Date | null;
    expiresAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
})[]>;
export type AnnouncementPortalRow = Awaited<ReturnType<typeof fetchAnnouncementsForPortal>>[number];
export declare function fetchSchoolCalendarForPortal(academicYear?: string): Promise<SchoolCalendarEvent[]>;
export declare function fetchPublishedGalleryItems(): Promise<SchoolGalleryItem[]>;
export type PortalFeedItem = {
    kind: 'announcement';
    sortAt: string;
    displayCategory: 'circular' | 'news' | 'gallery';
    data: AnnouncementPortalRow;
} | {
    kind: 'calendar';
    sortAt: string;
    data: SchoolCalendarEvent;
} | {
    kind: 'gallery';
    sortAt: string;
    data: SchoolGalleryItem;
};
export declare function buildPortalFeed(params: {
    role: PortalRole;
    classIds: string[];
    academicYear?: string;
}): Promise<PortalFeedItem[]>;
export {};
//# sourceMappingURL=portal-feed.util.d.ts.map