/**
 * Diagnostic ponctuel : rejoue le select lite de GET /auth/me pour un user par rôle.
 */
import 'dotenv/config';
import prisma from '../src/utils/prisma';

const liteSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  role: true,
  avatar: true,
  isActive: true,
  uiPreferences: true,
  teacherProfile: {
    select: { id: true, employeeId: true, specialization: true },
  },
  studentProfile: {
    select: {
      id: true,
      studentId: true,
      enrollmentStatus: true,
      classId: true,
      class: { select: { id: true, name: true, level: true } },
    },
  },
  parentProfile: {
    select: {
      id: true,
      _count: { select: { students: true } },
    },
  },
  educatorProfile: {
    select: { id: true, employeeId: true, specialization: true },
  },
  staffProfile: {
    select: {
      id: true,
      employeeId: true,
      staffCategory: true,
      supportKind: true,
      jobTitle: true,
      department: true,
      visibleStaffModules: true,
    },
  },
} as const;

async function main() {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, email: true, role: true },
    orderBy: { role: 'asc' },
  });

  const seen = new Set<string>();
  for (const u of users) {
    if (seen.has(u.role)) continue;
    seen.add(u.role);
    try {
      await prisma.user.findUnique({ where: { id: u.id }, select: liteSelect });
      console.log(`OK ${u.role}`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.log(`FAIL ${u.role} ${u.email}: ${msg}`);
    }
  }

  await prisma.$disconnect();
}

void main();
