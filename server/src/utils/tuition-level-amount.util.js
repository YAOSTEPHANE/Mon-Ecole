"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TuitionLevelAmountError = exports.TUITION_LEVELS = void 0;
exports.normalizeClassLevel = normalizeClassLevel;
exports.findLevelTuitionCatalog = findLevelTuitionCatalog;
exports.getLevelTuitionRates = getLevelTuitionRates;
exports.upsertLevelTuitionRates = upsertLevelTuitionRates;
exports.findClassTuitionCatalog = findClassTuitionCatalog;
exports.getClassTuitionRates = getClassTuitionRates;
exports.upsertClassTuitionRates = upsertClassTuitionRates;
exports.resolveTuitionForClass = resolveTuitionForClass;
exports.resolveTuitionAmountForStudent = resolveTuitionAmountForStudent;
exports.enforceTuitionFeeAmounts = enforceTuitionFeeAmounts;
const prisma_1 = __importDefault(require("./prisma"));
/** Niveaux scolaires pour lesquels un montant de scolarité fixe peut être défini. */
exports.TUITION_LEVELS = [
    '6ème',
    '5ème',
    '4ème',
    '3ème',
    '2nde',
    '1ère',
    'Terminale',
];
function normalizeClassLevel(level) {
    return level.trim();
}
function catalogMatchesLevel(catalog, classLevel) {
    const norm = normalizeClassLevel(classLevel);
    const catLevel = catalog.classLevel ? normalizeClassLevel(catalog.classLevel) : '';
    return catLevel === norm;
}
/** Barème scolarité actif pour un niveau et une année (priorité à l’année exacte). */
async function findLevelTuitionCatalog(academicYear, classLevel) {
    const norm = normalizeClassLevel(classLevel);
    if (!norm)
        return null;
    const rows = await prisma_1.default.tuitionFeeCatalog.findMany({
        where: {
            feeType: 'TUITION',
            scope: 'BY_LEVEL',
            isActive: true,
            classLevel: norm,
            OR: [{ academicYear: String(academicYear) }, { academicYear: null }],
        },
        orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
    });
    const yearRow = rows.find((r) => r.academicYear === String(academicYear));
    if (yearRow)
        return yearRow;
    return rows.find((r) => !r.academicYear) ?? null;
}
async function getLevelTuitionRates(academicYear) {
    const year = String(academicYear);
    const knownLevels = new Set([...exports.TUITION_LEVELS]);
    const extraFromClasses = await prisma_1.default.class.findMany({
        select: { level: true },
        distinct: ['level'],
    });
    for (const c of extraFromClasses) {
        if (c.level.trim())
            knownLevels.add(normalizeClassLevel(c.level));
    }
    const rows = [];
    for (const level of Array.from(knownLevels).sort((a, b) => a.localeCompare(b, 'fr'))) {
        const catalog = await findLevelTuitionCatalog(year, level);
        rows.push({
            level,
            amount: catalog ? Number(catalog.defaultAmount) : null,
            catalogId: catalog?.id ?? null,
        });
    }
    return rows;
}
async function upsertLevelTuitionRates(academicYear, rates) {
    const year = String(academicYear);
    const saved = [];
    for (const { level, amount } of rates) {
        const norm = normalizeClassLevel(level);
        if (!norm)
            continue;
        const value = Math.round(Number(amount));
        if (Number.isNaN(value) || value < 0) {
            throw new Error(`Montant invalide pour le niveau « ${norm} ».`);
        }
        const existing = await prisma_1.default.tuitionFeeCatalog.findFirst({
            where: {
                feeType: 'TUITION',
                scope: 'BY_LEVEL',
                classLevel: norm,
                academicYear: year,
            },
        });
        if (existing) {
            saved.push(await prisma_1.default.tuitionFeeCatalog.update({
                where: { id: existing.id },
                data: {
                    defaultAmount: value,
                    label: `Scolarité ${norm}`,
                    isActive: true,
                },
            }));
            continue;
        }
        saved.push(await prisma_1.default.tuitionFeeCatalog.create({
            data: {
                label: `Scolarité ${norm}`,
                academicYear: year,
                scope: 'BY_LEVEL',
                classLevel: norm,
                feeType: 'TUITION',
                billingPeriod: 'ANNUAL',
                defaultAmount: value,
                periodLabelHint: 'Scolarité',
                sortOrder: (() => {
                    const i = exports.TUITION_LEVELS.indexOf(norm);
                    return i >= 0 ? i : 100;
                })(),
                isActive: true,
            },
        }));
    }
    return saved;
}
/** Barème scolarité actif pour une classe et une année (priorité à l’année exacte). */
async function findClassTuitionCatalog(academicYear, classId) {
    if (!classId.trim())
        return null;
    const rows = await prisma_1.default.tuitionFeeCatalog.findMany({
        where: {
            feeType: 'TUITION',
            scope: 'BY_CLASS',
            classId: classId.trim(),
            isActive: true,
            OR: [{ academicYear: String(academicYear) }, { academicYear: null }],
        },
        orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
    });
    const yearRow = rows.find((r) => r.academicYear === String(academicYear));
    if (yearRow)
        return yearRow;
    return rows.find((r) => !r.academicYear) ?? null;
}
async function getClassTuitionRates(academicYear) {
    const year = String(academicYear);
    const allClasses = await prisma_1.default.class.findMany({
        select: { id: true, name: true, level: true, academicYear: true },
        orderBy: [{ level: 'asc' }, { name: 'asc' }],
    });
    const rows = [];
    for (const cls of allClasses) {
        const catalog = await findClassTuitionCatalog(year, cls.id);
        rows.push({
            classId: cls.id,
            className: cls.name,
            classLevel: normalizeClassLevel(cls.level),
            academicYear: cls.academicYear,
            amount: catalog ? Number(catalog.defaultAmount) : null,
            catalogId: catalog?.id ?? null,
        });
    }
    return rows;
}
async function upsertClassTuitionRates(academicYear, rates) {
    const year = String(academicYear);
    const saved = [];
    for (const { classId, amount } of rates) {
        if (!classId?.trim())
            continue;
        const value = Math.round(Number(amount));
        if (Number.isNaN(value) || value < 0) {
            throw new Error('Montant invalide pour une classe.');
        }
        const cls = await prisma_1.default.class.findUnique({
            where: { id: classId.trim() },
            select: { id: true, name: true, level: true },
        });
        if (!cls)
            continue;
        const existing = await prisma_1.default.tuitionFeeCatalog.findFirst({
            where: {
                feeType: 'TUITION',
                scope: 'BY_CLASS',
                classId: cls.id,
                academicYear: year,
            },
        });
        const label = `Scolarité ${cls.name}`;
        if (existing) {
            saved.push(await prisma_1.default.tuitionFeeCatalog.update({
                where: { id: existing.id },
                data: {
                    defaultAmount: value,
                    label,
                    classLevel: normalizeClassLevel(cls.level),
                    isActive: true,
                },
            }));
            continue;
        }
        saved.push(await prisma_1.default.tuitionFeeCatalog.create({
            data: {
                label,
                academicYear: year,
                scope: 'BY_CLASS',
                classId: cls.id,
                classLevel: normalizeClassLevel(cls.level),
                feeType: 'TUITION',
                billingPeriod: 'ANNUAL',
                defaultAmount: value,
                periodLabelHint: 'Scolarité',
                sortOrder: 100,
                isActive: true,
            },
        }));
    }
    return saved;
}
/** Montant de scolarité pour une classe : barème classe, sinon barème du niveau. */
async function resolveTuitionForClass(classId, academicYear) {
    const cls = await prisma_1.default.class.findUnique({
        where: { id: classId },
        select: { id: true, name: true, level: true, academicYear: true },
    });
    if (!cls)
        return null;
    const year = String(academicYear || cls.academicYear || '').trim();
    if (!year)
        return null;
    const classCatalog = await findClassTuitionCatalog(year, cls.id);
    if (classCatalog) {
        return {
            amount: Math.round(Number(classCatalog.defaultAmount)),
            classId: cls.id,
            className: cls.name,
            classLevel: normalizeClassLevel(cls.level),
            catalogId: classCatalog.id,
            source: 'BY_CLASS',
        };
    }
    const levelCatalog = await findLevelTuitionCatalog(year, cls.level);
    if (!levelCatalog)
        return null;
    return {
        amount: Math.round(Number(levelCatalog.defaultAmount)),
        classId: cls.id,
        className: cls.name,
        classLevel: normalizeClassLevel(cls.level),
        catalogId: levelCatalog.id,
        source: 'BY_LEVEL',
    };
}
async function resolveTuitionAmountForStudent(studentId, academicYear) {
    const student = await prisma_1.default.student.findUnique({
        where: { id: studentId },
        include: { class: { select: { id: true, level: true, academicYear: true } } },
    });
    if (!student?.classId || !student.class)
        return null;
    const year = String(academicYear || student.class.academicYear || '').trim();
    if (!year)
        return null;
    const resolved = await resolveTuitionForClass(student.classId, year);
    if (!resolved)
        return null;
    return {
        amount: resolved.amount,
        classLevel: resolved.classLevel,
        catalogId: resolved.catalogId,
    };
}
class TuitionLevelAmountError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}
exports.TuitionLevelAmountError = TuitionLevelAmountError;
/**
 * Pour les frais de type TUITION : impose le montant du barème niveau (remise via discountAmount uniquement).
 */
async function enforceTuitionFeeAmounts(params) {
    const feeType = params.feeType ?? 'TUITION';
    const disc = params.discountAmount != null ? Math.max(0, Math.round(Number(params.discountAmount))) : 0;
    if (feeType !== 'TUITION') {
        let amountValue = params.amount != null ? Math.round(Number(params.amount)) : 0;
        const baseVal = params.baseAmount != null ? Math.round(Number(params.baseAmount)) : null;
        if (baseVal != null && !Number.isNaN(baseVal)) {
            amountValue = Math.max(0, baseVal - disc);
        }
        else if (disc > 0 && amountValue > 0) {
            amountValue = Math.max(0, amountValue - disc);
        }
        if (amountValue <= 0) {
            throw new TuitionLevelAmountError('Le montant à payer doit être strictement positif.');
        }
        return {
            amount: amountValue,
            baseAmount: baseVal ?? amountValue,
            discountAmount: disc,
            catalogId: params.catalogId ?? null,
        };
    }
    const manualBaseRaw = params.baseAmount;
    const manualBase = manualBaseRaw != null && manualBaseRaw !== ''
        ? Math.round(Number(manualBaseRaw))
        : NaN;
    if (!Number.isNaN(manualBase) && manualBase > 0) {
        return {
            amount: Math.max(0, manualBase - disc),
            baseAmount: manualBase,
            discountAmount: disc,
            catalogId: params.catalogId ?? null,
        };
    }
    const resolved = await resolveTuitionAmountForStudent(params.studentId, params.academicYear);
    if (!resolved) {
        const manualAmount = params.amount != null && params.amount !== '' ? Math.round(Number(params.amount)) : NaN;
        if (!Number.isNaN(manualAmount) && manualAmount > 0) {
            return {
                amount: Math.max(0, manualAmount - disc),
                baseAmount: manualAmount,
                discountAmount: disc,
                catalogId: params.catalogId ?? null,
            };
        }
        throw new TuitionLevelAmountError('Aucun montant de scolarité défini pour la classe ou le niveau de cet élève. Saisissez un montant ou configurez le barème.');
    }
    const base = resolved.amount;
    const net = Math.max(0, base - disc);
    if (params.amount != null && params.amount !== '') {
        const requested = Math.round(Number(params.amount));
        if (!Number.isNaN(requested) && requested > 0 && requested !== net) {
            return {
                amount: Math.max(0, requested),
                baseAmount: !Number.isNaN(manualBase) && manualBase > 0 ? manualBase : requested,
                discountAmount: disc,
                catalogId: params.catalogId ?? resolved.catalogId,
            };
        }
    }
    return {
        amount: net,
        baseAmount: base,
        discountAmount: disc,
        catalogId: params.catalogId ?? resolved.catalogId,
    };
}
//# sourceMappingURL=tuition-level-amount.util.js.map