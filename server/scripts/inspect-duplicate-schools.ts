import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DUPLICATE_SLUG = 'etablissement-principal';

async function countRelations(schoolId: string) {
  const [
    members,
    classes,
    students,
    admissions,
    staffMembers,
    staffMetiers,
    healthCampaigns,
    workspaces,
    branding,
    menaTransmissions,
  ] = await Promise.all([
    prisma.schoolMember.count({ where: { schoolId } }),
    prisma.class.count({ where: { schoolId } }),
    prisma.student.count({ where: { schoolId } }),
    prisma.admission.count({ where: { schoolId } }),
    prisma.staffMember.count({ where: { schoolId } }),
    prisma.schoolStaffMetier.count({ where: { schoolId } }),
    prisma.healthCampaign.count({ where: { schoolId } }),
    prisma.adminWorkspace.count({ where: { schoolId } }),
    prisma.appBranding.count({ where: { schoolId } }),
    prisma.menaTransmission.count({ where: { schoolId } }),
  ]);

  return {
    members,
    classes,
    students,
    admissions,
    staffMembers,
    staffMetiers,
    healthCampaigns,
    workspaces,
    branding,
    menaTransmissions,
    total:
      members +
      classes +
      students +
      admissions +
      staffMembers +
      staffMetiers +
      healthCampaigns +
      workspaces +
      branding +
      menaTransmissions,
  };
}

async function main() {
  const schools = await prisma.school.findMany({
    where: { slug: DUPLICATE_SLUG },
    orderBy: { createdAt: 'asc' },
  });

  if (schools.length < 2) {
    console.log('No duplicates to inspect.');
    return;
  }

  for (const school of schools) {
    const counts = await countRelations(school.id);
    console.log('\nSchool:', school.id);
    console.log('  createdAt:', school.createdAt.toISOString());
    console.log('  counts:', counts);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
