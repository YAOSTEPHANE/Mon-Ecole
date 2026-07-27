/**
 * Fusionne les établissements en double (même slug) avant création de l'index unique.
 * Usage: npx tsx scripts/repair-duplicate-schools.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateSchoolId(
  model: keyof Pick<
    PrismaClient,
    | 'class'
    | 'student'
    | 'admission'
    | 'staffMember'
    | 'healthCampaign'
    | 'adminWorkspace'
    | 'menaTransmission'
    | 'schoolExpense'
    | 'pettyCashMovement'
    | 'supplier'
    | 'canteenMealPlan'
    | 'transportRoute'
    | 'mockExam'
  >,
  fromId: string,
  toId: string,
): Promise<number> {
  const delegate = prisma[model] as {
    updateMany: (args: {
      where: { schoolId: string };
      data: { schoolId: string };
    }) => Promise<{ count: number }>;
  };
  const result = await delegate.updateMany({
    where: { schoolId: fromId },
    data: { schoolId: toId },
  });
  return result.count;
}

async function mergeDuplicateSchools(keeperId: string, duplicateId: string): Promise<void> {
  console.log(`Fusion ${duplicateId} → ${keeperId}`);

  const simpleModels = [
    'class',
    'student',
    'admission',
    'staffMember',
    'healthCampaign',
    'adminWorkspace',
    'menaTransmission',
    'schoolExpense',
    'pettyCashMovement',
    'supplier',
    'canteenMealPlan',
    'transportRoute',
    'mockExam',
  ] as const;

  for (const model of simpleModels) {
    const count = await updateSchoolId(model, duplicateId, keeperId);
    if (count > 0) console.log(`  ${model}: ${count}`);
  }

  const duplicateMembers = await prisma.schoolMember.findMany({
    where: { schoolId: duplicateId },
  });
  for (const member of duplicateMembers) {
    const existing = await prisma.schoolMember.findUnique({
      where: { schoolId_userId: { schoolId: keeperId, userId: member.userId } },
    });
    if (existing) {
      await prisma.schoolMember.delete({ where: { id: member.id } });
      console.log(`  schoolMember: supprimé doublon userId=${member.userId}`);
    } else {
      await prisma.schoolMember.update({
        where: { id: member.id },
        data: { schoolId: keeperId },
      });
      console.log(`  schoolMember: migré userId=${member.userId}`);
    }
  }

  const keeperMetiers = await prisma.schoolStaffMetier.findMany({
    where: { schoolId: keeperId },
    select: { supportKind: true },
  });
  const keeperKinds = new Set(keeperMetiers.map((m) => m.supportKind));

  const duplicateMetiers = await prisma.schoolStaffMetier.findMany({
    where: { schoolId: duplicateId },
  });
  for (const metier of duplicateMetiers) {
    if (keeperKinds.has(metier.supportKind)) {
      await prisma.schoolStaffMetier.delete({ where: { id: metier.id } });
      console.log(`  schoolStaffMetier: supprimé doublon supportKind=${metier.supportKind}`);
    } else {
      await prisma.schoolStaffMetier.update({
        where: { id: metier.id },
        data: { schoolId: keeperId },
      });
      keeperKinds.add(metier.supportKind);
      console.log(`  schoolStaffMetier: migré supportKind=${metier.supportKind}`);
    }
  }

  const duplicateBranding = await prisma.appBranding.findFirst({
    where: { schoolId: duplicateId },
  });
  if (duplicateBranding) {
    const keeperBranding = await prisma.appBranding.findFirst({
      where: { schoolId: keeperId },
    });
    if (keeperBranding) {
      await prisma.appBranding.delete({ where: { id: duplicateBranding.id } });
      console.log('  appBranding: supprimé doublon');
    } else {
      await prisma.appBranding.update({
        where: { id: duplicateBranding.id },
        data: { schoolId: keeperId },
      });
      console.log('  appBranding: migré');
    }
  }

  await prisma.school.delete({ where: { id: duplicateId } });
  console.log(`  school: supprimé ${duplicateId}`);
}

async function main() {
  const schools = await prisma.school.findMany({ orderBy: { createdAt: 'asc' } });
  const bySlug = new Map<string, typeof schools>();

  for (const school of schools) {
    const list = bySlug.get(school.slug) ?? [];
    list.push(school);
    bySlug.set(school.slug, list);
  }

  let merged = 0;
  for (const [slug, list] of bySlug) {
    if (list.length <= 1) continue;

    console.log(`\nSlug dupliqué "${slug}" (${list.length} entrées)`);
    const [keeper, ...duplicates] = list;
    await prisma.school.update({
      where: { id: keeper.id },
      data: { isDefault: true },
    });

    for (const duplicate of duplicates) {
      await mergeDuplicateSchools(keeper.id, duplicate.id);
      merged++;
    }
  }

  const defaultSchools = await prisma.school.findMany({
    where: { isDefault: true },
    orderBy: { createdAt: 'asc' },
  });
  if (defaultSchools.length > 1) {
    const [keeper, ...extras] = defaultSchools;
    for (const extra of extras) {
      await prisma.school.update({
        where: { id: extra.id },
        data: { isDefault: false },
      });
    }
    console.log(`\nPlusieurs isDefault: conservé ${keeper.id}, ${extras.length} désactivé(s).`);
  }

  if (merged === 0) {
    console.log('Aucun doublon à fusionner.');
  } else {
    console.log(`\nTerminé: ${merged} établissement(s) fusionné(s).`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
