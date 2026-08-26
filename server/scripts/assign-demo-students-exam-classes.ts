import prisma from '../src/utils/prisma';

async function main() {
  const c3 = await prisma.class.findFirst({
    where: { name: '3ème A (examens)', level: '3ème' },
  });
  const tle = await prisma.class.findFirst({
    where: { name: 'Terminale A (examens)', level: 'Terminale' },
  });
  const s8 = await prisma.student.findFirst({
    where: { user: { email: 'student8@school.com' } },
    include: { user: { select: { email: true, firstName: true, lastName: true } } },
  });
  const s9 = await prisma.student.findFirst({
    where: { user: { email: 'student9@school.com' } },
    include: { user: { select: { email: true, firstName: true, lastName: true } } },
  });

  if (!c3 || !tle || !s8 || !s9) {
    console.error('Manquant:', { c3: !!c3, tle: !!tle, s8: !!s8, s9: !!s9 });
    process.exit(1);
  }

  await prisma.student.update({ where: { id: s8.id }, data: { classId: c3.id } });
  await prisma.student.update({ where: { id: s9.id }, data: { classId: tle.id } });

  console.log(`OK ${s8.user.email} → ${c3.name}`);
  console.log(`OK ${s9.user.email} → ${tle.name}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
