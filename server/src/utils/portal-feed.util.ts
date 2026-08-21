import { subMonths, addMonths } from 'date-fns';
import type { SchoolCalendarEvent, SchoolGalleryItem } from '@prisma/client';
import prisma from './prisma';

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
} as const;

/** Catégorie affichée portail : circulaire (officielle), actualité, galerie (post riche médias). */
export function inferPortalCategory(
  title: string,
  portalCategory: string | null | undefined
): 'circular' | 'news' | 'gallery' {
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

export function isCircularForAdminFilters(
  title: string,
  portalCategory: string | null | undefined
): boolean {
  return inferPortalCategory(title, portalCategory) === 'circular';
}

type PortalRole = 'STUDENT' | 'PARENT';

export async function fetchAnnouncementsForPortal(
  role: PortalRole,
  classIds: string[]
) {
  const uniqClasses = [...new Set(classIds.filter(Boolean))];
  const classClauses = uniqClasses.map((id) => ({ targetClassId: id }));

  let schoolScope: { OR: Array<{ schoolId: string | null } | { schoolId: { isSet: false } } | { schoolId: { in: string[] } }> } | undefined;
  if (uniqClasses.length > 0) {
    const classes = await prisma.class.findMany({
      where: { id: { in: uniqClasses } },
      select: { schoolId: true },
    });
    const schoolIds = [
      ...new Set(classes.map((c) => c.schoolId).filter((id): id is string => Boolean(id))),
    ];
    if (schoolIds.length > 0) {
      schoolScope = {
        OR: [
          { schoolId: { in: schoolIds } },
          { schoolId: null },
          { schoolId: { isSet: false } },
        ],
      };
    }
  }

  return prisma.announcement.findMany({
    where: {
      published: true,
      OR: [{ targetRole: role }, { targetRole: null }, ...classClauses],
      AND: [
        { OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }] },
        ...(schoolScope ? [schoolScope] : []),
      ],
    },
    include: ANNOUNCEMENT_INCLUDE,
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
  });
}

export type AnnouncementPortalRow = Awaited<ReturnType<typeof fetchAnnouncementsForPortal>>[number];

export async function fetchSchoolCalendarForPortal(academicYear?: string): Promise<SchoolCalendarEvent[]> {
  const now = new Date();
  const from = subMonths(now, 1);
  const to = addMonths(now, 9);
  return prisma.schoolCalendarEvent.findMany({
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

export async function fetchPublishedGalleryItems(): Promise<SchoolGalleryItem[]> {
  return prisma.schoolGalleryItem.findMany({
    where: { published: true },
    orderBy: [{ sortOrder: 'asc' }, { publishedAt: 'desc' }, { createdAt: 'desc' }],
  });
}

export type PortalFeedItem =
  | {
      kind: 'announcement';
      sortAt: string;
      displayCategory: 'circular' | 'news' | 'gallery';
      data: AnnouncementPortalRow;
    }
  | { kind: 'calendar'; sortAt: string; data: SchoolCalendarEvent }
  | { kind: 'gallery'; sortAt: string; data: SchoolGalleryItem };

export async function buildPortalFeed(params: {
  role: PortalRole;
  classIds: string[];
  academicYear?: string;
}): Promise<PortalFeedItem[]> {
  const [announcements, events, gallery] = await Promise.all([
    fetchAnnouncementsForPortal(params.role, params.classIds),
    fetchSchoolCalendarForPortal(params.academicYear),
    fetchPublishedGalleryItems(),
  ]);

  const items: PortalFeedItem[] = [];

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
