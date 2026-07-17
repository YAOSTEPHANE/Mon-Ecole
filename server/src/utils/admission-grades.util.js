"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ADMISSION_SECONDARY_LEVELS = exports.LYCEE_ADMISSION_LEVELS = exports.COLLEGE_ADMISSION_LEVELS = void 0;
exports.isCollegeAdmissionLevel = isCollegeAdmissionLevel;
exports.isLyceeAdmissionLevel = isLyceeAdmissionLevel;
exports.isAdmissionSecondaryLevel = isAdmissionSecondaryLevel;
exports.admissionLevelRequiresGrades = admissionLevelRequiresGrades;
exports.parseAdmissionGrade = parseAdmissionGrade;
exports.parseAdmissionGradeFields = parseAdmissionGradeFields;
exports.validateAdmissionTerm3ReportCard = validateAdmissionTerm3ReportCard;
exports.validateAdmissionGrades = validateAdmissionGrades;
exports.admissionGradeDataForCreate = admissionGradeDataForCreate;
/** Niveaux collège (formulaire public 6ème → 3ème). */
exports.COLLEGE_ADMISSION_LEVELS = ['6ème', '5ème', '4ème', '3ème'];
exports.LYCEE_ADMISSION_LEVELS = ['2nde', '1ère', 'Terminale'];
exports.ADMISSION_SECONDARY_LEVELS = [
    ...exports.COLLEGE_ADMISSION_LEVELS,
    ...exports.LYCEE_ADMISSION_LEVELS,
];
function normalizeAdmissionLevel(desiredLevel) {
    return desiredLevel
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ');
}
function matchesLevel(desiredLevel, officialLabel) {
    return normalizeAdmissionLevel(desiredLevel) === normalizeAdmissionLevel(officialLabel);
}
function isCollegeAdmissionLevel(desiredLevel) {
    const n = normalizeAdmissionLevel(desiredLevel);
    if (!n)
        return false;
    if (exports.COLLEGE_ADMISSION_LEVELS.some((l) => matchesLevel(desiredLevel, l)))
        return true;
    if (/^6(e|eme)?$/.test(n) || n === '6eme')
        return true;
    if (/^5(e|eme)?$/.test(n) || n === '5eme')
        return true;
    if (/^4(e|eme)?$/.test(n) || n === '4eme')
        return true;
    if (/^3(e|eme)?$/.test(n) || n === '3eme')
        return true;
    return false;
}
function isLyceeAdmissionLevel(desiredLevel) {
    const n = normalizeAdmissionLevel(desiredLevel);
    if (!n)
        return false;
    if (n.includes('2nde') ||
        n.includes('2nd') ||
        n === 'seconde' ||
        /^2\s*nd(e)?$/.test(n) ||
        n.endsWith(' 2nd')) {
        return true;
    }
    if (n.includes('1ere') ||
        n.includes('1re') ||
        n.includes('premiere') ||
        /^1\s*(ere|re)$/.test(n) ||
        n.startsWith('1ere ')) {
        return true;
    }
    if (n.includes('terminale') ||
        n.includes('terminal') ||
        n === 'tle' ||
        n.startsWith('term')) {
        return true;
    }
    return exports.LYCEE_ADMISSION_LEVELS.some((l) => matchesLevel(desiredLevel, l));
}
function isAdmissionSecondaryLevel(desiredLevel) {
    return isCollegeAdmissionLevel(desiredLevel) || isLyceeAdmissionLevel(desiredLevel);
}
function admissionLevelRequiresGrades(desiredLevel) {
    return isLyceeAdmissionLevel(desiredLevel);
}
function parseAdmissionGrade(value) {
    if (value === null || value === undefined || value === '')
        return null;
    const raw = typeof value === 'number' ? String(value) : String(value).trim().replace(',', '.');
    if (!raw)
        return null;
    const n = Number.parseFloat(raw);
    if (!Number.isFinite(n) || n < 0 || n > 20)
        return null;
    return Math.round(n * 100) / 100;
}
function parseAdmissionGradeFields(body) {
    return {
        gradeTerm1: parseAdmissionGrade(body.gradeTerm1),
        gradeTerm2: parseAdmissionGrade(body.gradeTerm2),
        gradeAnnualGeneral: parseAdmissionGrade(body.gradeAnnualGeneral),
        gradeAnnualSpecific: parseAdmissionGrade(body.gradeAnnualSpecific),
        gradeAnnualLiterary: parseAdmissionGrade(body.gradeAnnualLiterary),
    };
}
function validateAdmissionTerm3ReportCard(desiredLevel, hasFile) {
    if (!isAdmissionSecondaryLevel(desiredLevel)) {
        if (hasFile) {
            return 'Le bulletin du 3e trimestre n’est requis que pour les niveaux de la 6ème à la Terminale.';
        }
        return null;
    }
    if (!hasFile) {
        return 'Le bulletin du 3e trimestre est obligatoire (PDF ou image JPG/PNG).';
    }
    return null;
}
function validateAdmissionGrades(desiredLevel, grades) {
    if (isLyceeAdmissionLevel(desiredLevel)) {
        const missing = [];
        if (grades.gradeTerm1 === null)
            missing.push('moyenne du 1er trimestre');
        if (grades.gradeTerm2 === null)
            missing.push('moyenne du 2e trimestre');
        if (grades.gradeAnnualGeneral === null)
            missing.push('moyenne générale annuelle');
        if (grades.gradeAnnualSpecific === null)
            missing.push('moyenne annuelle des matières spécifiques');
        if (grades.gradeAnnualLiterary === null)
            missing.push('moyenne annuelle des matières littéraires');
        if (missing.length === 0)
            return null;
        return `Pour le niveau ${desiredLevel.trim()}, renseignez : ${missing.join(', ')} (note sur 20).`;
    }
    if (isCollegeAdmissionLevel(desiredLevel)) {
        const missing = [];
        if (grades.gradeTerm1 === null)
            missing.push('moyenne du 1er trimestre');
        if (grades.gradeTerm2 === null)
            missing.push('moyenne du 2e trimestre');
        if (grades.gradeAnnualGeneral === null)
            missing.push('moyenne générale annuelle');
        if (missing.length === 0)
            return null;
        return `Pour le niveau ${desiredLevel.trim()}, renseignez : ${missing.join(', ')} (note sur 20).`;
    }
    return null;
}
function admissionGradeDataForCreate(desiredLevel, body) {
    const grades = parseAdmissionGradeFields(body);
    if (!isAdmissionSecondaryLevel(desiredLevel))
        return {};
    const out = {};
    if (grades.gradeTerm1 !== null)
        out.gradeTerm1 = grades.gradeTerm1;
    if (grades.gradeTerm2 !== null)
        out.gradeTerm2 = grades.gradeTerm2;
    if (grades.gradeAnnualGeneral !== null)
        out.gradeAnnualGeneral = grades.gradeAnnualGeneral;
    if (isLyceeAdmissionLevel(desiredLevel)) {
        if (grades.gradeAnnualSpecific !== null)
            out.gradeAnnualSpecific = grades.gradeAnnualSpecific;
        if (grades.gradeAnnualLiterary !== null)
            out.gradeAnnualLiterary = grades.gradeAnnualLiterary;
    }
    return out;
}
//# sourceMappingURL=admission-grades.util.js.map