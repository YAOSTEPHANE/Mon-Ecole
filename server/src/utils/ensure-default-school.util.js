"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchoolPrismaNotReadyError = void 0;
exports.ensureDefaultSchool = ensureDefaultSchool;
const prisma_1 = __importDefault(require("./prisma"));
const app_branding_prisma_util_1 = require("./app-branding-prisma.util");
const school_prisma_util_1 = require("./school-prisma.util");
function slugify(name) {
    return name
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 48) || 'etablissement';
}
class SchoolPrismaNotReadyError extends Error {
    constructor() {
        super(school_prisma_util_1.SCHOOL_PRISMA_HINT);
        this.name = 'SchoolPrismaNotReadyError';
    }
}
exports.SchoolPrismaNotReadyError = SchoolPrismaNotReadyError;
/**
 * Garantit au moins un établissement actif et rattache les données existantes sans schoolId.
 */
async function ensureDefaultSchool() {
    const schools = (0, school_prisma_util_1.getSchoolDelegate)();
    if (!schools) {
        throw new SchoolPrismaNotReadyError();
    }
    const existingDefault = await schools.findFirst({
        where: { isDefault: true, isActive: true },
        select: { id: true },
    });
    if (existingDefault) {
        await backfillOrphanRecords(existingDefault.id);
        const { seedSchoolStaffMetiers } = await import('./school-staff-metiers.util');
        await seedSchoolStaffMetiers(existingDefault.id);
        return existingDefault.id;
    }
    const any = await schools.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
    });
    if (any) {
        await schools.update({
            where: { id: any.id },
            data: { isDefault: true },
        });
        await backfillOrphanRecords(any.id);
        const { seedSchoolStaffMetiers } = await import('./school-staff-metiers.util');
        await seedSchoolStaffMetiers(any.id);
        return any.id;
    }
    const brandingDelegate = (0, app_branding_prisma_util_1.getAppBrandingDelegate)();
    const legacyBranding = brandingDelegate
        ? await brandingDelegate.findUnique({ where: { id: app_branding_prisma_util_1.APP_BRANDING_ID } })
        : null;
    const displayName = legacyBranding?.schoolDisplayName?.trim() ||
        legacyBranding?.appTitle?.trim() ||
        'Établissement principal';
    let slug = slugify(displayName);
    const slugTaken = await schools.findUnique({ where: { slug } });
    if (slugTaken)
        slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
    const school = (await schools.create({
        data: {
            name: displayName,
            slug,
            shortName: legacyBranding?.appTitle?.trim() || null,
            address: legacyBranding?.schoolAddress?.trim() || null,
            phone: legacyBranding?.schoolPhone?.trim() || null,
            email: legacyBranding?.schoolEmail?.trim() || null,
            website: legacyBranding?.schoolWebsite?.trim() || null,
            principalName: legacyBranding?.schoolPrincipal?.trim() || null,
            isDefault: true,
            isActive: true,
        },
    }));
    if (brandingDelegate && legacyBranding) {
        await brandingDelegate.upsert({
            where: { id: school.id },
            create: {
                id: school.id,
                schoolId: school.id,
                navigationLogoUrl: legacyBranding.navigationLogoUrl,
                loginLogoUrl: legacyBranding.loginLogoUrl,
                faviconUrl: legacyBranding.faviconUrl,
                appTitle: legacyBranding.appTitle,
                appTagline: legacyBranding.appTagline,
                schoolDisplayName: legacyBranding.schoolDisplayName ?? displayName,
                schoolAddress: legacyBranding.schoolAddress,
                schoolPhone: legacyBranding.schoolPhone,
                schoolEmail: legacyBranding.schoolEmail,
                schoolWebsite: legacyBranding.schoolWebsite,
                schoolPrincipal: legacyBranding.schoolPrincipal,
            },
            update: {
                schoolId: school.id,
                schoolDisplayName: legacyBranding.schoolDisplayName ?? displayName,
            },
        });
    }
    await backfillOrphanRecords(school.id);
    const { seedSchoolStaffMetiers } = await import('./school-staff-metiers.util');
    await seedSchoolStaffMetiers(school.id);
    return school.id;
}
async function idsMissingSchoolId(model) {
    let rows;
    switch (model) {
        case 'student':
            rows = await prisma_1.default.student.findMany({ select: { id: true, schoolId: true } });
            break;
        case 'class':
            rows = await prisma_1.default.class.findMany({ select: { id: true, schoolId: true } });
            break;
        case 'admission':
            rows = await prisma_1.default.admission.findMany({ select: { id: true, schoolId: true } });
            break;
        case 'staffMember':
            rows = await prisma_1.default.staffMember.findMany({ select: { id: true, schoolId: true } });
            break;
    }
    return rows.filter((r) => r.schoolId == null || r.schoolId === '').map((r) => r.id);
}
async function backfillOrphanRecords(schoolId) {
    // MongoDB : updateMany({ schoolId: null }) ignore les champs absents — mise à jour par lots d’ids.
    const orphanClassIds = await idsMissingSchoolId('class');
    if (orphanClassIds.length > 0) {
        await prisma_1.default.class.updateMany({
            where: { id: { in: orphanClassIds } },
            data: { schoolId },
        });
    }
    const orphanStudentIds = await idsMissingSchoolId('student');
    if (orphanStudentIds.length > 0) {
        await prisma_1.default.student.updateMany({
            where: { id: { in: orphanStudentIds } },
            data: { schoolId },
        });
    }
    const orphanAdmissionIds = await idsMissingSchoolId('admission');
    if (orphanAdmissionIds.length > 0) {
        await prisma_1.default.admission.updateMany({
            where: { id: { in: orphanAdmissionIds } },
            data: { schoolId },
        });
    }
    const orphanStaffIds = await idsMissingSchoolId('staffMember');
    if (orphanStaffIds.length > 0) {
        await prisma_1.default.staffMember.updateMany({
            where: { id: { in: orphanStaffIds } },
            data: { schoolId },
        });
    }
    const studentsWithoutSchool = await prisma_1.default.student.findMany({
        where: {
            OR: [{ schoolId: null }, { schoolId: { isSet: false } }],
            classId: { not: null },
        },
        select: { id: true, classId: true },
        take: 500,
    });
    for (const s of studentsWithoutSchool) {
        if (!s.classId)
            continue;
        const cls = await prisma_1.default.class.findUnique({
            where: { id: s.classId },
            select: { schoolId: true },
        });
        if (cls?.schoolId) {
            await prisma_1.default.student.update({
                where: { id: s.id },
                data: { schoolId: cls.schoolId },
            });
        }
    }
    const stillOrphanStudentIds = await idsMissingSchoolId('student');
    if (stillOrphanStudentIds.length > 0) {
        await prisma_1.default.student.updateMany({
            where: { id: { in: stillOrphanStudentIds } },
            data: { schoolId },
        });
    }
}
//# sourceMappingURL=ensure-default-school.util.js.map