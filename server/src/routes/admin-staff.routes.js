"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const prisma_1 = __importDefault(require("../utils/prisma"));
const admin_user_initial_password_util_1 = require("../utils/admin-user-initial-password.util");
const password_util_1 = require("../utils/password.util");
const staff_visible_modules_util_1 = require("../utils/staff-visible-modules.util");
const school_staff_metiers_util_1 = require("../utils/school-staff-metiers.util");
const personnel_registry_util_1 = require("../utils/personnel-registry.util");
const hours_summary_util_1 = require("../utils/hours-summary.util");
const router = express_1.default.Router();
function staffSchoolScopeWhere(schoolId, isDefaultSchool = false) {
    if (!schoolId)
        return {};
    if (isDefaultSchool)
        return { OR: [{ schoolId }, { schoolId: null }] };
    return { schoolId };
}
function currentStaffSchoolScope(req) {
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
};
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
};
function normalizeEmail(email) {
    return String(email ?? '')
        .trim()
        .toLowerCase();
}
/** Réassigne les subordonnés directs au manager du supprimé (ou racine). */
async function reassignDirectReportsBeforeDelete(tx, staffId, newManagerId) {
    await tx.staffMember.updateMany({
        where: { managerId: staffId },
        data: { managerId: newManagerId },
    });
}
router.get('/staff/job-descriptions', async (_req, res) => {
    try {
        const list = await prisma_1.default.jobDescription.findMany({
            orderBy: { title: 'asc' },
        });
        res.json(list);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur serveur';
        res.status(500).json({ error: message });
    }
});
router.post('/staff/job-descriptions', [
    (0, express_validator_1.body)('title').trim().notEmpty(),
    (0, express_validator_1.body)('responsibilities').trim().notEmpty(),
    (0, express_validator_1.body)('code').optional().trim(),
    (0, express_validator_1.body)('summary').optional().trim(),
    (0, express_validator_1.body)('requirements').optional().trim(),
    (0, express_validator_1.body)('suggestedCategory').optional().isIn(['ADMINISTRATION', 'SUPPORT', 'SECURITY']),
    (0, express_validator_1.body)('suggestedCategoryOther').optional().trim().isLength({ max: 120 }),
    (0, express_validator_1.body)('isActive').optional().isBoolean(),
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { title, code, summary, responsibilities, requirements, suggestedCategory, suggestedCategoryOther, isActive, } = req.body;
        const otherLabel = suggestedCategoryOther != null && String(suggestedCategoryOther).trim() !== ''
            ? String(suggestedCategoryOther).trim()
            : null;
        if (!suggestedCategory && otherLabel) {
            // Autre sans libellé standard : OK
        }
        else if (suggestedCategory && otherLabel) {
            return res.status(400).json({
                error: 'Ne renseignez pas « autre catégorie » en même temps qu’une catégorie standard.',
            });
        }
        const created = await prisma_1.default.jobDescription.create({
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
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur serveur';
        res.status(500).json({ error: message });
    }
});
router.put('/staff/job-descriptions/:id', [
    (0, express_validator_1.body)('title').optional().trim().notEmpty(),
    (0, express_validator_1.body)('responsibilities').optional().trim().notEmpty(),
    (0, express_validator_1.body)('code').optional().trim(),
    (0, express_validator_1.body)('summary').optional().trim(),
    (0, express_validator_1.body)('requirements').optional().trim(),
    (0, express_validator_1.body)('suggestedCategory')
        .optional({ nullable: true })
        .isIn(['ADMINISTRATION', 'SUPPORT', 'SECURITY']),
    (0, express_validator_1.body)('suggestedCategoryOther').optional({ nullable: true }).trim().isLength({ max: 120 }),
    (0, express_validator_1.body)('isActive').optional().isBoolean(),
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const existing = await prisma_1.default.jobDescription.findUnique({ where: { id: req.params.id } });
        if (!existing) {
            return res.status(404).json({ error: 'Fiche de poste introuvable' });
        }
        const { title, code, summary, responsibilities, requirements, suggestedCategory, suggestedCategoryOther, isActive, } = req.body;
        const nextCategory = suggestedCategory !== undefined
            ? suggestedCategory === null
                ? null
                : suggestedCategory
            : existing.suggestedCategory;
        const nextOther = suggestedCategoryOther !== undefined
            ? suggestedCategoryOther === null || String(suggestedCategoryOther).trim() === ''
                ? null
                : String(suggestedCategoryOther).trim()
            : existing.suggestedCategoryOther;
        if (nextCategory && nextOther) {
            return res.status(400).json({
                error: 'Ne renseignez pas « autre catégorie » en même temps qu’une catégorie standard.',
            });
        }
        const updated = await prisma_1.default.jobDescription.update({
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
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur serveur';
        res.status(500).json({ error: message });
    }
});
router.delete('/staff/job-descriptions/:id', async (req, res) => {
    try {
        const linked = await prisma_1.default.staffMember.count({
            where: { jobDescriptionId: req.params.id },
        });
        if (linked > 0) {
            return res.status(400).json({
                error: `Impossible de supprimer : ${linked} membre(s) du personnel référencent cette fiche.`,
            });
        }
        await prisma_1.default.jobDescription.delete({ where: { id: req.params.id } });
        res.json({ message: 'Fiche de poste supprimée' });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur serveur';
        res.status(500).json({ error: message });
    }
});
/** Annuaire unifié : enseignants + personnel administratif / soutien + éducateurs. */
router.get('/staff/personnel-registry', async (req, res) => {
    try {
        const list = await (0, personnel_registry_util_1.listPersonnelRegistry)(req.schoolId);
        res.json(list);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur serveur';
        res.status(500).json({ error: message });
    }
});
router.get('/staff/org-chart', async (req, res) => {
    try {
        const all = await prisma_1.default.staffMember.findMany({
            where: currentStaffSchoolScope(req),
            include: {
                user: { select: { ...userSelect } },
                jobDescription: { select: { id: true, title: true, code: true } },
            },
        });
        const byId = new Map();
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
        const roots = [];
        for (const s of all) {
            const node = byId.get(s.id);
            if (s.managerId && byId.has(s.managerId)) {
                byId.get(s.managerId).children.push(node);
            }
            else {
                roots.push(node);
            }
        }
        res.json({ roots });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur serveur';
        res.status(500).json({ error: message });
    }
});
router.get('/staff', async (req, res) => {
    try {
        const list = await prisma_1.default.staffMember.findMany({
            where: currentStaffSchoolScope(req),
            include: staffListInclude,
            orderBy: { createdAt: 'desc' },
        });
        res.json(list);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur serveur';
        res.status(500).json({ error: message });
    }
});
router.post('/staff', [
    (0, express_validator_1.body)('email').isEmail(),
    (0, express_validator_1.body)('password')
        .optional({ values: 'falsy' })
        .trim()
        .custom(password_util_1.optionalPasswordPolicyValidator)
        .withMessage(password_util_1.PASSWORD_POLICY_HINT),
    (0, express_validator_1.body)('firstName').notEmpty(),
    (0, express_validator_1.body)('lastName').notEmpty(),
    (0, express_validator_1.body)('employeeId').notEmpty(),
    (0, express_validator_1.body)('staffCategory').isIn(['ADMINISTRATION', 'SUPPORT', 'SECURITY']),
    (0, express_validator_1.body)('supportKind')
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
    (0, express_validator_1.body)('hireDate').isISO8601(),
    (0, express_validator_1.body)('jobTitle').optional().trim(),
    (0, express_validator_1.body)('department').optional().trim(),
    (0, express_validator_1.body)('contractType').optional().trim(),
    (0, express_validator_1.body)('salary').optional().isFloat(),
    (0, express_validator_1.body)('bio').optional().trim(),
    (0, express_validator_1.body)('nfcId').optional().trim(),
    (0, express_validator_1.body)('biometricId').optional().trim(),
    (0, express_validator_1.body)('jobDescriptionId').optional().isString(),
    (0, express_validator_1.body)('managerId').optional().isString(),
    (0, express_validator_1.body)('visibleStaffModules').optional().isArray(),
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const schoolId = req.schoolId;
        if (!schoolId) {
            return res.status(400).json({ error: 'Établissement actif requis (en-tête X-School-Id).' });
        }
        const emailNorm = normalizeEmail(req.body.email);
        const { password, firstName, lastName, phone, employeeId, staffCategory, supportKind, jobTitle, department, hireDate, contractType, salary, bio, nfcId, biometricId, jobDescriptionId, managerId, visibleStaffModules, } = req.body;
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
                await (0, school_staff_metiers_util_1.assertSupportKindActiveForSchool)(schoolId, supportKind);
            }
            catch {
                return res.status(400).json({
                    error: 'Ce métier n’est pas activé pour cet établissement. Configurez-le dans Métiers par établissement.',
                });
            }
        }
        const existingUser = await prisma_1.default.user.findUnique({ where: { email: emailNorm } });
        if (existingUser) {
            return res.status(400).json({ error: 'Cet email est déjà utilisé' });
        }
        const existingEmp = await prisma_1.default.staffMember.findUnique({ where: { employeeId } });
        if (existingEmp) {
            return res.status(400).json({ error: "Ce numéro d'employé existe déjà" });
        }
        if (jobDescriptionId) {
            const jd = await prisma_1.default.jobDescription.findUnique({ where: { id: jobDescriptionId } });
            if (!jd) {
                return res.status(400).json({ error: 'Fiche de poste introuvable' });
            }
        }
        if (managerId) {
            const mgr = await prisma_1.default.staffMember.findUnique({ where: { id: managerId } });
            if (!mgr) {
                return res.status(400).json({ error: 'Manager introuvable' });
            }
        }
        const { hashedPassword, shouldSendSetupEmail } = await (0, admin_user_initial_password_util_1.resolveAdminProvidedOrInvitePassword)(password);
        const modulesForCreate = staffCategory === 'SUPPORT'
            ? await (0, school_staff_metiers_util_1.sanitizeVisibleStaffModulesForSchool)(staffCategory, supportKind, visibleStaffModules, schoolId)
            : (0, staff_visible_modules_util_1.sanitizeVisibleStaffModules)(staffCategory, null, visibleStaffModules);
        const user = await prisma_1.default.user.create({
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
        if (shouldSendSetupEmail) {
            try {
                await (0, admin_user_initial_password_util_1.inviteNewUserToSetPassword)(user.id, user.email, user.firstName);
            }
            catch (inviteErr) {
                console.error('Invitation mot de passe (personnel):', inviteErr);
            }
        }
        const { password: _pw, ...userWithoutPassword } = user;
        res.status(201).json({ ...userWithoutPassword, passwordSetupEmailSent: shouldSendSetupEmail });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur serveur';
        res.status(500).json({ error: message });
    }
});
/** Décompte des heures du personnel par jour / semaine / mois. */
router.get('/staff/attendance/summary', async (req, res) => {
    try {
        const staffId = typeof req.query.staffId === 'string' ? req.query.staffId.trim() : '';
        const from = typeof req.query.from === 'string' ? req.query.from.trim().slice(0, 10) : '';
        const to = typeof req.query.to === 'string' ? req.query.to.trim().slice(0, 10) : '';
        const groupBy = (0, hours_summary_util_1.parseHoursGroupBy)(req.query.groupBy);
        if (!from || !to) {
            return res.status(400).json({ error: 'Paramètres from et to requis (YYYY-MM-DD)' });
        }
        const staffMembers = await prisma_1.default.staffMember.findMany({
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
                },
                byPeriod: [],
                byStaff: [],
            });
        }
        const rows = await prisma_1.default.staffAttendance.findMany({
            where: {
                staffId: { in: staffIds },
                attendanceDate: { gte: from, lte: to },
            },
            orderBy: [{ attendanceDate: 'asc' }],
        });
        const staffMap = new Map(staffMembers.map((s) => [s.id, s]));
        const byPeriod = new Map();
        const byStaff = new Map();
        let workedMinutesTotal = 0;
        let presentDays = 0;
        for (const row of rows) {
            const mins = (0, hours_summary_util_1.resolveWorkedMinutes)(row) ?? 0;
            const isPresent = row.status === 'PRESENT' || row.status === 'LATE';
            if (isPresent)
                presentDays += 1;
            workedMinutesTotal += mins;
            if (mins > 0) {
                (0, hours_summary_util_1.accumulatePeriod)(byPeriod, row.attendanceDate, groupBy, mins, 0);
            }
            else if (isPresent) {
                // Jour présent sans minutes : compte la session sans heures
                (0, hours_summary_util_1.accumulatePeriod)(byPeriod, row.attendanceDate, groupBy, 0, 0);
            }
            const sm = staffMap.get(row.staffId);
            if (!sm)
                continue;
            const cur = byStaff.get(row.staffId) ?? {
                staffId: row.staffId,
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
            };
            cur.workedMinutes += mins;
            cur.sessions += 1;
            if (isPresent)
                cur.presentDays += 1;
            cur.hours = (0, hours_summary_util_1.minutesToHours)(cur.workedMinutes);
            byStaff.set(row.staffId, cur);
        }
        res.json({
            filters: { from, to, groupBy, staffId: staffId || null },
            totals: {
                sessions: rows.length,
                workedMinutes: workedMinutesTotal,
                hours: (0, hours_summary_util_1.minutesToHours)(workedMinutesTotal),
                presentDays,
                staffCount: byStaff.size,
            },
            byPeriod: (0, hours_summary_util_1.sortedPeriodBuckets)(byPeriod),
            byStaff: [...byStaff.values()].sort((a, b) => `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, 'fr')),
        });
    }
    catch (error) {
        console.error('GET /admin/staff/attendance/summary:', error);
        const message = error instanceof Error ? error.message : 'Erreur serveur';
        res.status(500).json({ error: message });
    }
});
router.get('/staff/:id', async (req, res) => {
    try {
        const staff = await prisma_1.default.staffMember.findFirst({
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
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur serveur';
        res.status(500).json({ error: message });
    }
});
router.put('/staff/:id', async (req, res) => {
    try {
        const schoolId = req.schoolId;
        const staff = await prisma_1.default.staffMember.findFirst({
            where: { id: req.params.id, ...currentStaffSchoolScope(req) },
            include: { user: true },
        });
        if (!staff) {
            return res.status(404).json({ error: 'Membre du personnel introuvable' });
        }
        const { firstName, lastName, phone, employeeId, staffCategory, supportKind, jobTitle, department, hireDate, contractType, salary, bio, nfcId, biometricId, jobDescriptionId, managerId, isActive, visibleStaffModules, } = req.body;
        if (managerId === req.params.id) {
            return res.status(400).json({ error: 'Un membre ne peut pas être son propre manager.' });
        }
        if (managerId) {
            const mgr = await prisma_1.default.staffMember.findFirst({
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
            const jd = await prisma_1.default.jobDescription.findUnique({ where: { id: jobDescriptionId } });
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
            const clash = await prisma_1.default.staffMember.findFirst({
                where: { employeeId, NOT: { id: staff.id } },
            });
            if (clash) {
                return res.status(400).json({ error: "Ce numéro d'employé existe déjà" });
            }
        }
        const nextSupportKind = supportKind !== undefined
            ? nextCategory === 'SUPPORT'
                ? (supportKind ?? staff.supportKind)
                : null
            : staff.supportKind;
        const effectiveSchoolId = staff.schoolId ?? schoolId;
        if (nextCategory === 'SUPPORT' && nextSupportKind && effectiveSchoolId) {
            try {
                await (0, school_staff_metiers_util_1.assertSupportKindActiveForSchool)(effectiveSchoolId, nextSupportKind);
            }
            catch {
                return res.status(400).json({
                    error: 'Ce métier n’est pas activé pour cet établissement.',
                });
            }
        }
        const nextModules = visibleStaffModules !== undefined
            ? nextCategory === 'SUPPORT' && effectiveSchoolId
                ? await (0, school_staff_metiers_util_1.sanitizeVisibleStaffModulesForSchool)(nextCategory, nextSupportKind, visibleStaffModules, effectiveSchoolId)
                : (0, staff_visible_modules_util_1.sanitizeVisibleStaffModules)(nextCategory, nextSupportKind, visibleStaffModules)
            : undefined;
        await prisma_1.default.$transaction(async (tx) => {
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
        const updated = await prisma_1.default.staffMember.findUnique({
            where: { id: req.params.id },
            include: {
                ...staffListInclude,
                directReports: {
                    include: { user: { select: userSelect } },
                },
            },
        });
        res.json(updated);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur serveur';
        res.status(500).json({ error: message });
    }
});
router.delete('/staff/:id', async (req, res) => {
    try {
        const staff = await prisma_1.default.staffMember.findFirst({
            where: { id: req.params.id, ...currentStaffSchoolScope(req) },
        });
        if (!staff) {
            return res.status(404).json({ error: 'Membre du personnel introuvable' });
        }
        await prisma_1.default.$transaction(async (tx) => {
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
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur serveur';
        res.status(500).json({ error: message });
    }
});
router.get('/staff/:id/attendances', async (req, res) => {
    try {
        const { from, to } = req.query;
        const staff = await prisma_1.default.staffMember.findFirst({
            where: { id: req.params.id, ...currentStaffSchoolScope(req) },
            select: { id: true },
        });
        if (!staff) {
            return res.status(404).json({ error: 'Membre du personnel introuvable' });
        }
        const where = {
            staffId: staff.id,
            ...(from && to
                ? { attendanceDate: { gte: String(from), lte: String(to) } }
                : from
                    ? { attendanceDate: { gte: String(from) } }
                    : to
                        ? { attendanceDate: { lte: String(to) } }
                        : {}),
        };
        const rows = await prisma_1.default.staffAttendance.findMany({
            where,
            orderBy: { attendanceDate: 'desc' },
            take: 400,
        });
        res.json(rows);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur serveur';
        res.status(500).json({ error: message });
    }
});
router.post('/staff/:id/attendances', async (req, res) => {
    try {
        const { attendanceDate, status, source, notes, checkInAt, checkOutAt, workedMinutes } = req.body;
        if (!attendanceDate || typeof attendanceDate !== 'string') {
            return res.status(400).json({ error: 'attendanceDate requis (YYYY-MM-DD)' });
        }
        const staff = await prisma_1.default.staffMember.findFirst({
            where: { id: req.params.id, ...currentStaffSchoolScope(req) },
        });
        if (!staff) {
            return res.status(404).json({ error: 'Membre du personnel introuvable' });
        }
        const allowed = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'];
        const st = allowed.includes(status) ? status : 'PRESENT';
        const parseOptionalDate = (v) => {
            if (v == null || v === '')
                return null;
            const d = new Date(String(v));
            return Number.isNaN(d.getTime()) ? null : d;
        };
        const inAt = parseOptionalDate(checkInAt);
        const outAt = parseOptionalDate(checkOutAt);
        let minutes = null;
        if (workedMinutes != null && workedMinutes !== '') {
            const n = Number(workedMinutes);
            if (!Number.isFinite(n) || n < 0) {
                return res.status(400).json({ error: 'workedMinutes invalide' });
            }
            minutes = Math.round(n);
        }
        else {
            minutes = (0, hours_summary_util_1.resolveWorkedMinutes)({ checkInAt: inAt, checkOutAt: outAt });
        }
        const row = await prisma_1.default.staffAttendance.upsert({
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
                recordedByUserId: req.user?.id ?? null,
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
                recordedByUserId: req.user?.id ?? null,
            },
        });
        res.status(201).json(row);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur serveur';
        res.status(500).json({ error: message });
    }
});
router.delete('/staff/:id/attendances/:attendanceId', async (req, res) => {
    try {
        const staff = await prisma_1.default.staffMember.findFirst({
            where: { id: req.params.id, ...currentStaffSchoolScope(req) },
            select: { id: true },
        });
        if (!staff) {
            return res.status(404).json({ error: 'Membre du personnel introuvable' });
        }
        const row = await prisma_1.default.staffAttendance.findFirst({
            where: { id: req.params.attendanceId, staffId: staff.id },
        });
        if (!row) {
            return res.status(404).json({ error: 'Pointage introuvable' });
        }
        await prisma_1.default.staffAttendance.delete({ where: { id: row.id } });
        res.json({ message: 'Pointage supprimé' });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur serveur';
        res.status(500).json({ error: message });
    }
});
exports.default = router;
//# sourceMappingURL=admin-staff.routes.js.map