"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildStudentEnrollmentDossierPayload = buildStudentEnrollmentDossierPayload;
const qrcode_1 = __importDefault(require("qrcode"));
const prisma_1 = __importDefault(require("../utils/prisma"));
const digital_card_util_1 = require("./digital-card.util");
const app_branding_prisma_util_1 = require("./app-branding-prisma.util");
const branding_assets_util_1 = require("./branding-assets.util");
const IDENTITY_DOC_LABELS = {
    NATIONAL_ID: "Pièce d'identité nationale",
    BIRTH_CERTIFICATE: 'Acte de naissance',
    PASSPORT: 'Passeport',
    RESIDENCE_PERMIT: 'Titre de séjour',
    PHOTO_ID: "Photo d'identité",
    OTHER: 'Autre document',
};
async function buildStudentEnrollmentDossierPayload(studentId) {
    const student = await prisma_1.default.student.findUnique({
        where: { id: studentId },
        include: {
            user: {
                select: {
                    firstName: true,
                    lastName: true,
                    email: true,
                    phone: true,
                },
            },
            class: {
                select: {
                    name: true,
                    level: true,
                    academicYear: true,
                    track: { select: { name: true } },
                },
            },
            school: {
                select: {
                    name: true,
                    address: true,
                    phone: true,
                    email: true,
                    principalName: true,
                },
            },
            subjectOptions: {
                include: { option: { select: { name: true, code: true } } },
            },
            parents: {
                include: {
                    parent: {
                        include: {
                            user: {
                                select: {
                                    firstName: true,
                                    lastName: true,
                                    email: true,
                                    phone: true,
                                },
                            },
                        },
                    },
                },
            },
        },
    });
    if (!student)
        return null;
    const appBranding = (0, app_branding_prisma_util_1.getAppBrandingDelegate)();
    const brandingRow = appBranding
        ? await appBranding.findUnique({ where: { id: app_branding_prisma_util_1.APP_BRANDING_ID } })
        : null;
    const branding = brandingRow ? (0, branding_assets_util_1.toPublicBrandingShape)(brandingRow) : null;
    const admission = await prisma_1.default.admission.findFirst({
        where: { enrolledStudentId: student.id },
        orderBy: { reviewedAt: 'desc' },
        select: {
            reference: true,
            desiredLevel: true,
            academicYear: true,
            previousSchool: true,
            motivation: true,
            parentName: true,
            parentPhone: true,
            parentEmail: true,
            gradeTerm1: true,
            gradeTerm2: true,
            gradeAnnualGeneral: true,
            gradeAnnualSpecific: true,
            gradeAnnualLiterary: true,
            term3ReportCardOriginalName: true,
            reviewedAt: true,
        },
    });
    const identityDocs = await prisma_1.default.identityDocument.findMany({
        where: { studentId: student.id },
        orderBy: { createdAt: 'desc' },
        select: {
            type: true,
            label: true,
            originalName: true,
            createdAt: true,
        },
    });
    let digitalCard = null;
    try {
        let publicId = student.digitalCardPublicId;
        if (!publicId) {
            publicId = (0, digital_card_util_1.generateDigitalCardPublicId)();
            await prisma_1.default.student.update({
                where: { id: student.id },
                data: { digitalCardPublicId: publicId },
            });
        }
        const frontendBase = (process.env.FRONTEND_URL || 'http://localhost:3000').split(',')[0].trim() ||
            'http://localhost:3000';
        const cardPageUrl = `${frontendBase.replace(/\/+$/, '')}/carte-etudiant/${encodeURIComponent(publicId)}`;
        const qrDataUrl = await qrcode_1.default.toDataURL(cardPageUrl, {
            margin: 1,
            width: 200,
            errorCorrectionLevel: 'M',
        });
        digitalCard = { cardPageUrl, qrDataUrl };
    }
    catch {
        digitalCard = null;
    }
    return {
        generatedAt: new Date().toISOString(),
        school: student.school
            ? {
                name: branding?.schoolDisplayName?.trim() || student.school.name,
                address: branding?.schoolAddress?.trim() || student.school.address,
                phone: branding?.schoolPhone?.trim() || student.school.phone,
                email: branding?.schoolEmail?.trim() || student.school.email,
                principalName: branding?.schoolPrincipal?.trim() || student.school.principalName,
                schoolCode: branding?.schoolCode?.trim() || null,
                motto: null,
                logoUrl: branding?.loginLogoUrl || branding?.navigationLogoUrl || null,
            }
            : branding
                ? {
                    name: branding.schoolDisplayName?.trim() || 'Établissement',
                    address: branding.schoolAddress,
                    phone: branding.schoolPhone,
                    email: branding.schoolEmail,
                    principalName: branding.schoolPrincipal,
                    schoolCode: branding.schoolCode,
                    motto: null,
                    logoUrl: branding.loginLogoUrl || branding.navigationLogoUrl,
                }
                : null,
        student: {
            id: student.id,
            studentId: student.studentId,
            enrollmentDate: student.enrollmentDate.toISOString(),
            enrollmentStatus: student.enrollmentStatus,
            stateAssignment: student.stateAssignment,
            dateOfBirth: student.dateOfBirth.toISOString(),
            birthPlace: student.birthPlace,
            isRepeating: student.isRepeating ?? false,
            gender: student.gender,
            address: student.address,
            emergencyContact: student.emergencyContact,
            emergencyPhone: student.emergencyPhone,
            emergencyContact2: student.emergencyContact2,
            emergencyPhone2: student.emergencyPhone2,
            medicalInfo: student.medicalInfo,
            allergies: student.allergies,
            specialNeeds: student.specialNeeds,
        },
        user: {
            firstName: student.user.firstName,
            lastName: student.user.lastName,
            email: student.user.email,
            phone: student.user.phone,
        },
        class: student.class
            ? {
                name: student.class.name,
                level: student.class.level,
                academicYear: student.class.academicYear,
                trackName: student.class.track?.name ?? null,
            }
            : null,
        subjectOptions: student.subjectOptions.map((so) => ({
            name: so.option.name,
            code: so.option.code,
        })),
        parents: student.parents.map((sp) => ({
            relation: sp.relation,
            firstName: sp.parent.user.firstName,
            lastName: sp.parent.user.lastName,
            email: sp.parent.user.email,
            phone: sp.parent.user.phone,
        })),
        admission: admission
            ? {
                reference: admission.reference,
                desiredLevel: admission.desiredLevel,
                academicYear: admission.academicYear,
                previousSchool: admission.previousSchool,
                motivation: admission.motivation,
                parentName: admission.parentName,
                parentPhone: admission.parentPhone,
                parentEmail: admission.parentEmail,
                gradeTerm1: admission.gradeTerm1,
                gradeTerm2: admission.gradeTerm2,
                gradeAnnualGeneral: admission.gradeAnnualGeneral,
                gradeAnnualSpecific: admission.gradeAnnualSpecific,
                gradeAnnualLiterary: admission.gradeAnnualLiterary,
                term3ReportCardOriginalName: admission.term3ReportCardOriginalName,
                reviewedAt: admission.reviewedAt?.toISOString() ?? null,
            }
            : null,
        identityDocuments: identityDocs.map((doc) => ({
            type: doc.type,
            typeLabel: IDENTITY_DOC_LABELS[doc.type] ?? doc.type,
            label: doc.label,
            originalName: doc.originalName,
            createdAt: doc.createdAt.toISOString(),
        })),
        digitalCard,
    };
}
//# sourceMappingURL=student-enrollment-dossier.util.js.map