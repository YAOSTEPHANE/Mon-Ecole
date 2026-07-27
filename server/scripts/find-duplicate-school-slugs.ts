import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const schools = await prisma.school.findMany({ orderBy: { createdAt: 'asc' } });
  console.log('Total schools:', schools.length);

  const bySlug = new Map<string, typeof schools>();
  for (const school of schools) {
    const list = bySlug.get(school.slug) ?? [];
    list.push(school);
    bySlug.set(school.slug, list);
  }

  let duplicateCount = 0;
  for (const [slug, list] of bySlug) {
    if (list.length > 1) {
      duplicateCount++;
      console.log('\nDuplicate slug:', slug, 'count:', list.length);
      for (const school of list) {
        console.log(
          '  id:',
          school.id,
          'name:',
          school.name,
          'isDefault:',
          school.isDefault,
          'isActive:',
          school.isActive,
          'createdAt:',
          school.createdAt.toISOString(),
        );
      }
    }
  }

  if (duplicateCount === 0) {
    console.log('\nNo duplicate slugs found.');
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
