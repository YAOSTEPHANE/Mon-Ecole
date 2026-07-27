import prisma from '../src/utils/prisma';

async function main() {
  const staff = [
    ['STF001', 280000],
    ['STF002', 320000],
    ['STF003', 400000],
    ['STF004', 260000],
    ['STF005', 240000],
    ['STF006', 300000],
  ] as const;
  for (const [employeeId, salary] of staff) {
    await prisma.staffMember.updateMany({ where: { employeeId }, data: { salary } });
  }
  await prisma.teacher.updateMany({ where: { employeeId: 'EMP001' }, data: { salary: 350000 } });
  await prisma.teacher.updateMany({ where: { employeeId: 'EMP002' }, data: { salary: 340000 } });
  await prisma.teacher.updateMany({ where: { employeeId: 'EMP003' }, data: { salary: 330000 } });
  await prisma.educator.updateMany({ where: { employeeId: 'EDU001' }, data: { salary: 320000 } });
  await prisma.educator.updateMany({ where: { employeeId: 'EDU002' }, data: { salary: 310000 } });
  console.log('Salaires de référence mis à jour.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
