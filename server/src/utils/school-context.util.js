"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchoolPrismaNotReadyError = void 0;
exports.readSchoolIdFromRequest = readSchoolIdFromRequest;
exports.readSchoolSlugFromRequest = readSchoolSlugFromRequest;
exports.resolveSchoolBySlug = resolveSchoolBySlug;
exports.listSchoolsForUser = listSchoolsForUser;
exports.userCanAccessSchool = userCanAccessSchool;
exports.resolveActiveSchoolForRequest = resolveActiveSchoolForRequest;
exports.studentScopeWhere = studentScopeWhere;
exports.classScopeWhere = classScopeWhere;
exports.admissionScopeWhere = admissionScopeWhere;
exports.accountingScopeWhere = accountingScopeWhere;
exports.brandingIdForSchool = brandingIdForSchool;
const prisma_1 = __importDefault(require("./prisma"));
const ensure_default_school_util_1 = require("./ensure-default-school.util");
Object.defineProperty(exports, "SchoolPrismaNotReadyError", { enumerable: true, get: function () { return ensure_default_school_util_1.SchoolPrismaNotReadyError; } });
const school_prisma_util_1 = require("./school-prisma.util");
function readSchoolIdFromRequest(req) {
    const header = req.get('X-School-Id')?.trim();
    if (header)
        return header;
    const q = req.query.schoolId;
    if (typeof q === 'string' && q.trim())
        return q.trim();
    return undefined;
}
function readSchoolSlugFromRequest(req) {
    const q = req.query.school ?? req.query.college ?? req.query.etablissement;
    if (typeof q === 'string' && q.trim())
        return q.trim().toLowerCase();
    return undefined;
}
async function resolveSchoolBySlug(slug) {
    const schools = (0, school_prisma_util_1.getSchoolDelegate)();
    if (!schools)
        return null;
    return (await schools.findFirst({
        where: { slug: slug.toLowerCase(), isActive: true },
        select: { id: true, name: true, slug: true, isDefault: true },
    }));
}
async function listSchoolsForUser(userId, role) {
    const schools = (0, school_prisma_util_1.getSchoolDelegate)();
    const members = (0, school_prisma_util_1.getSchoolMemberDelegate)();
    if (!schools || !members) {
        throw new ensure_default_school_util_1.SchoolPrismaNotReadyError();
    }
    if (role === 'SUPER_ADMIN') {
        return (await schools.findMany({
            where: { isActive: true },
            orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
            select: { id: true, name: true, slug: true, shortName: true, isDefault: true },
        }));
    }
    const memberships = (await members.findMany({
        where: { userId, school: { isActive: true } },
        include: {
            school: {
                select: { id: true, name: true, slug: true, shortName: true, isDefault: true },
            },
        },
        orderBy: [{ isDefault: 'desc' }, { school: { name: 'asc' } }],
    }));
    if (memberships.length > 0) {
        return memberships.map((m) => m.school);
    }
    const defaultId = await (0, ensure_default_school_util_1.ensureDefaultSchool)();
    const school = (await schools.findUnique({
        where: { id: defaultId },
        select: { id: true, name: true, slug: true, shortName: true, isDefault: true },
    }));
    return school ? [school] : [];
}
async function userCanAccessSchool(userId, role, schoolId) {
    if (role === 'SUPER_ADMIN')
        return true;
    const schools = (0, school_prisma_util_1.getSchoolDelegate)();
    const members = (0, school_prisma_util_1.getSchoolMemberDelegate)();
    if (!schools || !members)
        return false;
    const member = await members.findUnique({
        where: { schoolId_userId: { schoolId, userId } },
    });
    if (member)
        return true;
    const school = (await schools.findUnique({
        where: { id: schoolId },
        select: { isActive: true },
    }));
    if (!school?.isActive)
        return false;
    if (role === 'ADMIN') {
        await members.create({
            data: { schoolId, userId, isDefault: false },
        });
        return true;
    }
    return false;
}
async function resolveActiveSchoolForRequest(req) {
    if (!(0, school_prisma_util_1.isSchoolPrismaReady)()) {
        throw new ensure_default_school_util_1.SchoolPrismaNotReadyError();
    }
    await (0, ensure_default_school_util_1.ensureDefaultSchool)();
    const schools = (0, school_prisma_util_1.getSchoolDelegate)();
    const members = (0, school_prisma_util_1.getSchoolMemberDelegate)();
    let schoolId = readSchoolIdFromRequest(req);
    const explicitSchoolId = schoolId;
    const slug = readSchoolSlugFromRequest(req);
    if (!schoolId && slug) {
        const bySlug = await resolveSchoolBySlug(slug);
        schoolId = bySlug?.id;
    }
    const user = req.user;
    if (!user) {
        if (!schoolId) {
            const def = (await schools.findFirst({
                where: { isDefault: true, isActive: true },
                select: { id: true, name: true, slug: true, isDefault: true },
            }));
            if (!def)
                return null;
            return { schoolId: def.id, school: def };
        }
        const school = (await schools.findFirst({
            where: { id: schoolId, isActive: true },
            select: { id: true, name: true, slug: true, isDefault: true },
        }));
        if (!school)
            return null;
        return { schoolId: school.id, school };
    }
    const accessible = await listSchoolsForUser(user.id, user.role);
    if (accessible.length === 0)
        return null;
    if (schoolId) {
        const allowed = accessible.some((s) => s.id === schoolId);
        const canAccess = allowed || (await userCanAccessSchool(user.id, user.role, schoolId));
        if (canAccess) {
            const school = (await schools.findFirst({
                where: { id: schoolId, isActive: true },
                select: { id: true, name: true, slug: true, shortName: true, isDefault: true },
            }));
            if (school)
                return { schoolId: school.id, school };
        }
        if (explicitSchoolId) {
            return null;
        }
    }
    const preferred = (await members.findFirst({
        where: { userId: user.id, isDefault: true, school: { isActive: true } },
        include: {
            school: { select: { id: true, name: true, slug: true, shortName: true, isDefault: true } },
        },
    }));
    if (preferred) {
        return { schoolId: preferred.school.id, school: preferred.school };
    }
    const def = accessible.find((s) => s.isDefault) ?? accessible[0];
    return { schoolId: def.id, school: def };
}
/** MongoDB : champ absent ≠ null — inclure les deux pour les données legacy. */
function schoolIdMatchesActive(schoolId, includeLegacyOrphans) {
    if (!includeLegacyOrphans) {
        return { schoolId };
    }
    return {
        OR: [{ schoolId }, { schoolId: null }],
    };
}
/** Filtre élèves pour l’établissement actif */
function studentScopeWhere(schoolId, isDefaultSchool = false) {
    const schoolMatch = schoolIdMatchesActive(schoolId, isDefaultSchool);
    const classMatch = schoolIdMatchesActive(schoolId, isDefaultSchool);
    return {
        OR: [schoolMatch, { class: classMatch }],
    };
}
function classScopeWhere(schoolId, isDefaultSchool = false) {
    return schoolIdMatchesActive(schoolId, isDefaultSchool);
}
/**
 * Filtre pré-inscriptions pour l’établissement actif.
 * Les dossiers sans schoolId (anciennes données) sont rattachés à l’établissement par défaut uniquement.
 */
function admissionScopeWhere(schoolId, isDefaultSchool = false) {
    return schoolIdMatchesActive(schoolId, isDefaultSchool);
}
/** Filtre compta (fournisseurs, dépenses, caisse, budget) par établissement. */
function accountingScopeWhere(schoolId, isDefaultSchool = false) {
    return schoolIdMatchesActive(schoolId, isDefaultSchool);
}
async function brandingIdForSchool(schoolId) {
    const row = await prisma_1.default.appBranding.findFirst({
        where: { OR: [{ schoolId }, { id: schoolId }] },
        select: { id: true },
    });
    return row?.id ?? schoolId;
}
//# sourceMappingURL=school-context.util.js.map