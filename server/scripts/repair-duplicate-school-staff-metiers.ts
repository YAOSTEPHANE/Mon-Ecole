import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const metiers = await prisma.schoolStaffMetier.findMany({
    orderBy: [{ schoolId: 'asc' }, { supportKind: 'asc' }, { createdAt: 'asc' }],
  });

  const groups = new Map<string, typeof metiers>();
  for (const metier of metiers) {
    const key = `${metier.schoolId}:${metier.supportKind}`;
    const list = groups.get(key) ?? [];
    list.push(metier);
    groups.set(key, list);
  }

  let removed = 0;
  for (const [key, list] of groups) {
    if (list.length <= 1) continue;
    console.log(`Doublon ${key} (${list.length})`);
    const [, ...duplicates] = list;
    for (const duplicate of duplicates) {
      await prisma.schoolStaffMetier.delete({ where: { id: duplicate.id } });
      console.log(`  supprimé ${duplicate.id}`);
      removed++;
    }
  }

  console.log(removed === 0 ? 'Aucun doublon schoolStaffMetier.' : `\n${removed} doublon(s) supprimé(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
