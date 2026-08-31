/**
 * Simule un retard enseignant et notifie les ADMIN / SUPER_ADMIN.
 * Usage: npx tsx scripts/test-teacher-late-notify.ts
 */
import 'dotenv/config';
import prisma from '../src/utils/prisma';
import { notifyAdminsOfPersonnelLate } from '../src/utils/personnel-late-admin-notify.util';
import { isSmtpConfigured } from '../src/utils/email.util';
import { resolveActiveAdminUserIds } from '../src/utils/staff-notify.util';

async function main() {
  console.log('SMTP configuré:', isSmtpConfigured());

  const adminIds = await resolveActiveAdminUserIds();
  console.log(`Admins actifs à notifier: ${adminIds.length}`);
  if (adminIds.length === 0) {
    throw new Error('Aucun ADMIN / SUPER_ADMIN actif');
  }

  const admins = await prisma.user.findMany({
    where: { id: { in: adminIds } },
    select: { email: true, firstName: true, lastName: true, role: true },
  });
  for (const a of admins) {
    console.log(`  → ${a.role} ${a.firstName} ${a.lastName} <${a.email}>`);
  }

  const teacher = await prisma.teacher.findFirst({
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
      courses: { take: 1, select: { name: true, code: true } },
    },
  });
  if (!teacher) throw new Error('Aucun enseignant en base');

  const personName = `${teacher.user.firstName} ${teacher.user.lastName}`.trim();
  const course = teacher.courses[0];
  const contextLabel = course
    ? `${course.name}${course.code ? ` (${course.code})` : ''}`
    : 'Cours de test';
  const minutesLate = 18;
  const at = new Date();

  console.log(`\nEnseignant test: ${personName}`);
  console.log(`Contexte: ${contextLabel}`);
  console.log(`Retard simulé: ${minutesLate} min\n`);

  await notifyAdminsOfPersonnelLate({
    roleLabel: 'Enseignant',
    personName,
    minutesLate,
    contextLabel,
    at,
    link: '/admin?tab=teachers',
  });

  console.log('OK: notification retard enseignant déclenchée (in-app + e-mail si SMTP OK).');
  console.log('Vérifie la boîte Gmail des comptes ADMIN / SUPER_ADMIN (et les spams).');
}

main()
  .catch((e) => {
    console.error('ÉCHEC:', e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
