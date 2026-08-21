import type { Request } from 'express';
import prisma from './prisma';
import {
  inviteNewUserToSetPassword,
  resolveAdminProvidedOrInvitePassword,
} from './admin-user-initial-password.util';
import { generateDigitalCardPublicId } from './digital-card.util';
import { ensureParentAccountForEnrolledStudent } from './parent-account-from-enrollment.util';
import type { ParentEnrollmentResult } from './parent-account-from-enrollment.util';
import { ensureScolarityFeesOnEnroll } from './enrollment-fee-on-enroll.util';
import type { FeeEnsureResult } from './enrollment-fee-on-enroll.util';
import { getCurrentAcademicYear } from './report-card.util';

export type EnrollFromAdmissionBody = {
  password?: string;
  studentId?: string;
  classId?: string;
  stateAssignment?: 'STATE_ASSIGNED' | 'NOT_STATE_ASSIGNED';
  address?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  medicalInfo?: string;
  /** Lier un compte STUDENT existant avec le même e-mail (défaut : true si noms concordent). */
  linkExistingAccount?: boolean;
};

export type EnrollFromAdmissionResult = {
  message: string;
  user: Record<string, unknown>;
  reference: string;
  passwordSetupEmailSent: boolean;
  linkedExistingAccount?: boolean;
  parentAccount?: ParentEnrollmentResult;
  enrollmentFee?: FeeEnsureResult;
  tuitionFee?: FeeEnsureResult;
};

async function generateUniqueStudentId(firstName: string, lastName: string): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const initials = `${firstName[0]?.toUpperCase() || 'X'}${lastName[0]?.toUpperCase() || 'X'}`;
    const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    const candidate = `STU${initials}${random}`;
    const taken = await prisma.student.findUnique({ where: { studentId: candidate } });
    if (!taken) return candidate;
  }
  return `STU${Date.now().toString(36).toUpperCase()}`;
}

function namesMatch(
  a: { firstName: string; lastName: string },
  b: { firstName: string; lastName: string },
): boolean {
  const norm = (s: string) =>
    s
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  return norm(a.firstName) === norm(b.firstName) && norm(a.lastName) === norm(b.lastName);
}

/**
 * Crée le compte élève à partir d’un dossier de pré-inscription accepté.
 * Si l’e-mail existe déjà pour un compte STUDENT compatible, le dossier est fusionné.
 */
export async function enrollStudentFromAdmission(
  admissionId: string,
  reviewerUserId: string,
  body: EnrollFromAdmissionBody,
  req?: Pick<Request, 'ip' | 'socket' | 'get'>,
  contextSchoolId?: string,
): Promise<EnrollFromAdmissionResult> {
  const admission = await prisma.admission.findUnique({
    where: { id: admissionId },
  });

  if (!admission) {
    throw Object.assign(new Error('Dossier introuvable'), { statusCode: 404 });
  }
  if (admission.status !== 'ACCEPTED') {
    throw Object.assign(
      new Error('Le dossier doit être au statut « Accepté » avant de créer le compte élève'),
      { statusCode: 400 },
    );
  }
  if (admission.enrolledStudentId) {
    throw Object.assign(new Error('Un compte élève existe déjà pour ce dossier'), { statusCode: 400 });
  }

  const email = admission.email.trim().toLowerCase();
  const existingUser = await prisma.user.findUnique({
    where: { email },
    include: { studentProfile: { include: { class: true } } },
  });

  const classId = body.classId || admission.proposedClassId || undefined;
  let schoolId = admission.schoolId ?? contextSchoolId ?? undefined;
  if (!schoolId && classId) {
    const cls = await prisma.class.findUnique({
      where: { id: classId },
      select: { schoolId: true },
    });
    schoolId = cls?.schoolId ?? contextSchoolId ?? undefined;
  }
  if (!schoolId && contextSchoolId) {
    schoolId = contextSchoolId;
  }

  const allowLink = body.linkExistingAccount !== false;

  // —— Fusion avec compte STUDENT existant ——
  if (existingUser) {
    if (existingUser.role !== 'STUDENT') {
      throw Object.assign(
        new Error(
          `Cet e-mail est déjà utilisé par un compte ${existingUser.role}. Changez l’e-mail du dossier ou utilisez un autre compte.`,
        ),
        { statusCode: 400 },
      );
    }

    const canAutoLink =
      allowLink &&
      (body.linkExistingAccount === true ||
        namesMatch(existingUser, {
          firstName: admission.firstName,
          lastName: admission.lastName,
        }));

    if (!canAutoLink) {
      throw Object.assign(
        new Error(
          'Cet e-mail correspond déjà à un compte élève aux noms différents. Cochez « Lier le compte existant » pour fusionner, ou changez l’e-mail.',
        ),
        { statusCode: 409 },
      );
    }

    let student = existingUser.studentProfile;
    if (!student) {
      let studentCode = body.studentId ? String(body.studentId).trim() : '';
      if (!studentCode && admission.matricule?.trim()) studentCode = admission.matricule.trim();
      if (!studentCode) {
        studentCode = await generateUniqueStudentId(admission.firstName, admission.lastName);
      }
      student = await prisma.student.create({
        data: {
          userId: existingUser.id,
          studentId: studentCode,
          digitalCardPublicId: generateDigitalCardPublicId(),
          dateOfBirth: admission.dateOfBirth,
          birthPlace: admission.birthPlace ?? undefined,
          isRepeating: admission.isRepeating ?? false,
          gender: admission.gender,
          address: body.address ?? admission.address ?? undefined,
          emergencyContact: body.emergencyContact ?? admission.parentName ?? undefined,
          emergencyPhone: body.emergencyPhone ?? admission.parentPhone ?? undefined,
          medicalInfo: body.medicalInfo ?? undefined,
          classId: classId ?? undefined,
          schoolId: schoolId ?? undefined,
          stateAssignment: body.stateAssignment ?? 'NOT_STATE_ASSIGNED',
          enrollmentStatus: 'ACTIVE',
          isActive: true,
        },
        include: { class: true },
      });
    } else {
      student = await prisma.student.update({
        where: { id: student.id },
        data: {
          ...(classId ? { classId } : {}),
          ...(schoolId ? { schoolId } : {}),
          dateOfBirth: admission.dateOfBirth,
          birthPlace: admission.birthPlace ?? undefined,
          isRepeating: admission.isRepeating ?? false,
          gender: admission.gender,
          address: body.address ?? admission.address ?? student.address ?? undefined,
          emergencyContact:
            body.emergencyContact ?? admission.parentName ?? student.emergencyContact ?? undefined,
          emergencyPhone:
            body.emergencyPhone ?? admission.parentPhone ?? student.emergencyPhone ?? undefined,
          medicalInfo: body.medicalInfo ?? student.medicalInfo ?? undefined,
          stateAssignment: body.stateAssignment ?? student.stateAssignment ?? 'NOT_STATE_ASSIGNED',
          enrollmentStatus: 'ACTIVE',
          isActive: true,
        },
        include: { class: true },
      });
    }

    await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        firstName: admission.firstName,
        lastName: admission.lastName,
        phone: admission.phone ?? existingUser.phone ?? undefined,
        isActive: true,
      },
    });

    await prisma.admission.update({
      where: { id: admission.id },
      data: {
        status: 'ENROLLED',
        enrolledStudentId: student.id,
        reviewedById: reviewerUserId,
        reviewedAt: new Date(),
      },
    });

    const parentAccount = await ensureParentAccountForEnrolledStudent({
      parentEmail: admission.parentEmail,
      parentName: admission.parentName,
      parentPhone: admission.parentPhone,
      studentId: student.id,
      studentUserEmail: email,
      relation: 'guardian',
    });

    let enrollmentFee: FeeEnsureResult | undefined;
    let tuitionFee: FeeEnsureResult | undefined;
    try {
      const cls = classId
        ? await prisma.class.findUnique({
            where: { id: classId },
            select: { level: true, academicYear: true },
          })
        : student.class
          ? { level: student.class.level, academicYear: student.class.academicYear }
          : null;
      const fees = await ensureScolarityFeesOnEnroll({
        studentId: student.id,
        academicYear: cls?.academicYear || getCurrentAcademicYear(),
        classId: classId ?? student.classId ?? null,
        classLevel: cls?.level ?? null,
      });
      enrollmentFee = fees.enrollment;
      tuitionFee = fees.tuition;
    } catch (feeErr) {
      console.error('ensureScolarityFeesOnEnroll:', feeErr);
    }

    const { password: _pw, ...userWithoutPassword } = existingUser;
    return {
      message: 'Dossier fusionné avec le compte élève existant',
      user: userWithoutPassword as unknown as Record<string, unknown>,
      reference: admission.reference,
      passwordSetupEmailSent: false,
      linkedExistingAccount: true,
      parentAccount,
      enrollmentFee,
      tuitionFee,
    };
  }

  // —— Création d’un nouveau compte ——
  let studentId = body.studentId ? String(body.studentId).trim() : '';
  if (!studentId && admission.matricule?.trim()) {
    studentId = admission.matricule.trim();
  }
  if (!studentId) {
    studentId = await generateUniqueStudentId(admission.firstName, admission.lastName);
  } else {
    const taken = await prisma.student.findUnique({ where: { studentId } });
    if (taken) {
      throw Object.assign(new Error("Ce numéro d'élève existe déjà"), { statusCode: 400 });
    }
  }

  const { hashedPassword, shouldSendSetupEmail } = await resolveAdminProvidedOrInvitePassword(
    body.password,
  );

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      firstName: admission.firstName,
      lastName: admission.lastName,
      phone: admission.phone ?? undefined,
      role: 'STUDENT',
      studentProfile: {
        create: {
          studentId,
          digitalCardPublicId: generateDigitalCardPublicId(),
          dateOfBirth: admission.dateOfBirth,
          birthPlace: admission.birthPlace ?? undefined,
          isRepeating: admission.isRepeating ?? false,
          gender: admission.gender,
          address: body.address ?? admission.address ?? undefined,
          emergencyContact: body.emergencyContact ?? admission.parentName ?? undefined,
          emergencyPhone: body.emergencyPhone ?? admission.parentPhone ?? undefined,
          medicalInfo: body.medicalInfo ?? undefined,
          classId: classId ?? undefined,
          schoolId: schoolId ?? undefined,
          stateAssignment: body.stateAssignment ?? 'NOT_STATE_ASSIGNED',
        },
      },
    },
    include: {
      studentProfile: {
        include: { class: true },
      },
    },
  });

  const createdStudent = user.studentProfile;
  if (!createdStudent) {
    throw Object.assign(new Error('Profil élève non créé'), { statusCode: 500 });
  }

  await prisma.admission.update({
    where: { id: admission.id },
    data: {
      status: 'ENROLLED',
      enrolledStudentId: createdStudent.id,
      reviewedById: reviewerUserId,
      reviewedAt: new Date(),
    },
  });

  if (req) {
    try {
      await prisma.securityEvent.create({
        data: {
          userId: reviewerUserId,
          type: 'admission_enrolled',
          description: `Inscription finalisée: ${admission.reference} → ${studentId}`,
          ipAddress: req.ip || req.socket?.remoteAddress,
          userAgent: req.get?.('user-agent'),
          severity: 'info',
        },
      });
    } catch {
      /* ignore */
    }
  }

  if (shouldSendSetupEmail) {
    try {
      await inviteNewUserToSetPassword(user.id, user.email, admission.firstName);
    } catch (inviteErr) {
      console.error('Invitation mot de passe (admission):', inviteErr);
    }
  }

  const parentAccount = await ensureParentAccountForEnrolledStudent({
    parentEmail: admission.parentEmail,
    parentName: admission.parentName,
    parentPhone: admission.parentPhone,
    studentId: createdStudent.id,
    studentUserEmail: email,
    relation: 'guardian',
  });

  let enrollmentFee: FeeEnsureResult | undefined;
  let tuitionFee: FeeEnsureResult | undefined;
  try {
    const cls = classId
      ? await prisma.class.findUnique({
          where: { id: classId },
          select: { level: true, academicYear: true },
        })
      : null;
    const fees = await ensureScolarityFeesOnEnroll({
      studentId: createdStudent.id,
      academicYear: cls?.academicYear || getCurrentAcademicYear(),
      classId: classId ?? null,
      classLevel: cls?.level ?? null,
    });
    enrollmentFee = fees.enrollment;
    tuitionFee = fees.tuition;
  } catch (feeErr) {
    console.error('ensureScolarityFeesOnEnroll:', feeErr);
  }

  const { password: _pw, ...userWithoutPassword } = user;
  return {
    message: 'Élève inscrit et compte créé',
    user: userWithoutPassword as unknown as Record<string, unknown>,
    reference: admission.reference,
    passwordSetupEmailSent: shouldSendSetupEmail,
    linkedExistingAccount: false,
    parentAccount,
    enrollmentFee,
    tuitionFee,
  };
}
