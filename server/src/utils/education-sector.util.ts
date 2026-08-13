import type { EducationSector } from '@prisma/client';
import prisma from './prisma';

export const EDUCATION_SECTORS = ['GENERAL', 'TECHNICAL'] as const satisfies readonly EducationSector[];

export type EducationSectorValue = (typeof EDUCATION_SECTORS)[number];

export function isEducationSector(value: unknown): value is EducationSectorValue {
  return typeof value === 'string' && EDUCATION_SECTORS.includes(value as EducationSectorValue);
}

/** Résout la voie d'enseignement à partir d'une classe (classe > filière > GENERAL). */
export async function resolveEducationSectorFromClass(
  classId: string | null | undefined,
): Promise<EducationSectorValue | undefined> {
  if (!classId?.trim()) return undefined;

  const cls = await prisma.class.findUnique({
    where: { id: classId.trim() },
    select: {
      educationSector: true,
      track: { select: { educationSector: true } },
    },
  });

  if (!cls) return undefined;
  return cls.educationSector ?? cls.track?.educationSector ?? 'GENERAL';
}

/** Détermine le secteur à enregistrer pour un élève (explicite > classe > défaut). */
export async function resolveStudentEducationSector(input: {
  educationSector?: unknown;
  classId?: string | null;
}): Promise<EducationSectorValue> {
  if (isEducationSector(input.educationSector)) {
    return input.educationSector;
  }
  const fromClass = await resolveEducationSectorFromClass(input.classId);
  return fromClass ?? 'GENERAL';
}
