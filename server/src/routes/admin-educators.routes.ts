import express from 'express';
import { body, validationResult } from 'express-validator';
import prisma from '../utils/prisma';
import {
  inviteNewUserToSetPassword,
  resolveAdminProvidedOrInvitePassword,
} from '../utils/admin-user-initial-password.util';
import { optionalPasswordPolicyValidator, PASSWORD_POLICY_HINT } from '../utils/password.util';
import {
  educatorClassAssignmentInclude,
  parseEducatorClassIds,
  syncEducatorClassAssignments,
} from '../utils/educator-class-assignment.util';
import {
  ensureSchoolMember,
  type SchoolContextRequest,
} from '../utils/school-context.util';

const router = express.Router();


// Rechercher un éducateur par NFC ID
router.get('/educators/nfc/:nfcId', async (req, res) => {
  try {
    const { nfcId } = req.params;

    const educator = await prisma.educator.findFirst({
      where: { nfcId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!educator) {
      return res.status(404).json({ error: 'Éducateur non trouvé' });
    }

    res.json(educator);
  } catch (error: any) {
    console.error('Error finding educator by NFC:', error);
    res.status(500).json({ error: error.message || 'Erreur serveur' });
  }
});

// Lister les éducateurs (pagination plafonnée)
router.get('/educators', async (req: SchoolContextRequest, res) => {
  try {
    const pageSize = Math.min(Math.max(Number(req.query.limit) || 200, 1), 500);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const skip = (page - 1) * pageSize;
    const schoolId = req.schoolId;

    const educators = await prisma.educator.findMany({
      where: schoolId
        ? {
            OR: [
              { user: { schoolMemberships: { some: { schoolId } } } },
              { classAssignments: { some: { class: { schoolId } } } },
            ],
          }
        : undefined,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            avatar: true,
            isActive: true,
          },
        },
        ...educatorClassAssignmentInclude,
      },
      orderBy: { createdAt: 'desc' },
      take: pageSize,
      skip,
    });

    res.setHeader('X-Page', String(page));
    res.setHeader('X-Page-Size', String(pageSize));
    res.json(
      educators.map((e) => ({
        ...e,
        assignedClasses: e.classAssignments.map((a) => a.class),
      })),
    );
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Créer un éducateur
router.post(
  '/educators',
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
    body('specialization').notEmpty(),
    body('hireDate').isISO8601(),
  ],
  async (req: SchoolContextRequest, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        email,
        password,
        firstName,
        lastName,
        phone,
        employeeId,
        specialization,
        hireDate,
        contractType,
        salary,
        classIds: classIdsRaw,
      } = req.body;

      const classIds = parseEducatorClassIds(classIdsRaw);

      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return res.status(400).json({ error: 'Cet email est déjà utilisé' });
      }

      const existingEmployee = await prisma.educator.findUnique({
        where: { employeeId },
      });

      if (existingEmployee) {
        return res.status(400).json({ error: 'Ce numéro d\'employé existe déjà' });
      }

      const { hashedPassword, shouldSendSetupEmail } = await resolveAdminProvidedOrInvitePassword(password);

      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          phone,
          role: 'EDUCATOR',
          educatorProfile: {
            create: {
              employeeId,
              specialization,
              hireDate: new Date(hireDate),
              contractType: contractType || 'CDI',
              salary,
            },
          },
        },
        include: {
          educatorProfile: true,
        },
      });

      if (req.schoolId) {
        await ensureSchoolMember(req.schoolId, user.id);
      }

      if (shouldSendSetupEmail) {
        try {
          await inviteNewUserToSetPassword(user.id, user.email, user.firstName);
        } catch (inviteErr) {
          console.error('Invitation mot de passe (éducateur):', inviteErr);
        }
      }

      const educatorId = user.educatorProfile?.id;
      if (educatorId && classIds.length > 0) {
        await syncEducatorClassAssignments(educatorId, classIds);
      }

      const { password: _pw, ...userWithoutPassword } = user;
      res.status(201).json({ ...userWithoutPassword, passwordSetupEmailSent: shouldSendSetupEmail });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Obtenir un éducateur par ID
router.get('/educators/:id', async (req, res) => {
  try {
    const educator = await prisma.educator.findUnique({
      where: { id: req.params.id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            avatar: true,
            isActive: true,
          },
        },
        ...educatorClassAssignmentInclude,
      },
    });

    if (!educator) {
      return res.status(404).json({ error: 'Éducateur non trouvé' });
    }

    res.json({
      ...educator,
      assignedClasses: educator.classAssignments.map((a) => a.class),
    });
  } catch (error: any) {
    console.error('Erreur dans /admin/educators/:id:', error);
    res.status(500).json({ 
      error: error.message || 'Erreur serveur',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Mettre à jour un éducateur
router.put('/educators/:id', async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      phone,
      specialization,
      contractType,
      salary,
      isActive,
      nfcId,
      classIds: classIdsRaw,
    } = req.body;

    const educator = await prisma.educator.findUnique({
      where: { id: req.params.id },
      include: { user: true },
    });

    if (!educator) {
      return res.status(404).json({ error: 'Éducateur non trouvé' });
    }

    // Mettre à jour l'utilisateur
    await prisma.user.update({
      where: { id: educator.userId },
      data: {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(phone !== undefined && { phone }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    // Mettre à jour le profil éducateur
    const updatedEducator = await prisma.educator.update({
      where: { id: req.params.id },
      data: {
        ...(specialization !== undefined && { specialization }),
        ...(contractType !== undefined && { contractType }),
        ...(salary !== undefined && { salary }),
        ...(nfcId !== undefined && { nfcId: nfcId || null }),
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            avatar: true,
            isActive: true,
          },
        },
        ...educatorClassAssignmentInclude,
      },
    });

    if (classIdsRaw !== undefined) {
      await syncEducatorClassAssignments(req.params.id, parseEducatorClassIds(classIdsRaw));
    }

    const withAssignments = await prisma.educator.findUnique({
      where: { id: req.params.id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            avatar: true,
            isActive: true,
          },
        },
        ...educatorClassAssignmentInclude,
      },
    });

    res.json({
      ...(withAssignments ?? updatedEducator),
      assignedClasses: (withAssignments ?? updatedEducator).classAssignments.map((a) => a.class),
    });
  } catch (error: any) {
    console.error('Erreur dans /admin/educators/:id PUT:', error);
    res.status(500).json({ 
      error: error.message || 'Erreur serveur',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Supprimer un éducateur
router.delete('/educators/:id', async (req, res) => {
  try {
    const educator = await prisma.educator.findUnique({
      where: { id: req.params.id },
      include: { user: true },
    });

    if (!educator) {
      return res.status(404).json({ error: 'Éducateur non trouvé' });
    }

    // Utiliser une transaction pour supprimer toutes les relations dans le bon ordre
    await prisma.$transaction(async (tx) => {
      // 1. Supprimer les évaluations de conduite créées par cet éducateur
      // Note: On ne supprime pas les évaluations, on les garde pour l'historique
      // Mais on pourrait mettre à jour evaluatedByRole si nécessaire

      // 2. Supprimer le profil éducateur
      await tx.educator.delete({
        where: { id: req.params.id },
      });

      // 3. Désactiver/anonymiser l'utilisateur associé : il peut être référencé
      // par des notifications, messages, logs ou évaluations de conduite.
      await tx.passwordResetToken.deleteMany({ where: { userId: educator.userId } });
      await tx.pushSubscription.deleteMany({ where: { userId: educator.userId } });
      await tx.schoolMember.deleteMany({ where: { userId: educator.userId } });
      await tx.user.update({
        where: { id: educator.userId },
        data: {
          email: `deleted-educator-${educator.id}-${Date.now()}@deleted.local`,
          firstName: 'Éducateur',
          lastName: 'supprimé',
          phone: null,
          avatar: null,
          isActive: false,
        },
      });
    });

    res.json({ message: 'Éducateur supprimé avec succès' });
  } catch (error: any) {
    console.error('Erreur lors de la suppression de l\'éducateur:', error);
    res.status(500).json({ 
      error: error.message || 'Erreur lors de la suppression',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/** Congés éducateurs — vue RH agrégée */
router.get('/hr/educator-leaves', async (req, res) => {
  try {
    const { status } = req.query;
    const where: { status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' } = {};
    if (
      typeof status === 'string' &&
      ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'].includes(status)
    ) {
      where.status = status as 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
    }

    const leaves = await prisma.educatorLeave.findMany({
      where,
      orderBy: { startDate: 'desc' },
      include: {
        educator: {
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
    console.error('GET /admin/hr/educator-leaves:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
  }
});

router.put('/educators/:id/leaves/:leaveId', async (req, res) => {
  try {
    const { status, adminComment } = req.body as {
      status?: string;
      adminComment?: string | null;
    };
    if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Statut invalide (APPROVED ou REJECTED)' });
    }

    const leave = await prisma.educatorLeave.findFirst({
      where: { id: req.params.leaveId, educatorId: req.params.id },
    });
    if (!leave) {
      return res.status(404).json({ error: 'Demande introuvable' });
    }

    const updated = await prisma.educatorLeave.update({
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
    console.error('PUT admin educator leave:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
  }
});

export default router;
