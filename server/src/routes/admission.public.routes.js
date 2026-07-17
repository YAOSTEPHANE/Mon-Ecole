"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const prisma_1 = __importDefault(require("../utils/prisma"));
const upload_middleware_1 = require("../middleware/upload.middleware");
const admission_notify_util_1 = require("../utils/admission-notify.util");
const admission_grades_util_1 = require("../utils/admission-grades.util");
const admission_upload_util_1 = require("../utils/admission-upload.util");
const http_error_util_1 = require("../utils/http-error.util");
const school_context_util_1 = require("../utils/school-context.util");
const ensure_default_school_util_1 = require("../utils/ensure-default-school.util");
const rate_limit_middleware_1 = require("../middleware/rate-limit.middleware");
const router = express_1.default.Router();
router.use(rate_limit_middleware_1.publicFormLimiter);
function parseBooleanFormField(value) {
    if (value === true || value === 1)
        return true;
    const normalized = String(value ?? '').trim().toLowerCase();
    return ['true', '1', 'yes', 'oui', 'on'].includes(normalized);
}
async function generateUniqueReference() {
    const year = new Date().getFullYear();
    for (let i = 0; i < 12; i++) {
        const suffix = Math.random().toString(36).substring(2, 8).toUpperCase();
        const reference = `ADM-${year}-${suffix}`;
        const exists = await prisma_1.default.admission.findUnique({ where: { reference } });
        if (!exists)
            return reference;
    }
    const fallback = `ADM-${year}-${Date.now().toString(36).toUpperCase()}`;
    return fallback;
}
/**
 * Soumission publique d'une demande d'inscription
 */
const admissionValidators = [
    (0, express_validator_1.body)('firstName').trim().notEmpty().withMessage('Prénom requis'),
    (0, express_validator_1.body)('lastName').trim().notEmpty().withMessage('Nom requis'),
    (0, express_validator_1.body)('email').isEmail().withMessage('Email invalide'),
    (0, express_validator_1.body)('dateOfBirth').isISO8601().withMessage('Date de naissance invalide'),
    (0, express_validator_1.body)('birthPlace')
        .trim()
        .notEmpty()
        .withMessage('Lieu de naissance requis')
        .isLength({ max: 120 })
        .withMessage('Lieu de naissance : 120 caractères maximum'),
    (0, express_validator_1.body)('isRepeating')
        .optional({ values: 'falsy' })
        .isIn(['true', 'false', '1', '0', 'yes', 'no', 'oui', 'non'])
        .withMessage('Indiquez si l\'élève est doublant (oui/non)'),
    (0, express_validator_1.body)('gender').isIn(['MALE', 'FEMALE', 'OTHER']).withMessage('Genre invalide'),
    (0, express_validator_1.body)('desiredLevel').trim().notEmpty().withMessage('Niveau souhaité requis'),
    (0, express_validator_1.body)('academicYear').trim().notEmpty().withMessage('Année scolaire requise'),
    (0, express_validator_1.body)('matricule')
        .optional({ values: 'falsy' })
        .trim()
        .isLength({ max: 40 })
        .withMessage('Numéro matricule : 40 caractères maximum'),
];
router.post('/', (req, res, next) => {
    upload_middleware_1.admissionReportCardUpload.single('term3ReportCard')(req, res, (err) => {
        if (err) {
            const message = err instanceof Error ? err.message : 'Échec du téléversement du bulletin.';
            return res.status(400).json({ error: message });
        }
        next();
    });
}, admissionValidators, async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            (0, admission_upload_util_1.unlinkUploadedFile)(req.file);
            return res.status(400).json({ errors: errors.array() });
        }
        const { firstName, lastName, email, phone, dateOfBirth, birthPlace, isRepeating, gender, desiredLevel, academicYear, previousSchool, matricule, parentName, parentPhone, parentEmail, address, motivation, } = req.body;
        const emailNorm = String(email).trim().toLowerCase();
        const levelTrim = String(desiredLevel).trim();
        if (!(0, admission_grades_util_1.isAdmissionSecondaryLevel)(levelTrim)) {
            (0, admission_upload_util_1.unlinkUploadedFile)(req.file);
            return res.status(400).json({
                error: 'Ce formulaire est réservé aux candidatures de la 6ème à la Terminale. Choisissez un niveau dans la liste.',
            });
        }
        const grades = (0, admission_grades_util_1.parseAdmissionGradeFields)(req.body);
        const gradeError = (0, admission_grades_util_1.validateAdmissionGrades)(levelTrim, grades);
        if (gradeError) {
            (0, admission_upload_util_1.unlinkUploadedFile)(req.file);
            return res.status(400).json({ error: gradeError });
        }
        const bulletinError = (0, admission_grades_util_1.validateAdmissionTerm3ReportCard)(levelTrim, Boolean(req.file));
        if (bulletinError) {
            (0, admission_upload_util_1.unlinkUploadedFile)(req.file);
            return res.status(400).json({ error: bulletinError });
        }
        if (!(0, admission_grades_util_1.isAdmissionSecondaryLevel)(levelTrim) && req.file) {
            (0, admission_upload_util_1.unlinkUploadedFile)(req.file);
            return res.status(400).json({
                error: 'Le bulletin du 3e trimestre est requis pour les niveaux de la 6ème à la Terminale.',
            });
        }
        const reportCard = await (0, admission_upload_util_1.term3ReportCardDataFromUpload)(req);
        let schoolId;
        const slug = (0, school_context_util_1.readSchoolSlugFromRequest)(req);
        if (slug) {
            const school = await (0, school_context_util_1.resolveSchoolBySlug)(slug);
            if (!school) {
                (0, admission_upload_util_1.unlinkUploadedFile)(req.file);
                return res.status(400).json({
                    error: 'Établissement inconnu. Vérifiez le lien de pré-inscription.',
                });
            }
            schoolId = school.id;
        }
        else {
            schoolId = await (0, ensure_default_school_util_1.ensureDefaultSchool)();
        }
        const openDuplicate = await prisma_1.default.admission.findFirst({
            where: {
                schoolId,
                email: emailNorm,
                academicYear: String(academicYear).trim(),
                status: { in: ['PENDING', 'UNDER_REVIEW', 'WAITLIST', 'ACCEPTED'] },
            },
        });
        if (openDuplicate) {
            (0, admission_upload_util_1.unlinkUploadedFile)(req.file);
            return res.status(409).json({
                error: 'Une demande est déjà en cours pour cet email sur cette année scolaire. Utilisez le suivi avec votre numéro de dossier.',
                reference: openDuplicate.reference,
            });
        }
        const reference = await generateUniqueReference();
        const admission = await prisma_1.default.admission.create({
            data: {
                reference,
                schoolId,
                firstName: String(firstName).trim(),
                lastName: String(lastName).trim(),
                email: emailNorm,
                phone: phone ? String(phone).trim() : undefined,
                dateOfBirth: new Date(dateOfBirth),
                birthPlace: String(birthPlace).trim(),
                isRepeating: parseBooleanFormField(isRepeating),
                gender,
                desiredLevel: levelTrim,
                academicYear: String(academicYear).trim(),
                previousSchool: previousSchool ? String(previousSchool).trim() : undefined,
                matricule: matricule ? String(matricule).trim() : undefined,
                parentName: parentName ? String(parentName).trim() : undefined,
                parentPhone: parentPhone ? String(parentPhone).trim() : undefined,
                parentEmail: parentEmail ? String(parentEmail).trim().toLowerCase() : undefined,
                address: address ? String(address).trim() : undefined,
                motivation: motivation ? String(motivation).trim() : undefined,
                ...(0, admission_grades_util_1.admissionGradeDataForCreate)(levelTrim, req.body),
                ...(reportCard ?? {}),
            },
            select: {
                id: true,
                reference: true,
                status: true,
                firstName: true,
                lastName: true,
                academicYear: true,
                desiredLevel: true,
                createdAt: true,
            },
        });
        res.status(201).json({
            message: 'Demande enregistrée. Conservez votre numéro de dossier pour le suivi.',
            admission,
        });
        void (0, admission_notify_util_1.notifyAdminsOfNewAdmission)({
            reference: admission.reference,
            firstName: String(firstName).trim(),
            lastName: String(lastName).trim(),
            email: emailNorm,
            phone: phone ? String(phone).trim() : null,
            desiredLevel: String(desiredLevel).trim(),
            academicYear: String(academicYear).trim(),
            parentName: parentName ? String(parentName).trim() : null,
            parentPhone: parentPhone ? String(parentPhone).trim() : null,
            parentEmail: parentEmail ? String(parentEmail).trim().toLowerCase() : null,
            matricule: matricule ? String(matricule).trim() : null,
        }).catch((notifyError) => {
            console.error('notifyAdminsOfNewAdmission:', notifyError);
        });
    }
    catch (error) {
        (0, admission_upload_util_1.unlinkUploadedFile)(req.file);
        console.error('admission.public POST:', error);
        res.status(500).json({ error: (0, http_error_util_1.publicServerErrorMessage)(error) });
    }
});
/**
 * Suivi public d'un dossier par numéro de référence
 */
router.get('/track/:reference', async (req, res) => {
    try {
        const reference = String(req.params.reference).trim().toUpperCase();
        const row = await prisma_1.default.admission.findUnique({
            where: { reference },
            select: {
                reference: true,
                status: true,
                firstName: true,
                lastName: true,
                matricule: true,
                desiredLevel: true,
                academicYear: true,
                gradeTerm1: true,
                gradeTerm2: true,
                gradeAnnualGeneral: true,
                gradeAnnualSpecific: true,
                gradeAnnualLiterary: true,
                term3ReportCardUrl: true,
                term3ReportCardOriginalName: true,
                createdAt: true,
                updatedAt: true,
                enrolledStudentId: true,
                proposedClass: {
                    select: { id: true, name: true, level: true, academicYear: true },
                },
            },
        });
        if (!row) {
            return res.status(404).json({ error: 'Dossier introuvable' });
        }
        const { enrolledStudentId, ...rest } = row;
        const enrolledStudent = enrolledStudentId
            ? await prisma_1.default.student.findUnique({
                where: { id: enrolledStudentId },
                select: {
                    studentId: true,
                    user: { select: { email: true } },
                },
            })
            : null;
        res.json({ ...rest, enrolledStudent });
    }
    catch (error) {
        console.error('admission.public track:', error);
        res.status(500).json({ error: (0, http_error_util_1.publicServerErrorMessage)(error) });
    }
});
exports.default = router;
//# sourceMappingURL=admission.public.routes.js.map