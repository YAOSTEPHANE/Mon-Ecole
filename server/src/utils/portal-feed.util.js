"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.inferPortalCategory = inferPortalCategory;
exports.isCircularForAdminFilters = isCircularForAdminFilters;
exports.fetchAnnouncementsForPortal = fetchAnnouncementsForPortal;
exports.fetchSchoolCalendarForPortal = fetchSchoolCalendarForPortal;
exports.fetchPublishedGalleryItems = fetchPublishedGalleryItems;
exports.buildPortalFeed = buildPortalFeed;
const date_fns_1 = require("date-fns");
const prisma_1 = __importDefault(require("./prisma"));
const ANNOUNCEMENT_INCLUDE = {
    author: {
        select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
        },
    },
    targetClass: {
        select: {
            id: true,
            name: true,
            level: true,
        },
    },
};
/** Catégorie affichée portail : circulaire (officielle), actualité, galerie (post riche médias). */
function inferPortalCategory(title, portalCategory) {
    const pc = portalCategory?.trim().toLowerCase();
    if (pc === 'circular' || pc === 'news' || pc === 'gallery') {
        return pc;
    }
    const t = (title || '').trim();
    if (/^\[?\s*Circulaire/i.test(t) || /^Circulaire\b/i.test(t)) {
        return 'circular';
    }
    return 'news';
}
function isCircularForAdminFilters(title, portalCategory) {
    return inferPortalCategory(title, portalCategory) === 'circular';
}
async function fetchAnnouncementsForPortal(role, classIds) {
    const uniqClasses = [...new Set(classIds.filter(Boolean))];
    const classClauses = uniqClasses.map((id) => ({ targetClassId: id }));
    return prisma_1.default.announcement.findMany({
        where: {
            published: true,
            OR: [{ targetRole: role }, { targetRole: null }, ...classClauses],
            AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }] }],
        },
        include: ANNOUNCEMENT_INCLUDE,
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    });
}
async function fetchSchoolCalendarForPortal(academicYear) {
    const now = new Date();
    const from = (0, date_fns_1.subMonths)(now, 1);
    const to = (0, date_fns_1.addMonths)(now, 9);
    return prisma_1.default.schoolCalendarEvent.findMany({
        where: {
            ...(academicYear && String(academicYear).trim()
                ? { academicYear: String(academicYear).trim() }
                : {}),
            endDate: { gte: from },
            startDate: { lte: to },
        },
        orderBy: { startDate: 'asc' },
    });
}
async function fetchPublishedGalleryItems() {
    return prisma_1.default.schoolGalleryItem.findMany({
        where: { published: true },
        orderBy: [{ sortOrder: 'asc' }, { publishedAt: 'desc' }, { createdAt: 'desc' }],
    });
}
async function buildPortalFeed(params) {
    const [announcements, events, gallery] = await Promise.all([
        fetchAnnouncementsForPortal(params.role, params.classIds),
        fetchSchoolCalendarForPortal(params.academicYear),
        fetchPublishedGalleryItems(),
    ]);
    const items = [];
    for (const a of announcements) {
        const sortAt = (a.publishedAt ?? a.createdAt).toISOString();
        items.push({
            kind: 'announcement',
            sortAt,
            displayCategory: inferPortalCategory(a.title, a.portalCategory),
            data: a,
        });
    }
    for (const e of events) {
        items.push({
            kind: 'calendar',
            sortAt: e.startDate.toISOString(),
            data: e,
        });
    }
    for (const g of gallery) {
        const sortAt = (g.publishedAt ?? g.createdAt).toISOString();
        items.push({ kind: 'gallery', sortAt, data: g });
    }
    items.sort((x, y) => (x.sortAt < y.sortAt ? 1 : x.sortAt > y.sortAt ? -1 : 0));
    return items;
}
//# sourceMappingURL=portal-feed.util.js.map