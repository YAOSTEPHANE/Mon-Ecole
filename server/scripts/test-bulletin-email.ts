/**
 * Test envoi e-mail bulletin au parent de l’élève STU9OFNMP (ou matricule arg).
 * Usage: npx tsx scripts/test-bulletin-email.ts [matricule]
 */
import 'dotenv/config';
import prisma from '../src/utils/prisma';
import { notifyBulletinsPublished } from '../src/utils/notify-important.util';
import { isSmtpConfigured } from '../src/utils/email.util';

async function main() {
  const matricule = (process.argv[2] || 'STU9OFNMP').trim();
  console.log('SMTP configuré:', isSmtpConfigured());

  const student = await prisma.student.findFirst({
    where: { studentId: matricule },
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
      parents: {
        include: {
          parent: {
            select: {
              notifyEmail: true,
              user: { select: { email: true, firstName: true, lastName: true } },
            },
          },
        },
      },
    },
  });
  if (!student) throw new Error(`Élève introuvable: ${matricule}`);

  console.log(`Élève: ${student.user.firstName} ${student.user.lastName}`);
  for (const p of student.parents) {
    console.log(
      `  Parent: ${p.parent.user.email} (notifyEmail=${p.parent.notifyEmail})`,
    );
  }

  await notifyBulletinsPublished(
    [{ studentId: student.id }],
    'Trimestre 1',
    '2025-2026',
  );

  console.log('\nOK: notification bulletin déclenchée.');
  console.log('Vérifie Gmail du parent (et spam).');
}

main()
  .catch((e) => {
    console.error('ÉCHEC:', e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
