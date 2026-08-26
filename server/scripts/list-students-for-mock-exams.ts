import prisma from '../src/utils/prisma';

async function main() {
  const students = await prisma.student.findMany({
    where: { isActive: true },
    select: {
      studentId: true,
      class: { select: { name: true, level: true } },
      user: { select: { email: true, firstName: true, lastName: true } },
    },
    take: 100,
  });

  students.sort((a, b) => {
    const la = a.class?.level ?? '';
    const lb = b.class?.level ?? '';
    if (la !== lb) return la.localeCompare(lb, 'fr');
    return (a.user.lastName || '').localeCompare(b.user.lastName || '', 'fr');
  });

  const examLevels = new Set(['3ème', '3eme', 'Terminale', 'Tle', 'TLE']);
  const rows = students.map((s) => ({
    nom: `${s.user.lastName} ${s.user.firstName}`.trim(),
    email: s.user.email,
    matricule: s.studentId,
    classe: s.class ? `${s.class.name} (${s.class.level})` : '—',
    examensBlancs: s.class && examLevels.has(s.class.level) ? 'oui' : 'non',
  }));

  console.log('=== Élèves pour examens blancs ===');
  for (const r of rows.filter((x) => x.examensBlancs === 'oui')) {
    console.log(`- ${r.nom} | ${r.email} | ${r.classe} | ${r.matricule}`);
  }
  console.log('\n=== Autres élèves (échantillon) ===');
  for (const r of rows.filter((x) => x.examensBlancs === 'non').slice(0, 20)) {
    console.log(`- ${r.nom} | ${r.email} | ${r.classe} | ${r.matricule}`);
  }
  console.log(`\nTotal actifs listés: ${rows.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
