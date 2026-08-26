/**
 * Seed des examens blancs de démonstration (BEPC / BAC).
 * Usage: npx tsx scripts/seed-mock-exams.ts
 *
 * Remplace les examens dont le titre commence par [DEMO].
 * Crée aussi les classes « 3ème A (examens) » et « Terminale A (examens) » si absentes.
 */
import { seedMockExamDemoData } from '../src/utils/seed-mock-exams.util';
import prisma from '../src/utils/prisma';

async function main() {
  console.log('📝 Seed examens blancs (données de test)…');
  const result = await seedMockExamDemoData(prisma, { replaceExisting: true });
  console.log(`Année scolaire : ${result.academicYear}`);
  console.log(`École : ${result.schoolId ?? '—'}`);
  console.log(`Enseignant lié : ${result.teacherId ?? '—'}`);
  console.log(`Classes : 3ème=${result.classIds.troisieme}, Terminale=${result.classIds.terminale}`);
  console.log(`Examens [DEMO] retirés : ${result.removedCount}`);
  console.log(`Examens créés : ${result.createdExamIds.length}`);
  for (const id of result.createdExamIds) {
    console.log(`  - ${id}`);
  }
  console.log('OK.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
