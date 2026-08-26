/**
 * Crée un élève + parent liés (e-mail parent fourni en arg ou env).
 * Usage: npx tsx scripts/create-demo-student-parent.ts kouassistephane489@gmail.com
 */
import 'dotenv/config';
import prisma from '../src/utils/prisma';
import { hashPassword } from '../src/utils/password.util';
import { buildStudentLoginEmailFromMatricule } from '../src/utils/student-login-identifier.util';

async function main() {
  let parentEmail = (process.argv[2] || process.env.PARENT_EMAIL || '')
    .trim()
    .toLowerCase();
  if (!parentEmail || !parentEmail.includes('@')) {
    throw new Error('E-mail parent requis: npx tsx scripts/create-demo-student-parent.ts email@gmail.com');
  }

  const passwordPlain = process.env.DEMO_PASSWORD?.trim() || 'ParentDemo1!';
  const hashed = await hashPassword(passwordPlain);

  const school = await prisma.school.findFirst({ orderBy: { createdAt: 'asc' } });
  const klass = school
    ? await prisma.class.findFirst({
        where: { schoolId: school.id },
        orderBy: { name: 'asc' },
      })
    : await prisma.class.findFirst({ orderBy: { name: 'asc' } });

  const suffix = Date.now().toString(36).slice(-6).toUpperCase();
  const studentMatricule = `STU${suffix}`;
  const studentEmail = buildStudentLoginEmailFromMatricule(studentMatricule);

  const existingParent = await prisma.user.findUnique({ where: { email: parentEmail } });
  if (existingParent && existingParent.role !== 'PARENT') {
    // Gmail +alias → même boîte ; permet de garder le compte existant (ex. SUPER_ADMIN)
    const [local, domain] = parentEmail.split('@');
    const aliased = `${local}+parent@${domain}`;
    console.warn(
      `Attention: ${parentEmail} est déjà ${existingParent.role}. Parent créé avec l'alias ${aliased} (même boîte Gmail).`,
    );
    parentEmail = aliased;
  }

  const existingParentUser = await prisma.user.findUnique({ where: { email: parentEmail } });
  if (existingParentUser && existingParentUser.role !== 'PARENT') {
    throw new Error(`L'e-mail ${parentEmail} existe déjà avec le rôle ${existingParentUser.role}`);
  }

  let parentUserId = existingParentUser?.id;
  let parentProfileId: string | undefined;

  if (existingParentUser) {
    const profile = await prisma.parent.findUnique({ where: { userId: existingParentUser.id } });
    if (!profile) {
      const created = await prisma.parent.create({
        data: {
          userId: existingParentUser.id,
          notifyEmail: true,
          notifySms: true,
          profession: 'Parent',
        },
      });
      parentProfileId = created.id;
    } else {
      parentProfileId = profile.id;
      await prisma.parent.update({
        where: { id: profile.id },
        data: { notifyEmail: true },
      });
    }
    console.log(`Parent existant réutilisé: ${parentEmail}`);
  } else {
    const parentUser = await prisma.user.create({
      data: {
        email: parentEmail,
        password: hashed,
        firstName: 'Stéphane',
        lastName: 'Kouassi',
        role: 'PARENT',
        phone: '+2250700000000',
        isActive: true,
        parentProfile: {
          create: {
            profession: 'Parent',
            notifyEmail: true,
            notifySms: true,
          },
        },
      },
      include: { parentProfile: true },
    });
    parentUserId = parentUser.id;
    parentProfileId = parentUser.parentProfile!.id;
    console.log(`Parent créé: ${parentEmail}`);
  }

  const studentUser = await prisma.user.create({
    data: {
      email: studentEmail,
      password: hashed,
      firstName: 'Aya',
      lastName: 'Kouassi',
      role: 'STUDENT',
      isActive: true,
      studentProfile: {
        create: {
          studentId: studentMatricule,
          dateOfBirth: new Date('2012-03-15'),
          gender: 'FEMALE',
          schoolId: school?.id ?? null,
          classId: klass?.id ?? null,
          enrollmentStatus: 'ACTIVE',
          isActive: true,
          address: 'Abidjan',
          emergencyContact: 'Stéphane Kouassi',
          emergencyPhone: '+2250700000000',
        },
      },
    },
    include: { studentProfile: true },
  });

  const studentProfile = studentUser.studentProfile!;
  await prisma.studentParent.create({
    data: {
      studentId: studentProfile.id,
      parentId: parentProfileId!,
      relation: 'father',
    },
  });

  console.log('\n=== OK ===');
  console.log(`École: ${school?.name ?? '(aucune)'} (${school?.id ?? '—'})`);
  console.log(`Classe: ${klass?.name ?? '(aucune)'} (${klass?.id ?? '—'})`);
  console.log(`Parent: ${parentEmail} / mdp: ${passwordPlain}`);
  console.log(`Élève: ${studentUser.firstName} ${studentUser.lastName}`);
  console.log(`Matricule élève: ${studentMatricule}`);
  console.log(`Login élève: ${studentEmail} / mdp: ${passwordPlain}`);
  console.log(`Lien parent↔élève: OK (notifyEmail=true)`);
  console.log(`parentUserId=${parentUserId}`);
  console.log(`studentId=${studentProfile.id}`);
}

main()
  .catch((e) => {
    console.error('ÉCHEC:', e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
