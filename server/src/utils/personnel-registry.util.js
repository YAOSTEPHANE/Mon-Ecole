"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listPersonnelRegistry = listPersonnelRegistry;
const prisma_1 = __importDefault(require("./prisma"));
const educator_class_assignment_util_1 = require("./educator-class-assignment.util");
const userSelect = {
    id: true,
    email: true,
    firstName: true,
    lastName: true,
    phone: true,
    avatar: true,
    isActive: true,
};
const STAFF_CAT_LABEL = {
    ADMINISTRATION: 'Administration',
    SUPPORT: 'Soutien',
    SECURITY: 'Sécurité / gardiennage',
};
const SUPPORT_KIND_LABEL = {
    LIBRARIAN: 'Bibliothécaire',
    NURSE: 'Infirmier(e)',
    SECRETARY: 'Secrétaire',
    ACCOUNTANT: 'Comptabilité',
    STUDIES_DIRECTOR: 'Directeur(trice) des études',
    BURSAR: 'Économe',
    IT: 'Informatique',
    MAINTENANCE: 'Maintenance',
    OTHER: 'Autre',
};
function staffSchoolScopeWhere(schoolId) {
    if (!schoolId)
        return {};
    return { schoolId };
}
function teacherSchoolScopeWhere(schoolId) {
    if (!schoolId)
        return {};
    return {
        OR: [
            { user: { schoolMemberships: { some: { schoolId } } } },
            { classes: { some: { schoolId } } },
            { courses: { some: { class: { schoolId } } } },
        ],
    };
}
function educatorSchoolScopeWhere(schoolId) {
    if (!schoolId)
        return {};
    return {
        OR: [
            { user: { schoolMemberships: { some: { schoolId } } } },
            { classAssignments: { some: { class: { schoolId } } } },
        ],
    };
}
async function listPersonnelRegistry(schoolId) {
    const [staffRows, teacherRows, educatorRows] = await Promise.all([
        prisma_1.default.staffMember.findMany({
            where: staffSchoolScopeWhere(schoolId),
            include: {
                user: { select: userSelect },
                jobDescription: { select: { id: true, title: true, code: true } },
                manager: {
                    select: {
                        id: true,
                        user: { select: { firstName: true, lastName: true } },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        }),
        prisma_1.default.teacher.findMany({
            where: teacherSchoolScopeWhere(schoolId),
            include: {
                user: { select: userSelect },
                classes: { select: { name: true, level: true } },
                courses: { select: { id: true } },
            },
            orderBy: { createdAt: 'desc' },
        }),
        prisma_1.default.educator.findMany({
            where: educatorSchoolScopeWhere(schoolId),
            include: {
                user: { select: userSelect },
                ...educator_class_assignment_util_1.educatorClassAssignmentInclude,
            },
            orderBy: { createdAt: 'desc' },
        }),
    ]);
    const staff = staffRows.map((s) => ({
        id: s.id,
        kind: 'STAFF',
        employeeId: s.employeeId,
        user: s.user,
        hireDate: s.hireDate.toISOString(),
        contractType: s.contractType,
        salary: s.salary,
        displayCategory: STAFF_CAT_LABEL[s.staffCategory] ?? s.staffCategory,
        displaySubCategory: s.supportKind
            ? (SUPPORT_KIND_LABEL[s.supportKind] ?? s.supportKind)
            : null,
        displayRole: s.jobTitle,
        manager: s.manager
            ? {
                id: s.manager.id,
                name: `${s.manager.user.firstName} ${s.manager.user.lastName}`.trim(),
            }
            : null,
        staffCategory: s.staffCategory,
        supportKind: s.supportKind,
        jobTitle: s.jobTitle,
        department: s.department,
        jobDescription: s.jobDescription,
    }));
    const teachers = teacherRows.map((t) => {
        const classLabels = t.classes.map((c) => `${c.name} (${c.level})`);
        return {
            id: t.id,
            kind: 'TEACHER',
            employeeId: t.employeeId,
            user: t.user,
            hireDate: t.hireDate.toISOString(),
            contractType: t.contractType,
            salary: t.salary,
            displayCategory: 'Enseignant',
            displaySubCategory: classLabels.length > 0
                ? `${classLabels.length} classe${classLabels.length > 1 ? 's' : ''}`
                : `${t.courses.length} cours`,
            displayRole: t.specialization,
            manager: null,
            specialization: t.specialization,
        };
    });
    const educators = educatorRows.map((e) => {
        const classLabels = e.classAssignments.map((a) => `${a.class.name} (${a.class.level})`);
        return {
            id: e.id,
            kind: 'EDUCATOR',
            employeeId: e.employeeId,
            user: e.user,
            hireDate: e.hireDate.toISOString(),
            contractType: e.contractType,
            salary: e.salary,
            displayCategory: 'Éducateur',
            displaySubCategory: classLabels.length > 0
                ? `${classLabels.length} classe${classLabels.length > 1 ? 's' : ''}`
                : 'Aucune classe assignée',
            displayRole: e.specialization,
            manager: null,
            specialization: e.specialization,
        };
    });
    return [...staff, ...teachers, ...educators].sort((a, b) => {
        const na = `${a.user.lastName} ${a.user.firstName}`.toLocaleLowerCase('fr');
        const nb = `${b.user.lastName} ${b.user.firstName}`.toLocaleLowerCase('fr');
        return na.localeCompare(nb, 'fr');
    });
}
//# sourceMappingURL=personnel-registry.util.js.map