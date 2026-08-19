import { Prisma } from '@prisma/client';
import prisma from './prisma';
import { getCurrentAcademicYear, getPeriodLabel, toPeriodKey } from './report-card.util';
import { sanitizeBrandingAssetUrl } from './branding-assets.util';

export const OFFICIAL_EXAM_KINDS = ['CEPE', 'BEPC', 'BAC', 'OTHER'] as const;
export type OfficialExamKind = (typeof OFFICIAL_EXAM_KINDS)[number];

export const DEFAULT_EXAM_LABELS: Record<OfficialExamKind, string> = {
  CEPE: 'CEPE',
  BEPC: 'BEPC',
  BAC: 'Baccalauréat',
  OTHER: 'Examen',
};

const PERIOD_PRIORITY: Record<string, number> = {
  trim3: 3,
  sem2: 3,
  trim2: 2,
  sem1: 1,
  trim1: 1,
};

export type PublicExamStat = {
  id: string;
  examKind: string;
  examLabel: string;
  academicYear: string;
  candidates: number | null;
  admitted: number | null;
  passRate: number;
};

export type PublicHonorStudent = {
  classId: string;
  className: string;
  classLevel: string;
  firstName: string;
  lastName: string;
  average: number;
  photoUrl: string | null;
  isPlaceholder?: boolean;
};

export const HONOR_ROLL_LEVELS = [
  '6ème',
  '5ème',
  '4ème',
  '3ème',
  '2nde',
  '1ère',
  'Terminale',
] as const;

/** Élèves d’exemple (1er de chaque niveau) — remplacés dès qu’un bulletin publié existe. */
export const PLACEHOLDER_HONOR_STUDENTS: PublicHonorStudent[] = [
  {
    classId: 'placeholder-6eme',
    className: '6ème A',
    classLevel: '6ème',
    firstName: 'Awa',
    lastName: 'Kouamé',
    average: 16.42,
    photoUrl: '/home/news-mission.jpg',
    isPlaceholder: true,
  },
  {
    classId: 'placeholder-5eme',
    className: '5ème A',
    classLevel: '5ème',
    firstName: 'Yao',
    lastName: "N'Guessan",
    average: 16.18,
    photoUrl: '/home/role-student.jpg',
    isPlaceholder: true,
  },
  {
    classId: 'placeholder-4eme',
    className: '4ème A',
    classLevel: '4ème',
    firstName: 'Mariam',
    lastName: 'Traoré',
    average: 16.75,
    photoUrl: '/home/news-portes-ouvertes.jpg',
    isPlaceholder: true,
  },
  {
    classId: 'placeholder-3eme',
    className: '3ème A',
    classLevel: '3ème',
    firstName: 'Koffi',
    lastName: 'Bamba',
    average: 17.12,
    photoUrl: '/home/experience-academique.jpg',
    isPlaceholder: true,
  },
  {
    classId: 'placeholder-2nde',
    className: '2nde A',
    classLevel: '2nde',
    firstName: 'Aminata',
    lastName: 'Diomandé',
    average: 16.88,
    photoUrl: '/home/news-semaine.jpg',
    isPlaceholder: true,
  },
  {
    classId: 'placeholder-1ere',
    className: '1ère A',
    classLevel: '1ère',
    firstName: 'Jean-Marc',
    lastName: 'Koné',
    average: 17.04,
    photoUrl: '/home/pillar-pedagogy.jpg',
    isPlaceholder: true,
  },
  {
    classId: 'placeholder-terminale',
    className: 'Terminale A',
    classLevel: 'Terminale',
    firstName: 'Fatou',
    lastName: 'Ouattara',
    average: 17.36,
    photoUrl: '/home/experience-familles.jpg',
    isPlaceholder: true,
  },
];

function normalizeHonorLevel(level: string): string {
  return level
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '');
}

export type PublicHonorRoll = {
  academicYear: string;
  period: string;
  periodLabel: string;
  students: PublicHonorStudent[];
};

export function isOfficialExamKind(value: string): value is OfficialExamKind {
  return (OFFICIAL_EXAM_KINDS as readonly string[]).includes(value);
}

export function computePassRate(candidates: number | null, admitted: number | null): number | null {
  if (candidates == null || admitted == null || candidates <= 0) return null;
  if (admitted < 0) return null;
  return Math.round((Math.min(admitted, candidates) / candidates) * 1000) / 10;
}

export function roundPassRate(value: number): number {
  return Math.round(value * 10) / 10;
}

function periodRank(period: string): number {
  return PERIOD_PRIORITY[toPeriodKey(period)] ?? 0;
}

type ExamStatRow = {
  id: string;
  examKind: string;
  examLabel: string;
  academicYear: string;
  candidates: number | null;
  admitted: number | null;
  passRate: number;
  displayOrder: number;
  isPublished: boolean;
  schoolId: string | null;
};

type HonorSettingRow = {
  id: string;
  enabled: boolean;
  academicYear: string | null;
  period: string | null;
  updatedAt: Date;
};

type ExamStatDelegate = {
  findMany: (args: unknown) => Promise<ExamStatRow[]>;
  findUnique: (args: { where: { id: string } }) => Promise<ExamStatRow | null>;
  create: (args: { data: Omit<ExamStatRow, 'id'> }) => Promise<ExamStatRow>;
  update: (args: { where: { id: string }; data: Partial<ExamStatRow> }) => Promise<ExamStatRow>;
  delete: (args: { where: { id: string } }) => Promise<unknown>;
};

type HonorSettingDelegate = {
  findUnique: (args: { where: { id: string } }) => Promise<HonorSettingRow | null>;
  create: (args: {
    data: { id: string; enabled: boolean; academicYear: string | null; period: string | null };
  }) => Promise<HonorSettingRow>;
  update: (args: {
    where: { id: string };
    data: { enabled?: boolean; academicYear?: string | null; period?: string | null };
  }) => Promise<HonorSettingRow>;
};

function examStatDelegate(): ExamStatDelegate | undefined {
  return (prisma as unknown as { officialExamAdmissionStat?: ExamStatDelegate }).officialExamAdmissionStat;
}

function honorSettingDelegate(): HonorSettingDelegate | undefined {
  return (prisma as unknown as { publicHonorRollSetting?: HonorSettingDelegate }).publicHonorRollSetting;
}

type MongoDoc = Record<string, unknown>;

function mongoCommand(command: object): Prisma.InputJsonObject {
  return command as Prisma.InputJsonObject;
}

function mongoId(doc: MongoDoc): string {
  const id = doc._id;
  if (typeof id === 'string') return id;
  if (id && typeof id === 'object' && '$oid' in id) return String((id as { $oid: string }).$oid);
  return String(id ?? '');
}

function mongoScalarId(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value && '$oid' in value) {
    return String((value as { $oid: string }).$oid);
  }
  return String(value);
}

async function mongoFind(collection: string, filter: Record<string, unknown>, sort?: Record<string, number>) {
  const result = (await prisma.$runCommandRaw(
    mongoCommand({
      find: collection,
      filter,
      ...(sort ? { sort } : {}),
    }),
  )) as { cursor?: { firstBatch?: MongoDoc[] } };
  return result.cursor?.firstBatch ?? [];
}

function mapExamStatDoc(doc: MongoDoc) {
  return {
    id: mongoId(doc),
    examKind: String(doc.examKind ?? ''),
    examLabel: String(doc.examLabel ?? ''),
    academicYear: String(doc.academicYear ?? ''),
    candidates: typeof doc.candidates === 'number' ? doc.candidates : null,
    admitted: typeof doc.admitted === 'number' ? doc.admitted : null,
    passRate: typeof doc.passRate === 'number' ? doc.passRate : 0,
    displayOrder: typeof doc.displayOrder === 'number' ? doc.displayOrder : 0,
    isPublished: doc.isPublished === true,
    schoolId: mongoScalarId(doc.schoolId),
  };
}

export async function getHonorRollSetting(schoolId: string) {
  const delegate = honorSettingDelegate();
  if (delegate) {
    return delegate.findUnique({ where: { id: schoolId } });
  }
  const rows = await mongoFind('public_honor_roll_settings', { _id: schoolId });
  const row = rows[0];
  if (!row) return null;
  return {
    id: mongoId(row),
    enabled: row.enabled === true,
    academicYear: typeof row.academicYear === 'string' ? row.academicYear : null,
    period: typeof row.period === 'string' ? row.period : null,
    updatedAt: new Date(),
  };
}

export async function upsertHonorRollSetting(
  schoolId: string,
  data: { enabled?: boolean; academicYear?: string | null; period?: string | null }
) {
  const delegate = honorSettingDelegate();
  if (delegate) {
    const existing = await delegate.findUnique({ where: { id: schoolId } });
    const payload: { enabled?: boolean; academicYear?: string | null; period?: string | null } = {};
    if (data.enabled !== undefined) payload.enabled = data.enabled;
    if (data.academicYear !== undefined) payload.academicYear = data.academicYear;
    if (data.period !== undefined) payload.period = data.period;
    if (!existing) {
      return delegate.create({
        data: {
          id: schoolId,
          enabled: data.enabled ?? true,
          academicYear: data.academicYear ?? null,
          period: data.period ?? null,
        },
      });
    }
    return delegate.update({
      where: { id: schoolId },
      data: payload,
    });
  }

  const existing = await getHonorRollSetting(schoolId);
  const next = {
    _id: schoolId,
    enabled: data.enabled ?? existing?.enabled ?? true,
    academicYear:
      data.academicYear !== undefined ? data.academicYear : existing?.academicYear ?? null,
    period: data.period !== undefined ? data.period : existing?.period ?? null,
    updatedAt: new Date(),
  };
  if (!existing) {
    await prisma.$runCommandRaw(
      mongoCommand({
        insert: 'public_honor_roll_settings',
        documents: [next],
      }),
    );
  } else {
    await prisma.$runCommandRaw(
      mongoCommand({
        update: 'public_honor_roll_settings',
        updates: [{ q: { _id: schoolId }, u: { $set: next } }],
      }),
    );
  }
  return {
    id: schoolId,
    enabled: next.enabled,
    academicYear: next.academicYear,
    period: next.period,
    updatedAt: next.updatedAt,
  };
}

export async function listPublishedExamStats(opts: {
  schoolId: string;
  academicYear?: string;
}): Promise<PublicExamStat[]> {
  const rows = await listExamStatsForAdmin({
    schoolId: opts.schoolId,
    academicYear: opts.academicYear?.trim() || getCurrentAcademicYear(),
  });
  return rows
    .filter((row) => row.isPublished)
    .map((row) => ({
      id: row.id,
      examKind: row.examKind,
      examLabel: row.examLabel,
      academicYear: row.academicYear,
      candidates: row.candidates,
      admitted: row.admitted,
      passRate: row.passRate,
    }));
}

export async function listExamStatsForAdmin(opts: { schoolId?: string; academicYear: string }) {
  const delegate = examStatDelegate();
  if (delegate) {
    const rows = await delegate.findMany({
      where: {
        academicYear: opts.academicYear,
        ...(opts.schoolId ? { OR: [{ schoolId: opts.schoolId }, { schoolId: null }] } : {}),
      },
      orderBy: [{ displayOrder: 'asc' }, { examLabel: 'asc' }],
    });
    return rows.map((row) => ({
      id: row.id,
      examKind: row.examKind,
      examLabel: row.examLabel,
      academicYear: row.academicYear,
      candidates: row.candidates,
      admitted: row.admitted,
      passRate: row.passRate,
      displayOrder: row.displayOrder,
      isPublished: row.isPublished,
      schoolId: row.schoolId,
    }));
  }

  const docs = await mongoFind(
    'official_exam_admission_stats',
    { academicYear: opts.academicYear },
    { displayOrder: 1, examLabel: 1 }
  );
  return docs
    .map(mapExamStatDoc)
    .filter((row) => !opts.schoolId || !row.schoolId || row.schoolId === opts.schoolId);
}

export async function createExamStat(data: {
  examKind: string;
  examLabel: string;
  academicYear: string;
  candidates: number | null;
  admitted: number | null;
  passRate: number;
  displayOrder: number;
  isPublished: boolean;
  schoolId: string | null;
}) {
  const delegate = examStatDelegate();
  if (delegate) {
    return delegate.create({ data });
  }
  const now = new Date();
  const doc: MongoDoc = {
    ...data,
    schoolId: data.schoolId ? { $oid: data.schoolId } : null,
    createdAt: now,
    updatedAt: now,
  };
  const inserted = (await prisma.$runCommandRaw(
    mongoCommand({
      insert: 'official_exam_admission_stats',
      documents: [doc],
    }),
  )) as { n?: number; ok?: number; writeErrors?: unknown[] };
  if (inserted.ok === 0 || (inserted.writeErrors && inserted.writeErrors.length > 0)) {
    throw new Error('Impossible d’enregistrer le taux d’admission');
  }
  const rows = await listExamStatsForAdmin({
    schoolId: data.schoolId ?? undefined,
    academicYear: data.academicYear,
  });
  return rows.find((row) => row.examLabel === data.examLabel && row.examKind === data.examKind) ?? {
    id: '',
    ...data,
  };
}

export async function updateExamStat(
  id: string,
  data: Partial<Omit<ExamStatRow, 'id' | 'schoolId'>>
) {
  const delegate = examStatDelegate();
  if (delegate) {
    return delegate.update({ where: { id }, data });
  }
  const set: MongoDoc = { updatedAt: new Date() };
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) set[key] = value;
  }
  await prisma.$runCommandRaw(
    mongoCommand({
      update: 'official_exam_admission_stats',
      updates: [{ q: { _id: { $oid: id } }, u: { $set: set } }],
    }),
  );
  const docs = await mongoFind('official_exam_admission_stats', { _id: { $oid: id } });
  const doc = docs[0];
  if (!doc) throw new Error('Résultat introuvable');
  return mapExamStatDoc(doc);
}

export async function deleteExamStat(id: string) {
  const delegate = examStatDelegate();
  if (delegate) {
    await delegate.delete({ where: { id } });
    return;
  }
  await prisma.$runCommandRaw(
    mongoCommand({
      delete: 'official_exam_admission_stats',
      deletes: [{ q: { _id: { $oid: id } }, limit: 1 }],
    }),
  );
}

export async function getExamStatById(id: string) {
  const delegate = examStatDelegate();
  if (delegate) {
    return delegate.findUnique({ where: { id } });
  }
  const docs = await mongoFind('official_exam_admission_stats', { _id: { $oid: id } });
  const doc = docs[0];
  return doc ? mapExamStatDoc(doc) : null;
}

function mergeHonorStudentsWithPlaceholders(real: PublicHonorStudent[]): PublicHonorStudent[] {
  const realByLevel = new Map<string, PublicHonorStudent>();
  for (const student of real) {
    const key = normalizeHonorLevel(student.classLevel);
    const current = realByLevel.get(key);
    if (!current || student.average > current.average) {
      realByLevel.set(key, student);
    }
  }

  const usedKeys = new Set<string>();
  const merged: PublicHonorStudent[] = HONOR_ROLL_LEVELS.map((level) => {
    const key = normalizeHonorLevel(level);
    const fromDb = realByLevel.get(key);
    usedKeys.add(key);
    const placeholder = PLACEHOLDER_HONOR_STUDENTS.find(
      (row) => normalizeHonorLevel(row.classLevel) === key
    );
    return fromDb ?? placeholder!;
  });

  for (const [key, student] of realByLevel) {
    if (!usedKeys.has(key)) merged.push(student);
  }

  return merged;
}

export async function buildHonorRoll(opts: {
  schoolId: string;
  academicYear?: string | null;
  period?: string | null;
}): Promise<PublicHonorRoll> {
  const academicYear = opts.academicYear?.trim() || getCurrentAcademicYear();
  const requestedPeriod = opts.period?.trim() ? toPeriodKey(opts.period.trim()) : null;

  const emptyRoll = (period: string): PublicHonorRoll => ({
    academicYear,
    period,
    periodLabel: getPeriodLabel(period),
    students: mergeHonorStudentsWithPlaceholders([]),
  });

  const classes = await prisma.class.findMany({
    where: { schoolId: opts.schoolId, academicYear },
    select: { id: true, name: true, level: true },
  });
  if (classes.length === 0) return emptyRoll(requestedPeriod || 'trim3');

  const classById = new Map(classes.map((c) => [c.id, c]));
  const students = await prisma.student.findMany({
    where: {
      classId: { in: classes.map((c) => c.id) },
      isActive: true,
      enrollmentStatus: 'ACTIVE',
    },
    select: {
      id: true,
      classId: true,
      user: { select: { firstName: true, lastName: true, avatar: true } },
    },
  });
  if (students.length === 0) return emptyRoll(requestedPeriod || 'trim3');

  const studentById = new Map(students.map((s) => [s.id, s]));
  const cards = await prisma.reportCard.findMany({
    where: {
      studentId: { in: students.map((s) => s.id) },
      academicYear,
      published: true,
    },
    select: {
      studentId: true,
      period: true,
      average: true,
      rank: true,
      publishedAt: true,
    },
  });
  if (cards.length === 0) return emptyRoll(requestedPeriod || 'trim3');

  let period = requestedPeriod;
  if (!period) {
    const latest = [...cards].sort((a, b) => {
      const aTime = (a.publishedAt ?? new Date(0)).getTime();
      const bTime = (b.publishedAt ?? new Date(0)).getTime();
      if (bTime !== aTime) return bTime - aTime;
      return periodRank(b.period) - periodRank(a.period);
    })[0];
    period = latest ? toPeriodKey(latest.period) : null;
  }
  if (!period) return emptyRoll('trim3');

  const periodCards = cards.filter((card) => toPeriodKey(card.period) === period);
  const bestByClass = new Map<
    string,
    { studentId: string; average: number; rank: number | null }
  >();
  for (const card of periodCards) {
    const student = studentById.get(card.studentId);
    if (!student?.classId || card.average <= 0) continue;
    const current = bestByClass.get(student.classId);
    const rank = card.rank ?? null;
    if (!current) {
      bestByClass.set(student.classId, { studentId: card.studentId, average: card.average, rank });
      continue;
    }
    const betterRank =
      rank != null && current.rank != null
        ? rank < current.rank
        : rank != null && current.rank == null
          ? true
          : rank == null && current.rank != null
            ? false
            : card.average > current.average;
    if (betterRank) {
      bestByClass.set(student.classId, { studentId: card.studentId, average: card.average, rank });
    }
  }

  const winnerIds = [...bestByClass.values()].map((row) => row.studentId);
  const photoAllowed = await studentsWithImagePublicationConsent(winnerIds);

  const studentsOut: PublicHonorStudent[] = [];
  for (const [classId, row] of bestByClass) {
    const cls = classById.get(classId);
    const student = studentById.get(row.studentId);
    if (!cls || !student) continue;
    studentsOut.push({
      classId,
      className: cls.name,
      classLevel: cls.level,
      firstName: student.user.firstName,
      lastName: student.user.lastName,
      average: Math.round(row.average * 100) / 100,
      photoUrl:
        photoAllowed.has(student.id) ? sanitizeBrandingAssetUrl(student.user.avatar) : null,
      isPlaceholder: false,
    });
  }

  return {
    academicYear,
    period,
    periodLabel: getPeriodLabel(period),
    students: mergeHonorStudentsWithPlaceholders(studentsOut),
  };
}

async function studentsWithImagePublicationConsent(studentIds: string[]): Promise<Set<string>> {
  const allowed = new Set<string>();
  if (studentIds.length === 0) return allowed;

  const consents = await prisma.parentConsent.findMany({
    where: {
      consentType: 'IMAGE_PUBLICATION',
      granted: true,
      OR: [{ studentId: { in: studentIds } }, { studentId: null }],
    },
    select: { studentId: true, parentId: true },
  });

  const genericParentIds = consents.filter((c) => !c.studentId).map((c) => c.parentId);
  const childrenOfGeneric =
    genericParentIds.length > 0
      ? await prisma.studentParent.findMany({
          where: { parentId: { in: genericParentIds }, studentId: { in: studentIds } },
          select: { studentId: true },
        })
      : [];

  for (const consent of consents) {
    if (consent.studentId) allowed.add(consent.studentId);
  }
  for (const link of childrenOfGeneric) {
    allowed.add(link.studentId);
  }
  return allowed;
}
