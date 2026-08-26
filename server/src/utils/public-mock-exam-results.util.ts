import type { PrismaClient } from '@prisma/client';
import { getCurrentAcademicYear } from './report-card.util';

type Db = PrismaClient;

function normalizePersonName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function matriculeVariants(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  return Array.from(new Set([trimmed, trimmed.toUpperCase(), trimmed.toLowerCase()]));
}

export type PublicMockExamBulletinResult = {
  student: {
    firstName: string;
    lastName: string;
    studentId: string;
    className: string | null;
    classLevel: string | null;
  };
  academicYear: string;
  averageOn20: number | null;
  lines: Array<{
    examId: string;
    title: string;
    subject: string | null;
    examKind: string;
    scoreOn20: number;
    passed: boolean | null;
    submittedAt: string | null;
    attemptsCount: number;
  }>;
};

/**
 * Recherche publique : nom + prénom + matricule → notes d’examens blancs (forme bulletin).
 * Ne renvoie jamais les questions / réponses.
 */
export async function lookupPublicMockExamBulletin(
  client: Db,
  input: {
    firstName: string;
    lastName: string;
    matricule: string;
    schoolId?: string | null;
    academicYear?: string | null;
  }
): Promise<PublicMockExamBulletinResult | null> {
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const matricule = input.matricule.trim();
  if (firstName.length < 2 || lastName.length < 2 || matricule.length < 2) {
    throw Object.assign(
      new Error('Nom, prénom et numéro matricule sont requis (2 caractères minimum chacun).'),
      { status: 400 }
    );
  }

  const variants = matriculeVariants(matricule);
  const students = await client.student.findMany({
    where: {
      OR: [{ studentId: { in: variants } }, { nationalMatricule: { in: variants } }],
    },
    take: 15,
    select: {
      id: true,
      studentId: true,
      nationalMatricule: true,
      schoolId: true,
      user: { select: { firstName: true, lastName: true } },
      class: { select: { name: true, level: true, schoolId: true } },
    },
  });

  const wantFirst = normalizePersonName(firstName);
  const wantLast = normalizePersonName(lastName);
  const schoolId = input.schoolId?.trim() || null;

  const matched = students.find((s) => {
    if (schoolId) {
      const studentSchool = s.schoolId || s.class?.schoolId || null;
      if (studentSchool && studentSchool !== schoolId) return false;
    }
    const fn = normalizePersonName(s.user.firstName || '');
    const ln = normalizePersonName(s.user.lastName || '');
    const firstOk = fn === wantFirst || fn.startsWith(wantFirst) || wantFirst.startsWith(fn);
    const lastOk = ln === wantLast || ln.startsWith(wantLast) || wantLast.startsWith(ln);
    return firstOk && lastOk;
  });

  if (!matched) return null;

  const academicYear =
    typeof input.academicYear === 'string' && /^\d{4}-\d{4}$/.test(input.academicYear.trim())
      ? input.academicYear.trim()
      : getCurrentAcademicYear();

  const attempts = await client.mockExamAttempt.findMany({
    where: {
      studentId: matched.id,
      submittedAt: { not: null },
      mockExam: {
        academicYear,
        OR: [{ isPublicListed: true }, { isPublished: true }],
      },
    },
    orderBy: { submittedAt: 'desc' },
    select: {
      scoreOn20: true,
      passed: true,
      submittedAt: true,
      mockExam: {
        select: {
          id: true,
          title: true,
          subject: true,
          examKind: true,
          isPublicListed: true,
        },
      },
    },
  });

  // Préférer les examens explicitement listés publiquement ; sinon ceux publiés élèves.
  const preferred = attempts.filter((a) => a.mockExam.isPublicListed);
  const pool = preferred.length > 0 ? preferred : attempts;

  const byExam = new Map<
    string,
    {
      examId: string;
      title: string;
      subject: string | null;
      examKind: string;
      scoreOn20: number;
      passed: boolean | null;
      submittedAt: string | null;
      attemptsCount: number;
    }
  >();

  for (const attempt of pool) {
    const score = attempt.scoreOn20;
    if (score == null || !Number.isFinite(score)) continue;
    const examId = attempt.mockExam.id;
    const existing = byExam.get(examId);
    if (!existing) {
      byExam.set(examId, {
        examId,
        title: attempt.mockExam.title,
        subject: attempt.mockExam.subject,
        examKind: attempt.mockExam.examKind,
        scoreOn20: score,
        passed: attempt.passed,
        submittedAt: attempt.submittedAt ? attempt.submittedAt.toISOString() : null,
        attemptsCount: 1,
      });
      continue;
    }
    existing.attemptsCount += 1;
    if (score > existing.scoreOn20) {
      existing.scoreOn20 = score;
      existing.passed = attempt.passed;
      existing.submittedAt = attempt.submittedAt ? attempt.submittedAt.toISOString() : null;
    }
  }

  const lines = Array.from(byExam.values()).sort((a, b) => {
    const kind = a.examKind.localeCompare(b.examKind, 'fr');
    if (kind !== 0) return kind;
    return (a.subject || a.title).localeCompare(b.subject || b.title, 'fr');
  });

  const averageOn20 =
    lines.length > 0
      ? Math.round((lines.reduce((sum, l) => sum + l.scoreOn20, 0) / lines.length) * 100) / 100
      : null;

  return {
    student: {
      firstName: matched.user.firstName,
      lastName: matched.user.lastName,
      studentId: matched.studentId,
      className: matched.class?.name ?? null,
      classLevel: matched.class?.level ?? null,
    },
    academicYear,
    averageOn20,
    lines,
  };
}
