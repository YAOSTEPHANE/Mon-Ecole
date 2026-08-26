import express from 'express';
import { body, validationResult } from 'express-validator';
import type { Prisma } from '@prisma/client';
import prisma from '../utils/prisma';
import {
  inviteNewUserToSetPassword,
  resolveAdminProvidedOrInvitePassword,
} from '../utils/admin-user-initial-password.util';
import { optionalPasswordPolicyValidator, PASSWORD_POLICY_HINT } from '../utils/password.util';
import { sanitizeVisibleStaffModules } from '../utils/staff-visible-modules.util';
import {
  ensureSchoolMember,
  type SchoolContextRequest,
} from '../utils/school-context.util';
import {
  assertSupportKindActiveForSchool,
  sanitizeVisibleStaffModulesForSchool,
} from '../utils/school-staff-metiers.util';
import { listPersonnelRegistry } from '../utils/personnel-registry.util';
import {
  accumulatePeriod,
  minutesToHours,
  parseHoursGroupBy,
  resolveWorkedMinutes,
  sortedPeriodBuckets,
  type PeriodBucket,
} from '../utils/hours-summary.util';
import { notifyAdminsOfPersonnelLate } from '../utils/personnel-late-admin-notify.util';
import { parseTimeOnDate } from '../utils/schedule-slot.util';

const router = express.Router();

function staffSchoolScopeWhere(schoolId: string | undefined, isDefaultSchool = false): Prisma.StaffMemberWhereInput {
  if (!schoolId) return {};
  if (isDefaultSchool) return { OR: [{ schoolId }, { schoolId: null }] };
  return { schoolId };
}

function currentStaffSchoolScope(req: SchoolContextRequest): Prisma.StaffMemberWhereInput {
  return staffSchoolScopeWhere(req.schoolId, req.school?.isDefault ?? false);
}

const userSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  avatar: true,
  isActive: true,
} as const satisfies Prisma.UserSelect;

const staffListInclude = {
  user: { select: userSelect },
  jobDescription: {
    select: {
      id: true,
      title: true,
      code: true,
      summary: true,
      responsibilities: true,
      requirements: true,
      suggestedCategory: true,
      suggestedCategoryOther: true,
      isActive: true,
    },
  },
  manager: {
    select: {
      id: true,
      jobTitle: true,
      user: { select: { firstName: true, lastName: true } },
    },
  },
} satisfies Prisma.StaffMemberInclude;

function normalizeEmail(email: string): string {
  return String(email ?? '')
    .trim()
    .toLowerCase();
}

/** Réassigne les subordonnés directs au manager du supprimé (ou racine). */
async function reassignDirectReportsBeforeDelete(
  tx: Prisma.TransactionClient,
  staffId: string,
  newManagerId: string | null
) {
  await tx.staffMember.updateMany({
    where: { managerId: staffId },
    data: { managerId: newManagerId },
  });
}

router.get('/staff/job-descriptions', async (_req, res) => {
  try {
    const list = await prisma.jobDescription.findMany({
      orderBy: { title: 'asc' },
    });
    res.json(list);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur';
    res.status(500).json({ error: message });
  }
});

router.post(
  '/staff/job-descriptions',
  [
    body('title').trim().notEmpty(),
    body('responsibilities').trim().notEmpty(),
    body('code').optional().trim(),
    body('summary').optional().trim(),
    body('requirements').optional().trim(),
    body('suggestedCategory').optional().isIn(['ADMINISTRATION', 'SUPPORT', 'SECURITY']),
    body('suggestedCategoryOther').optional().trim().isLength({ max: 120 }),
    body('isActive').optional().isBoolean(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const {
        title,
        code,
        summary,
        responsibilities,
        requirements,
        suggestedCategory,
        suggestedCategoryOther,
        isActive,
      } = req.body;
      const otherLabel =
        suggestedCategoryOther != null && String(suggestedCategoryOther).trim() !== ''
          ? String(suggestedCategoryOther).trim()
          : null;
      if (!suggestedCategory && otherLabel) {
        // Autre sans libellé standard : OK
      } else if (suggestedCategory && otherLabel) {
        return res.status(400).json({
          error: 'Ne renseignez pas « autre catégorie » en même temps qu’une catégorie standard.',
        });
      }
      const created = await prisma.jobDescription.create({
        data: {
          title: String(title).trim(),
          code: code ? String(code).trim() : null,
          summary: summary ? String(summary).trim() : null,
          responsibilities: String(responsibilities).trim(),
          requirements: requirements ? String(requirements).trim() : null,
          suggestedCategory: suggestedCategory || null,
          suggestedCategoryOther: suggestedCategory ? null : otherLabel,
          isActive: isActive !== false,
        },
      });
      res.status(201).json(created);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur serveur';
      res.status(500).json({ error: message });
    }
  }
);

router.put(
  '/staff/job-descriptions/:id',
  [
    body('title').optional().trim().notEmpty(),
    body('responsibilities').optional().trim().notEmpty(),
    body('code').optional().trim(),
    body('summary').optional().trim(),
    body('requirements').optional().trim(),
    body('suggestedCategory')
      .optional({ nullable: true })
      .isIn(['ADMINISTRATION', 'SUPPORT', 'SECURITY']),
    body('suggestedCategoryOther').optional({ nullable: true }).trim().isLength({ max: 120 }),
    body('isActive').optional().isBoolean(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const existing = await prisma.jobDescription.findUnique({ where: { id: req.params.id } });
      if (!existing) {
        return res.status(404).json({ error: 'Fiche de poste introuvable' });
      }
      const {
        title,
        code,
        summary,
        responsibilities,
        requirements,
        suggestedCategory,
        suggestedCategoryOther,
        isActive,
      } = req.body;

      const nextCategory =
        suggestedCategory !== undefined
          ? suggestedCategory === null
            ? null
            : suggestedCategory
          : existing.suggestedCategory;
      const nextOther =
        suggestedCategoryOther !== undefined
          ? suggestedCategoryOther === null || String(suggestedCategoryOther).trim() === ''
            ? null
            : String(suggestedCategoryOther).trim()
          : existing.suggestedCategoryOther;

      if (nextCategory && nextOther) {
        return res.status(400).json({
          error: 'Ne renseignez pas « autre catégorie » en même temps qu’une catégorie standard.',
        });
      }

      const updated = await prisma.jobDescription.update({
        where: { id: req.params.id },
        data: {
          ...(title !== undefined && { title: String(title).trim() }),
          ...(code !== undefined && { code: code ? String(code).trim() : null }),
          ...(summary !== undefined && { summary: summary ? String(summary).trim() : null }),
          ...(responsibilities !== undefined && { responsibilities: String(responsibilities).trim() }),
          ...(requirements !== undefined && { requirements: requirements ? String(requirements).trim() : null }),
          ...(suggestedCategory !== undefined && {
            suggestedCategory: suggestedCategory === null ? null : suggestedCategory,
            ...(suggestedCategory
              ? { suggestedCategoryOther: null }
              : suggestedCategoryOther === undefined
                ? {}
                : { suggestedCategoryOther: nextOther }),
          }),
          ...(suggestedCategory === undefined &&
            suggestedCategoryOther !== undefined && {
              suggestedCategoryOther: nextOther,
            }),
          ...(isActive !== undefined && { isActive: Boolean(isActive) }),
        },
      });
      res.json(updated);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur serveur';
      res.status(500).json({ error: message });
    }
  }
);

router.delete('/staff/job-descriptions/:id', async (req, res) => {
  try {
    const linked = await prisma.staffMember.count({
      where: { jobDescriptionId: req.params.id },
    });
    if (linked > 0) {
      return res.status(400).json({
        error: `Impossible de supprimer : ${linked} membre(s) du personnel référencent cette fiche.`,
      });
    }
    await prisma.jobDescription.delete({ where: { id: req.params.id } });
    res.json({ message: 'Fiche de poste supprimée' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur';
    res.status(500).json({ error: message });
  }
});

/** Annuaire unifié : enseignants + personnel administratif / soutien + éducateurs. */
router.get('/staff/personnel-registry', async (req: SchoolContextRequest, res) => {
  try {
    const list = await listPersonnelRegistry(req.schoolId);
    res.json(list);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur';
    res.status(500).json({ error: message });
  }
});

router.get('/staff/org-chart', async (req: SchoolContextRequest, res) => {
  try {
    const all = await prisma.staffMember.findMany({
      where: currentStaffSchoolScope(req),
      include: {
        user: { select: { ...userSelect } },
        jobDescription: { select: { id: true, title: true, code: true } },
      },
    });

    type Node = {
      id: string;
      employeeId: string;
      staffCategory: string;
      supportKind: string | null;
      jobTitle: string | null;
      department: string | null;
      user: { firstName: string; lastName: string; email: string; isActive: boolean };
      jobDescription: { id: string; title: string; code: string | null } | null;
      children: Node[];
    };

    const byId = new Map<string, Node>();
    for (const s of all) {
      byId.set(s.id, {
        id: s.id,
        employeeId: s.employeeId,
        staffCategory: s.staffCategory,
        supportKind: s.supportKind,
        jobTitle: s.jobTitle,
        department: s.department,
        user: {
          firstName: s.user.firstName,
          lastName: s.user.lastName,
          email: s.user.email,
          isActive: s.user.isActive,
        },
        jobDescription: s.jobDescription,
        children: [],
      });
    }

    const roots: Node[] = [];
    for (const s of all) {
      const node = byId.get(s.id)!;
      if (s.managerId && byId.has(s.managerId)) {
        byId.get(s.managerId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    res.json({ roots });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur';
    res.status(500).json({ error: message });
  }
});

router.get('/staff', async (req: SchoolContextRequest, res) => {
  try {
    const list = await prisma.staffMember.findMany({
      where: currentStaffSchoolScope(req),
      include: staffListInclude,
      orderBy: { createdAt: 'desc' },
    });
    res.json(list);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur';
    res.status(500).json({ error: message });
  }
});

router.post(
  '/staff',
  [
    body('email').isEmail(),
    body('password')
      .optional({ values: 'falsy' })
      .trim()
      .custom(optionalPasswordPolicyValidator)
      .withMessage(PASSWORD_POLICY_HINT),
    body('firstName').notEmpty(),
    body('lastName').notEmpty(),
    body('employeeId').notEmpty(),
    body('staffCategory').isIn(['ADMINISTRATION', 'SUPPORT', 'SECURITY']),
    body('supportKind')
      .optional()
      .isIn([
        'LIBRARIAN',
        'NURSE',
        'SECRETARY',
        'ACCOUNTANT',
        'IT',
        'MAINTENANCE',
        'STUDIES_DIRECTOR',
        'BURSAR',
        'OTHER',
      ]),
    body('hireDate').isISO8601(),
    body('jobTitle').optional().trim(),
    body('department').optional().trim(),
    body('contractType').optional().trim(),
    body('salary').optional().isFloat(),
    body('bio').optional().trim(),
    body('nfcId').optional().trim(),
    body('biometricId').optional().trim(),
    body('jobDescriptionId').optional().isString(),
    body('managerId').optional().isString(),
    body('visibleStaffModules').optional().isArray(),
  ],
  async (req: SchoolContextRequest, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const schoolId = req.schoolId;
      if (!schoolId) {
        return res.status(400).json({ error: 'Établissement actif requis (en-tête X-School-Id).' });
      }

      const emailNorm = normalizeEmail(req.body.email);
      const {
        password,
        firstName,
        lastName,
        phone,
        employeeId,
        staffCategory,
        supportKind,
        jobTitle,
        department,
        hireDate,
        contractType,
        salary,
        bio,
        nfcId,
        biometricId,
        jobDescriptionId,
        managerId,
        visibleStaffModules,
      } = req.body;

      if (staffCategory === 'SUPPORT' && !supportKind) {
        return res.status(400).json({
          error: 'Pour le personnel de soutien, renseignez le type (supportKind), ex. LIBRARIAN, NURSE.',
        });
      }
      if (staffCategory !== 'SUPPORT' && supportKind) {
        return res.status(400).json({ error: 'supportKind est réservé à la catégorie SUPPORT.' });
      }

      if (staffCategory === 'SUPPORT' && supportKind) {
        try {
          await assertSupportKindActiveForSchool(schoolId, supportKind);
        } catch {
          return res.status(400).json({
            error: 'Ce métier n’est pas activé pour cet établissement. Configurez-le dans Métiers par établissement.',
          });
        }
      }

      const existingUser = await prisma.user.findUnique({ where: { email: emailNorm } });
      if (existingUser) {
        return res.status(400).json({ error: 'Cet email est déjà utilisé' });
      }

      const existingEmp = await prisma.staffMember.findUnique({ where: { employeeId } });
      if (existingEmp) {
        return res.status(400).json({ error: "Ce numéro d'employé existe déjà" });
      }

      if (jobDescriptionId) {
        const jd = await prisma.jobDescription.findUnique({ where: { id: jobDescriptionId } });
        if (!jd) {
          return res.status(400).json({ error: 'Fiche de poste introuvable' });
        }
      }

      if (managerId) {
        const mgr = await prisma.staffMember.findUnique({ where: { id: managerId } });
        if (!mgr) {
          return res.status(400).json({ error: 'Manager introuvable' });
        }
      }

      const { hashedPassword, shouldSendSetupEmail } = await resolveAdminProvidedOrInvitePassword(password);

      const modulesForCreate =
        staffCategory === 'SUPPORT'
          ? await sanitizeVisibleStaffModulesForSchool(
              staffCategory,
              supportKind,
              visibleStaffModules,
              schoolId,
            )
          : sanitizeVisibleStaffModules(staffCategory, null, visibleStaffModules);

      const user = await prisma.user.create({
        data: {
          email: emailNorm,
          password: hashedPassword,
          firstName,
          lastName,
          phone: phone || null,
          role: 'STAFF',
          staffProfile: {
            create: {
              employeeId,
              staffCategory,
              supportKind: staffCategory === 'SUPPORT' ? supportKind : null,
              schoolId,
              jobTitle: jobTitle || null,
              department: department || null,
              hireDate: new Date(hireDate),
              contractType: contractType || 'CDI',
              salary: salary !== undefined && salary !== null ? Number(salary) : null,
              bio: bio ? String(bio).trim().slice(0, 4000) : null,
              nfcId: nfcId ? String(nfcId).trim() : null,
              biometricId: biometricId ? String(biometricId).trim() : null,
              jobDescriptionId: jobDescriptionId || null,
              managerId: managerId || null,
              visibleStaffModules: modulesForCreate,
            },
          },
        },
        include: {
          staffProfile: {
            include: staffListInclude,
          },
        },
      });

      await ensureSchoolMember(schoolId, user.id);

      if (shouldSendSetupEmail) {
        try {
          await inviteNewUserToSetPassword(user.id, user.email, user.firstName);
        } catch (inviteErr) {
          console.error('Invitation mot de passe (personnel):', inviteErr);
        }
      }

      const { password: _pw, ...userWithoutPassword } = user;
      res.status(201).json({ ...userWithoutPassword, passwordSetupEmailSent: shouldSendSetupEmail });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur serveur';
      res.status(500).json({ error: message });
    }
  }
);

/** Décompte des heures du personnel par jour / semaine / mois. */
router.get('/staff/attendance/summary', async (req: SchoolContextRequest, res) => {
  try {
    const staffId = typeof req.query.staffId === 'string' ? req.query.staffId.trim() : '';
    const from = typeof req.query.from === 'string' ? req.query.from.trim().slice(0, 10) : '';
    const to = typeof req.query.to === 'string' ? req.query.to.trim().slice(0, 10) : '';
    const groupBy = parseHoursGroupBy(req.query.groupBy);

    if (!from || !to) {
      return res.status(400).json({ error: 'Paramètres from et to requis (YYYY-MM-DD)' });
    }

    const staffMembers = await prisma.staffMember.findMany({
      where: {
        ...currentStaffSchoolScope(req),
        ...(staffId ? { id: staffId } : {}),
      },
      select: {
        id: true,
        employeeId: true,
        jobTitle: true,
        staffCategory: true,
        user: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    type StaffAgg = {
      staffId: string;
      employeeId: string;
      firstName: string;
      lastName: string;
      email: string;
      jobTitle: string | null;
      staffCategory: string;
      workedMinutes: number;
      sessions: number;
      presentDays: number;
      hours: number;
      byPeriod: ReturnType<typeof sortedPeriodBuckets>;
    };

    const byStaff = new Map<string, StaffAgg & { _period: Map<string, PeriodBucket> }>();
    for (const sm of staffMembers) {
      byStaff.set(sm.id, {
        staffId: sm.id,
        employeeId: sm.employeeId,
        firstName: sm.user.firstName,
        lastName: sm.user.lastName,
        email: sm.user.email,
        jobTitle: sm.jobTitle,
        staffCategory: sm.staffCategory,
        workedMinutes: 0,
        sessions: 0,
        presentDays: 0,
        hours: 0,
        byPeriod: [],
        _period: new Map(),
      });
    }

    const staffIds = staffMembers.map((s) => s.id);
    if (staffIds.length === 0) {
      return res.json({
        filters: { from, to, groupBy, staffId: staffId || null },
        totals: {
          sessions: 0,
          workedMinutes: 0,
          hours: 0,
          presentDays: 0,
          staffCount: 0,
          staffListed: 0,
        },
        byPeriod: [],
        byStaff: [],
      });
    }

    const rows = await prisma.staffAttendance.findMany({
      where: {
        staffId: { in: staffIds },
        attendanceDate: { gte: from, lte: to },
      },
      orderBy: [{ attendanceDate: 'asc' }],
    });

    const byPeriod = new Map<string, PeriodBucket>();
    let workedMinutesTotal = 0;
    let presentDays = 0;

    for (const row of rows) {
      const mins = resolveWorkedMinutes(row) ?? 0;
      const isPresent = row.status === 'PRESENT' || row.status === 'LATE';
      if (isPresent) presentDays += 1;
      workedMinutesTotal += mins;
      if (mins > 0) {
        accumulatePeriod(byPeriod, row.attendanceDate, groupBy, mins, 0);
      } else if (isPresent) {
        accumulatePeriod(byPeriod, row.attendanceDate, groupBy, 0, 0);
      }

      const cur = byStaff.get(row.staffId);
      if (!cur) continue;
      cur.workedMinutes += mins;
      cur.sessions += 1;
      if (isPresent) cur.presentDays += 1;
      cur.hours = minutesToHours(cur.workedMinutes);
      if (mins > 0 || isPresent) {
        accumulatePeriod(cur._period, row.attendanceDate, groupBy, mins, 0);
      }
    }

    const byStaffList = [...byStaff.values()]
      .map(({ _period, ...rest }) => ({
        ...rest,
        hours: minutesToHours(rest.workedMinutes),
        byPeriod: sortedPeriodBuckets(_period),
      }))
      .sort((a, b) => b.hours - a.hours || `${a.lastName}`.localeCompare(b.lastName, 'fr'));

    res.json({
      filters: { from, to, groupBy, staffId: staffId || null },
      totals: {
        sessions: rows.length,
        workedMinutes: workedMinutesTotal,
        hours: minutesToHours(workedMinutesTotal),
        presentDays,
        staffCount: byStaffList.filter((s) => s.sessions > 0).length,
        staffListed: byStaffList.length,
      },
      byPeriod: sortedPeriodBuckets(byPeriod),
      byStaff: byStaffList,
    });
  } catch (error: unknown) {
    console.error('GET /admin/staff/attendance/summary:', error);
    const message = error instanceof Error ? error.message : 'Erreur serveur';
    res.status(500).json({ error: message });
  }
});

router.get('/staff/:id', async (req: SchoolContextRequest, res) => {
  try {
    const staff = await prisma.staffMember.findFirst({
      where: { id: req.params.id, ...currentStaffSchoolScope(req) },
      include: {
        ...staffListInclude,
        directReports: {
          include: {
            user: { select: userSelect },
          },
        },
      },
    });
    if (!staff) {
      return res.status(404).json({ error: 'Membre du personnel introuvable' });
    }
    res.json(staff);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur';
    res.status(500).json({ error: message });
  }
});

router.put('/staff/:id', async (req: SchoolContextRequest, res) => {
  try {
    const schoolId = req.schoolId;
    const staff = await prisma.staffMember.findFirst({
      where: { id: req.params.id, ...currentStaffSchoolScope(req) },
      include: { user: true },
    });
    if (!staff) {
      return res.status(404).json({ error: 'Membre du personnel introuvable' });
    }
    const {
      firstName,
      lastName,
      phone,
      employeeId,
      staffCategory,
      supportKind,
      jobTitle,
      department,
      hireDate,
      contractType,
      salary,
      bio,
      nfcId,
      biometricId,
      jobDescriptionId,
      managerId,
      isActive,
      visibleStaffModules,
    } = req.body;

    if (managerId === req.params.id) {
      return res.status(400).json({ error: 'Un membre ne peut pas être son propre manager.' });
    }

    if (managerId) {
      const mgr = await prisma.staffMember.findFirst({
        where: { id: managerId, ...currentStaffSchoolScope(req) },
      });
      if (!mgr) {
        return res.status(400).json({ error: 'Manager introuvable' });
      }
      if (managerId === req.params.id) {
        return res.status(400).json({ error: 'Manager invalide' });
      }
    }

    if (jobDescriptionId) {
      const jd = await prisma.jobDescription.findUnique({ where: { id: jobDescriptionId } });
      if (!jd) {
        return res.status(400).json({ error: 'Fiche de poste introuvable' });
      }
    }

    const nextCategory = staffCategory ?? staff.staffCategory;
    if (nextCategory === 'SUPPORT' && supportKind === undefined && !staff.supportKind) {
      return res.status(400).json({ error: 'supportKind requis pour la catégorie SUPPORT.' });
    }
    if (nextCategory !== 'SUPPORT' && (supportKind !== undefined && supportKind !== null)) {
      return res.status(400).json({ error: 'supportKind réservé à SUPPORT.' });
    }

    if (employeeId && employeeId !== staff.employeeId) {
      const clash = await prisma.staffMember.findFirst({
        where: { employeeId, NOT: { id: staff.id } },
      });
      if (clash) {
        return res.status(400).json({ error: "Ce numéro d'employé existe déjà" });
      }
    }

    const nextSupportKind =
      supportKind !== undefined
        ? nextCategory === 'SUPPORT'
          ? (supportKind ?? staff.supportKind)
          : null
        : staff.supportKind;

    const effectiveSchoolId = staff.schoolId ?? schoolId;
    if (nextCategory === 'SUPPORT' && nextSupportKind && effectiveSchoolId) {
      try {
        await assertSupportKindActiveForSchool(effectiveSchoolId, nextSupportKind);
      } catch {
        return res.status(400).json({
          error: 'Ce métier n’est pas activé pour cet établissement.',
        });
      }
    }

    const nextModules =
      visibleStaffModules !== undefined
        ? nextCategory === 'SUPPORT' && effectiveSchoolId
          ? await sanitizeVisibleStaffModulesForSchool(
              nextCategory,
              nextSupportKind,
              visibleStaffModules,
              effectiveSchoolId,
            )
          : sanitizeVisibleStaffModules(nextCategory, nextSupportKind, visibleStaffModules)
        : undefined;

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: staff.userId },
        data: {
          ...(firstName !== undefined && { firstName }),
          ...(lastName !== undefined && { lastName }),
          ...(phone !== undefined && { phone: phone || null }),
          ...(isActive !== undefined && { isActive: Boolean(isActive) }),
        },
      });

      await tx.staffMember.update({
        where: { id: req.params.id },
        data: {
          ...(schoolId && !staff.schoolId ? { schoolId } : {}),
          ...(employeeId !== undefined && { employeeId }),
          ...(staffCategory !== undefined && { staffCategory }),
          ...(supportKind !== undefined && {
            supportKind: nextCategory === 'SUPPORT' ? supportKind ?? staff.supportKind : null,
          }),
          ...(jobTitle !== undefined && { jobTitle: jobTitle || null }),
          ...(department !== undefined && { department: department || null }),
          ...(hireDate !== undefined && { hireDate: new Date(hireDate) }),
          ...(contractType !== undefined && { contractType }),
          ...(salary !== undefined && { salary: salary === null ? null : Number(salary) }),
          ...(bio !== undefined && { bio: bio === null || bio === '' ? null : String(bio).trim().slice(0, 4000) }),
          ...(nfcId !== undefined && { nfcId: nfcId ? String(nfcId).trim() : null }),
          ...(biometricId !== undefined && { biometricId: biometricId ? String(biometricId).trim() : null }),
          ...(jobDescriptionId !== undefined && {
            jobDescriptionId: jobDescriptionId === null || jobDescriptionId === '' ? null : jobDescriptionId,
          }),
          ...(managerId !== undefined && {
            managerId: managerId === null || managerId === '' ? null : managerId,
          }),
          ...(nextModules !== undefined && { visibleStaffModules: nextModules }),
        },
      });
    });

    const updated = await prisma.staffMember.findUnique({
      where: { id: req.params.id },
      include: {
        ...staffListInclude,
        directReports: {
          include: { user: { select: userSelect } },
        },
      },
    });
    res.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur';
    res.status(500).json({ error: message });
  }
});

router.delete('/staff/:id', async (req: SchoolContextRequest, res) => {
  try {
    const staff = await prisma.staffMember.findFirst({
      where: { id: req.params.id, ...currentStaffSchoolScope(req) },
    });
    if (!staff) {
      return res.status(404).json({ error: 'Membre du personnel introuvable' });
    }

    await prisma.$transaction(async (tx) => {
      await reassignDirectReportsBeforeDelete(tx, staff.id, staff.managerId);
      await tx.staffAttendance.deleteMany({ where: { staffId: staff.id } });
      await tx.staffMember.delete({ where: { id: staff.id } });
      await tx.passwordResetToken.deleteMany({ where: { userId: staff.userId } });
      await tx.pushSubscription.deleteMany({ where: { userId: staff.userId } });
      await tx.schoolMember.deleteMany({ where: { userId: staff.userId } });
      await tx.user.update({
        where: { id: staff.userId },
        data: {
          email: `deleted-staff-${staff.id}-${Date.now()}@deleted.local`,
          firstName: 'Personnel',
          lastName: 'supprimé',
          phone: null,
          avatar: null,
          isActive: false,
        },
      });
    });

    res.json({ message: 'Membre du personnel supprimé' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur';
    res.status(500).json({ error: message });
  }
});

router.get('/staff/:id/attendances', async (req: SchoolContextRequest, res) => {
  try {
    const { from, to } = req.query;
    const staff = await prisma.staffMember.findFirst({
      where: { id: req.params.id, ...currentStaffSchoolScope(req) },
      select: { id: true },
    });
    if (!staff) {
      return res.status(404).json({ error: 'Membre du personnel introuvable' });
    }
    const where: Prisma.StaffAttendanceWhereInput = {
      staffId: staff.id,
      ...(from && to
        ? { attendanceDate: { gte: String(from), lte: String(to) } }
        : from
          ? { attendanceDate: { gte: String(from) } }
          : to
            ? { attendanceDate: { lte: String(to) } }
            : {}),
    };
    const rows = await prisma.staffAttendance.findMany({
      where,
      orderBy: { attendanceDate: 'desc' },
      take: 400,
    });
    res.json(rows);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur';
    res.status(500).json({ error: message });
  }
});

router.post('/staff/:id/attendances', async (req: SchoolContextRequest, res) => {
  try {
    const { attendanceDate, status, source, notes, checkInAt, checkOutAt, workedMinutes } = req.body;
    if (!attendanceDate || typeof attendanceDate !== 'string') {
      return res.status(400).json({ error: 'attendanceDate requis (YYYY-MM-DD)' });
    }
    const staff = await prisma.staffMember.findFirst({
      where: { id: req.params.id, ...currentStaffSchoolScope(req) },
    });
    if (!staff) {
      return res.status(404).json({ error: 'Membre du personnel introuvable' });
    }
    const allowed = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'];
    const st = allowed.includes(status) ? status : 'PRESENT';

    const parseOptionalDate = (v: unknown): Date | null => {
      if (v == null || v === '') return null;
      const d = new Date(String(v));
      return Number.isNaN(d.getTime()) ? null : d;
    };
    const inAt = parseOptionalDate(checkInAt);
    const outAt = parseOptionalDate(checkOutAt);
    let minutes: number | null = null;
    if (workedMinutes != null && workedMinutes !== '') {
      const n = Number(workedMinutes);
      if (!Number.isFinite(n) || n < 0) {
        return res.status(400).json({ error: 'workedMinutes invalide' });
      }
      minutes = Math.round(n);
    } else {
      minutes = resolveWorkedMinutes({ checkInAt: inAt, checkOutAt: outAt });
    }

    const row = await prisma.staffAttendance.upsert({
      where: {
        staffId_attendanceDate: {
          staffId: staff.id,
          attendanceDate: String(attendanceDate).slice(0, 10),
        },
      },
      create: {
        staffId: staff.id,
        attendanceDate: String(attendanceDate).slice(0, 10),
        status: st,
        source: source ? String(source).slice(0, 32) : 'ADMIN',
        notes: notes ? String(notes).slice(0, 500) : null,
        checkInAt: inAt,
        checkOutAt: outAt,
        workedMinutes: minutes,
        recordedByUserId: (req as express.Request & { user?: { id: string } }).user?.id ?? null,
      },
      update: {
        status: st,
        source: source ? String(source).slice(0, 32) : 'ADMIN',
        notes: notes !== undefined ? (notes ? String(notes).slice(0, 500) : null) : undefined,
        checkInAt: checkInAt !== undefined ? inAt : undefined,
        checkOutAt: checkOutAt !== undefined ? outAt : undefined,
        workedMinutes: workedMinutes !== undefined || checkInAt !== undefined || checkOutAt !== undefined
          ? minutes
          : undefined,
        recordedByUserId: (req as express.Request & { user?: { id: string } }).user?.id ?? null,
      },
    });

    if (st === 'LATE' && inAt) {
      const staffWithUser = await prisma.staffMember.findUnique({
        where: { id: staff.id },
        select: {
          jobTitle: true,
          employeeId: true,
          user: { select: { firstName: true, lastName: true } },
        },
      });
      if (staffWithUser) {
        const startHhmm = process.env.STAFF_WORK_START_TIME?.trim() || '08:00';
        const start = parseTimeOnDate(/^\d{1,2}:\d{2}$/.test(startHhmm) ? startHhmm : '08:00', inAt);
        const grace = parseInt(process.env.ATTENDANCE_LATE_GRACE_MINUTES || '10', 10);
        const graceSafe = Number.isFinite(grace) ? Math.max(0, grace) : 10;
        const minutesLate = Math.max(
          1,
          Math.round((inAt.getTime() - start.getTime()) / 60_000) - graceSafe,
        );
        void notifyAdminsOfPersonnelLate({
          roleLabel: 'Personnel',
          personName: `${staffWithUser.user.firstName} ${staffWithUser.user.lastName}`.trim(),
          minutesLate,
          contextLabel: staffWithUser.jobTitle || staffWithUser.employeeId,
          at: inAt,
          link: '/admin?tab=hr',
        });
      }
    }

    res.status(201).json(row);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur';
    res.status(500).json({ error: message });
  }
});

router.delete('/staff/:id/attendances/:attendanceId', async (req: SchoolContextRequest, res) => {
  try {
    const staff = await prisma.staffMember.findFirst({
      where: { id: req.params.id, ...currentStaffSchoolScope(req) },
      select: { id: true },
    });
    if (!staff) {
      return res.status(404).json({ error: 'Membre du personnel introuvable' });
    }
    const row = await prisma.staffAttendance.findFirst({
      where: { id: req.params.attendanceId, staffId: staff.id },
    });
    if (!row) {
      return res.status(404).json({ error: 'Pointage introuvable' });
    }
    await prisma.staffAttendance.delete({ where: { id: row.id } });
    res.json({ message: 'Pointage supprimé' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur';
    res.status(500).json({ error: message });
  }
});

/** Congés personnel de soutien — vue RH agrégée */
router.get('/hr/staff-leaves', async (req, res) => {
  try {
    const { status } = req.query;
    const where: { status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' } = {};
    if (
      typeof status === 'string' &&
      ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'].includes(status)
    ) {
      where.status = status as 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
    }

    const leaves = await prisma.staffLeave.findMany({
      where,
      orderBy: { startDate: 'desc' },
      include: {
        staffMember: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    res.json(leaves);
  } catch (error: unknown) {
    console.error('GET /admin/hr/staff-leaves:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
  }
});

router.put('/staff/:id/leaves/:leaveId', async (req, res) => {
  try {
    const { status, adminComment } = req.body as {
      status?: string;
      adminComment?: string | null;
    };
    if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Statut invalide (APPROVED ou REJECTED)' });
    }

    const leave = await prisma.staffLeave.findFirst({
      where: { id: req.params.leaveId, staffMemberId: req.params.id },
    });
    if (!leave) {
      return res.status(404).json({ error: 'Demande introuvable' });
    }

    const updated = await prisma.staffLeave.update({
      where: { id: leave.id },
      data: {
        status: status as 'APPROVED' | 'REJECTED',
        ...(adminComment !== undefined && {
          adminComment:
            adminComment === null || adminComment === '' ? null : String(adminComment).trim(),
        }),
      },
    });

    res.json(updated);
  } catch (error: unknown) {
    console.error('PUT admin staff leave:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
  }
});

export default router;
