import prisma from './prisma';
import { getNextAcademicYear } from './school-level-progression.util';

export type RolloverPreviewRow = {
  sourceClassId: string;
  sourceName: string;
  level: string;
  capacity: number;
  room: string | null;
  educationSector: string;
  trackId: string | null;
  teacherId: string | null;
  studentCount: number;
  alreadyExists: boolean;
  existingTargetClassId: string | null;
};

export type RolloverPreviewResult = {
  fromAcademicYear: string;
  toAcademicYear: string;
  schoolId: string | null;
  toCreate: number;
  alreadyExists: number;
  rows: RolloverPreviewRow[];
};

export type RolloverApplyResult = RolloverPreviewResult & {
  created: Array<{ id: string; name: string; level: string; academicYear: string }>;
  skipped: number;
};

async function buildRolloverRows(opts: {
  fromAcademicYear: string;
  toAcademicYear: string;
  schoolId?: string | null;
}): Promise<RolloverPreviewRow[]> {
  const sources = await prisma.class.findMany({
    where: {
      academicYear: opts.fromAcademicYear,
      ...(opts.schoolId ? { schoolId: opts.schoolId } : {}),
    },
    select: {
      id: true,
      name: true,
      level: true,
      capacity: true,
      room: true,
      educationSector: true,
      trackId: true,
      teacherId: true,
      schoolId: true,
      _count: { select: { students: true } },
    },
    orderBy: [{ level: 'asc' }, { name: 'asc' }],
  });

  const targets = await prisma.class.findMany({
    where: {
      academicYear: opts.toAcademicYear,
      ...(opts.schoolId ? { schoolId: opts.schoolId } : {}),
    },
    select: { id: true, name: true, level: true, schoolId: true },
  });

  return sources.map((src) => {
    const existing = targets.find(
      (t) =>
        t.name === src.name &&
        t.level === src.level &&
        (opts.schoolId ? t.schoolId === opts.schoolId : true),
    );
    return {
      sourceClassId: src.id,
      sourceName: src.name,
      level: src.level,
      capacity: src.capacity,
      room: src.room,
      educationSector: src.educationSector,
      trackId: src.trackId,
      teacherId: src.teacherId,
      studentCount: src._count.students,
      alreadyExists: Boolean(existing),
      existingTargetClassId: existing?.id ?? null,
    };
  });
}

export async function previewAcademicYearRollover(opts: {
  fromAcademicYear: string;
  toAcademicYear?: string;
  schoolId?: string | null;
}): Promise<RolloverPreviewResult> {
  const toAcademicYear = opts.toAcademicYear || getNextAcademicYear(opts.fromAcademicYear);
  const rows = await buildRolloverRows({
    fromAcademicYear: opts.fromAcademicYear,
    toAcademicYear,
    schoolId: opts.schoolId,
  });
  return {
    fromAcademicYear: opts.fromAcademicYear,
    toAcademicYear,
    schoolId: opts.schoolId ?? null,
    toCreate: rows.filter((r) => !r.alreadyExists).length,
    alreadyExists: rows.filter((r) => r.alreadyExists).length,
    rows,
  };
}

/**
 * Clone les classes de l’année N vers N+1 (même nom/niveau/capacité/filière).
 * Ne crée pas les doublons déjà présents. N’affecte pas les élèves.
 */
export async function applyAcademicYearRollover(opts: {
  fromAcademicYear: string;
  toAcademicYear?: string;
  schoolId?: string | null;
  copyTeacherAssignments?: boolean;
}): Promise<RolloverApplyResult> {
  const preview = await previewAcademicYearRollover(opts);
  const created: RolloverApplyResult['created'] = [];
  let skipped = 0;

  for (const row of preview.rows) {
    if (row.alreadyExists) {
      skipped += 1;
      continue;
    }
    const source = await prisma.class.findUnique({
      where: { id: row.sourceClassId },
      select: { schoolId: true },
    });
    const createdClass = await prisma.class.create({
      data: {
        name: row.sourceName,
        level: row.level,
        room: row.room,
        capacity: row.capacity,
        academicYear: preview.toAcademicYear,
        schoolId: source?.schoolId ?? opts.schoolId ?? undefined,
        educationSector: row.educationSector as 'GENERAL' | 'TECHNICAL',
        trackId: row.trackId ?? undefined,
        teacherId: opts.copyTeacherAssignments ? row.teacherId ?? undefined : undefined,
      },
      select: { id: true, name: true, level: true, academicYear: true },
    });
    created.push(createdClass);
  }

  return {
    ...preview,
    toCreate: created.length,
    alreadyExists: skipped,
    created,
    skipped,
  };
}
