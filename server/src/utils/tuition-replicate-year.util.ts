import type { Prisma } from '@prisma/client';
import prisma from './prisma';
import { parseScheduleLines } from './tuition-catalog.util';

export type ReplicateTuitionYearResult = {
  targetYear: string;
  sourceYear: string;
  catalogsCopied: number;
  catalogsSkipped: number;
  templatesCopied: number;
  templatesSkipped: number;
};

function catalogDedupKey(row: {
  label: string;
  scope: string;
  classLevel: string | null;
  classId: string | null;
  feeType: string;
  billingPeriod: string;
  programLabel: string | null;
}): string {
  return [
    row.label,
    row.scope,
    row.classLevel ?? '',
    row.classId ?? '',
    row.feeType,
    row.billingPeriod,
    row.programLabel ?? '',
  ].join('|');
}

/**
 * Copie les structures de frais et gabarits d'échéancier d'une année source vers l'année cible,
 * sans créer de doublons (même clé métier).
 */
export async function replicateTuitionStructures(
  sourceYear: string,
  targetYear: string,
): Promise<ReplicateTuitionYearResult> {
  const source = String(sourceYear).trim();
  const target = String(targetYear).trim();
  if (!source || !target) {
    throw new Error('Année source et année cible sont requises');
  }
  if (source === target) {
    throw new Error('L’année source et l’année cible doivent être différentes');
  }

  const sourceTemplates = await prisma.tuitionPaymentScheduleTemplate.findMany({
    where: { academicYear: source, isActive: true },
  });
  const targetTemplates = await prisma.tuitionPaymentScheduleTemplate.findMany({
    where: { academicYear: target },
  });
  const targetTemplateNames = new Set(targetTemplates.map((t) => t.name.trim().toLowerCase()));

  const templateIdMap = new Map<string, string>();
  let templatesCopied = 0;
  let templatesSkipped = 0;

  for (const tpl of sourceTemplates) {
    const key = tpl.name.trim().toLowerCase();
    const existing = targetTemplates.find((t) => t.name.trim().toLowerCase() === key);
    if (existing) {
      templateIdMap.set(tpl.id, existing.id);
      templatesSkipped += 1;
      continue;
    }
    if (targetTemplateNames.has(key)) {
      templatesSkipped += 1;
      continue;
    }
    const lines = parseScheduleLines(tpl.lines);
    const created = await prisma.tuitionPaymentScheduleTemplate.create({
      data: {
        name: tpl.name,
        description: tpl.description,
        academicYear: target,
        lines: lines as unknown as Prisma.InputJsonValue,
        isActive: tpl.isActive,
      },
    });
    templateIdMap.set(tpl.id, created.id);
    targetTemplateNames.add(key);
    templatesCopied += 1;
  }

  const sourceCatalogs = await prisma.tuitionFeeCatalog.findMany({
    where: { academicYear: source, isActive: true },
  });
  const targetCatalogs = await prisma.tuitionFeeCatalog.findMany({
    where: { academicYear: target },
  });
  const targetCatalogKeys = new Set(targetCatalogs.map((c) => catalogDedupKey(c)));

  let catalogsCopied = 0;
  let catalogsSkipped = 0;

  for (const cat of sourceCatalogs) {
    const key = catalogDedupKey(cat);
    if (targetCatalogKeys.has(key)) {
      catalogsSkipped += 1;
      continue;
    }
    const mappedScheduleId = cat.scheduleTemplateId
      ? templateIdMap.get(cat.scheduleTemplateId) ?? null
      : null;

    await prisma.tuitionFeeCatalog.create({
      data: {
        label: cat.label,
        academicYear: target,
        scope: cat.scope,
        classLevel: cat.classLevel,
        classId: cat.classId,
        programLabel: cat.programLabel,
        feeType: cat.feeType,
        billingPeriod: cat.billingPeriod,
        defaultAmount: cat.defaultAmount,
        periodLabelHint: cat.periodLabelHint,
        sortOrder: cat.sortOrder,
        isActive: cat.isActive,
        scheduleTemplateId: mappedScheduleId,
      },
    });
    targetCatalogKeys.add(key);
    catalogsCopied += 1;
  }

  return {
    sourceYear: source,
    targetYear: target,
    catalogsCopied,
    catalogsSkipped,
    templatesCopied,
    templatesSkipped,
  };
}
