"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const prisma_1 = __importDefault(require("../utils/prisma"));
const admin_accounting_scope_util_1 = require("../utils/admin-accounting-scope.util");
const router = express_1.default.Router();
const EXPENSE_LEDGER = {
    SUPPLIES: { code: '601', label: 'Fournitures et petit équipement' },
    SERVICES: { code: '604', label: 'Services extérieurs' },
    UTILITIES: { code: '606', label: 'Eau, énergie, charges locatives' },
    MAINTENANCE: { code: '615', label: 'Entretien et réparations' },
    PAYROLL_AUX: { code: '641', label: 'Charges sociales et personnel' },
    TRANSPORT: { code: '624', label: 'Transports' },
    CATERING: { code: '625', label: 'Restauration scolaire' },
    IT: { code: '628', label: 'Informatique et télécom' },
    OTHER: { code: '6288', label: 'Autres charges de gestion' },
};
const TUITION_REVENUE = { code: '706', label: 'Produits — scolarité et frais annexes' };
const PETTY_LEDGER_IN = { code: '530', label: 'Caisse — entrées' };
const PETTY_LEDGER_OUT = { code: '530', label: 'Caisse — sorties' };
// --- Fournisseurs ---
router.get('/suppliers', async (req, res) => {
    try {
        const { where } = (0, admin_accounting_scope_util_1.resolveAccountingScope)(req);
        const rows = await prisma_1.default.supplier.findMany({ where, orderBy: { name: 'asc' } });
        res.json(rows);
    }
    catch (e) {
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
    }
});
router.post('/suppliers', async (req, res) => {
    try {
        const { schoolId } = (0, admin_accounting_scope_util_1.resolveAccountingScope)(req);
        const { name, contactName, email, phone, taxId, address, notes, isActive } = req.body ?? {};
        if (!name || typeof name !== 'string' || !name.trim()) {
            return res.status(400).json({ error: 'name est requis' });
        }
        const row = await prisma_1.default.supplier.create({
            data: {
                schoolId,
                name: name.trim(),
                contactName: contactName ? String(contactName) : null,
                email: email ? String(email) : null,
                phone: phone ? String(phone) : null,
                taxId: taxId ? String(taxId) : null,
                address: address ? String(address) : null,
                notes: notes ? String(notes) : null,
                isActive: isActive !== false,
            },
        });
        res.status(201).json(row);
    }
    catch (e) {
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
    }
});
router.put('/suppliers/:id', async (req, res) => {
    try {
        if (!(await (0, admin_accounting_scope_util_1.assertSupplierInSchool)(req.params.id, req))) {
            return res.status(404).json({ error: 'Fournisseur introuvable' });
        }
        const { name, contactName, email, phone, taxId, address, notes, isActive } = req.body ?? {};
        const row = await prisma_1.default.supplier.update({
            where: { id: req.params.id },
            data: {
                ...(name !== undefined && { name: String(name).trim() }),
                ...(contactName !== undefined && { contactName: contactName ? String(contactName) : null }),
                ...(email !== undefined && { email: email ? String(email) : null }),
                ...(phone !== undefined && { phone: phone ? String(phone) : null }),
                ...(taxId !== undefined && { taxId: taxId ? String(taxId) : null }),
                ...(address !== undefined && { address: address ? String(address) : null }),
                ...(notes !== undefined && { notes: notes ? String(notes) : null }),
                ...(isActive !== undefined && { isActive: Boolean(isActive) }),
            },
        });
        res.json(row);
    }
    catch (e) {
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
    }
});
router.delete('/suppliers/:id', async (req, res) => {
    try {
        if (!(await (0, admin_accounting_scope_util_1.assertSupplierInSchool)(req.params.id, req))) {
            return res.status(404).json({ error: 'Fournisseur introuvable' });
        }
        await prisma_1.default.supplier.delete({ where: { id: req.params.id } });
        res.json({ message: 'Supprimé' });
    }
    catch (e) {
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
    }
});
// --- Dépenses ---
router.get('/school-expenses', async (req, res) => {
    try {
        const { where: schoolScope } = (0, admin_accounting_scope_util_1.resolveAccountingScope)(req);
        const { academicYear, from, to, category } = req.query;
        const where = { ...schoolScope };
        if (academicYear && typeof academicYear === 'string')
            where.academicYear = academicYear;
        if (category && typeof category === 'string')
            where.category = category;
        if (from && typeof from === 'string') {
            const gte = new Date(from);
            where.expenseDate = { ...(where.expenseDate || {}), gte };
        }
        if (to && typeof to === 'string') {
            const lte = new Date(to);
            where.expenseDate = { ...(where.expenseDate || {}), lte };
        }
        const rows = await prisma_1.default.schoolExpense.findMany({
            where,
            orderBy: { expenseDate: 'desc' },
            include: {
                supplier: { select: { id: true, name: true } },
                recordedBy: { select: { id: true, firstName: true, lastName: true } },
            },
        });
        res.json(rows);
    }
    catch (e) {
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
    }
});
router.post('/school-expenses', async (req, res) => {
    try {
        const { schoolId } = (0, admin_accounting_scope_util_1.resolveAccountingScope)(req);
        const adminId = req.user.id;
        const { supplierId, academicYear, expenseDate, amount, category, description, paymentMethod, isPettyCash, reference, } = req.body ?? {};
        if (!expenseDate || amount == null || !description) {
            return res.status(400).json({ error: 'expenseDate, amount et description sont requis' });
        }
        const amt = Math.round(Number(amount));
        if (!Number.isFinite(amt) || amt <= 0)
            return res.status(400).json({ error: 'Montant invalide' });
        const row = await prisma_1.default.schoolExpense.create({
            data: {
                schoolId,
                supplierId: supplierId || null,
                academicYear: academicYear ? String(academicYear) : null,
                expenseDate: new Date(expenseDate),
                amount: amt,
                category: category || 'OTHER',
                description: String(description).trim(),
                paymentMethod: paymentMethod || 'BANK_TRANSFER',
                isPettyCash: Boolean(isPettyCash),
                reference: reference ? String(reference) : null,
                recordedByUserId: adminId,
            },
            include: { supplier: true, recordedBy: { select: { firstName: true, lastName: true } } },
        });
        res.status(201).json(row);
    }
    catch (e) {
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
    }
});
router.put('/school-expenses/:id', async (req, res) => {
    try {
        if (!(await (0, admin_accounting_scope_util_1.assertSchoolExpenseInSchool)(req.params.id, req))) {
            return res.status(404).json({ error: 'Dépense introuvable' });
        }
        const { supplierId, academicYear, expenseDate, amount, category, description, paymentMethod, isPettyCash, reference, } = req.body ?? {};
        const row = await prisma_1.default.schoolExpense.update({
            where: { id: req.params.id },
            data: {
                ...(supplierId !== undefined && { supplierId: supplierId || null }),
                ...(academicYear !== undefined && { academicYear: academicYear ? String(academicYear) : null }),
                ...(expenseDate !== undefined && { expenseDate: new Date(expenseDate) }),
                ...(amount !== undefined && { amount: Math.round(Number(amount)) }),
                ...(category !== undefined && { category: category }),
                ...(description !== undefined && { description: String(description).trim() }),
                ...(paymentMethod !== undefined && { paymentMethod: paymentMethod }),
                ...(isPettyCash !== undefined && { isPettyCash: Boolean(isPettyCash) }),
                ...(reference !== undefined && { reference: reference ? String(reference) : null }),
            },
            include: { supplier: true },
        });
        res.json(row);
    }
    catch (e) {
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
    }
});
router.delete('/school-expenses/:id', async (req, res) => {
    try {
        if (!(await (0, admin_accounting_scope_util_1.assertSchoolExpenseInSchool)(req.params.id, req))) {
            return res.status(404).json({ error: 'Dépense introuvable' });
        }
        await prisma_1.default.schoolExpense.delete({ where: { id: req.params.id } });
        res.json({ message: 'Supprimé' });
    }
    catch (e) {
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
    }
});
// --- Petite caisse ---
router.get('/petty-cash-movements', async (req, res) => {
    try {
        const { where: schoolScope } = (0, admin_accounting_scope_util_1.resolveAccountingScope)(req);
        const { from, to } = req.query;
        const where = { ...schoolScope };
        if (from && typeof from === 'string')
            where.movementDate = { gte: new Date(from) };
        if (to && typeof to === 'string') {
            where.movementDate = { ...(where.movementDate || {}), lte: new Date(to) };
        }
        const rows = await prisma_1.default.pettyCashMovement.findMany({
            where,
            orderBy: { movementDate: 'desc' },
            include: { recordedBy: { select: { firstName: true, lastName: true } } },
        });
        res.json(rows);
    }
    catch (e) {
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
    }
});
router.post('/petty-cash-movements', async (req, res) => {
    try {
        const { schoolId } = (0, admin_accounting_scope_util_1.resolveAccountingScope)(req);
        const adminId = req.user.id;
        const { movementDate, type, amount, reason, reference } = req.body ?? {};
        if (!movementDate || !type || amount == null || !reason) {
            return res.status(400).json({ error: 'movementDate, type, amount et reason sont requis' });
        }
        const t = String(type).toUpperCase();
        if (t !== 'IN' && t !== 'OUT')
            return res.status(400).json({ error: 'type doit être IN ou OUT' });
        const amt = Math.round(Number(amount));
        if (!Number.isFinite(amt) || amt <= 0)
            return res.status(400).json({ error: 'Montant invalide' });
        const row = await prisma_1.default.pettyCashMovement.create({
            data: {
                schoolId,
                movementDate: new Date(movementDate),
                type: t,
                amount: amt,
                reason: String(reason).trim(),
                reference: reference ? String(reference) : null,
                recordedByUserId: adminId,
            },
        });
        res.status(201).json(row);
    }
    catch (e) {
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
    }
});
router.delete('/petty-cash-movements/:id', async (req, res) => {
    try {
        if (!(await (0, admin_accounting_scope_util_1.assertPettyCashInSchool)(req.params.id, req))) {
            return res.status(404).json({ error: 'Mouvement introuvable' });
        }
        await prisma_1.default.pettyCashMovement.delete({ where: { id: req.params.id } });
        res.json({ message: 'Supprimé' });
    }
    catch (e) {
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
    }
});
router.get('/petty-cash-balance', async (req, res) => {
    try {
        const { where } = (0, admin_accounting_scope_util_1.resolveAccountingScope)(req);
        const all = await prisma_1.default.pettyCashMovement.findMany({
            where,
            select: { type: true, amount: true },
        });
        let bal = 0;
        for (const m of all) {
            bal += m.type === 'IN' ? m.amount : -m.amount;
        }
        res.json({ balance: Math.round(bal) });
    }
    catch (e) {
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
    }
});
// --- Budget prévisionnel ---
router.get('/budget-lines', async (req, res) => {
    try {
        const { where: schoolScope } = (0, admin_accounting_scope_util_1.resolveAccountingScope)(req);
        const { academicYear } = req.query;
        const where = { ...schoolScope };
        if (academicYear && typeof academicYear === 'string')
            where.academicYear = academicYear;
        const rows = await prisma_1.default.budgetLine.findMany({
            where,
            orderBy: [{ academicYear: 'asc' }, { label: 'asc' }],
        });
        res.json(rows);
    }
    catch (e) {
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
    }
});
router.post('/budget-lines', async (req, res) => {
    try {
        const { schoolId } = (0, admin_accounting_scope_util_1.resolveAccountingScope)(req);
        const { academicYear, label, category, budgetedAmount, notes } = req.body ?? {};
        if (!academicYear || !label || budgetedAmount == null) {
            return res.status(400).json({ error: 'academicYear, label et budgetedAmount sont requis' });
        }
        const row = await prisma_1.default.budgetLine.create({
            data: {
                schoolId,
                academicYear: String(academicYear).trim(),
                label: String(label).trim(),
                category: category || 'OTHER',
                budgetedAmount: Math.round(Number(budgetedAmount)),
                notes: notes ? String(notes) : null,
            },
        });
        res.status(201).json(row);
    }
    catch (e) {
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
    }
});
router.put('/budget-lines/:id', async (req, res) => {
    try {
        if (!(await (0, admin_accounting_scope_util_1.assertBudgetLineInSchool)(req.params.id, req))) {
            return res.status(404).json({ error: 'Ligne budgétaire introuvable' });
        }
        const { academicYear, label, category, budgetedAmount, notes } = req.body ?? {};
        const row = await prisma_1.default.budgetLine.update({
            where: { id: req.params.id },
            data: {
                ...(academicYear !== undefined && { academicYear: String(academicYear) }),
                ...(label !== undefined && { label: String(label).trim() }),
                ...(category !== undefined && { category: category }),
                ...(budgetedAmount !== undefined && { budgetedAmount: Math.round(Number(budgetedAmount)) }),
                ...(notes !== undefined && { notes: notes ? String(notes) : null }),
            },
        });
        res.json(row);
    }
    catch (e) {
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
    }
});
router.delete('/budget-lines/:id', async (req, res) => {
    try {
        if (!(await (0, admin_accounting_scope_util_1.assertBudgetLineInSchool)(req.params.id, req))) {
            return res.status(404).json({ error: 'Ligne budgétaire introuvable' });
        }
        await prisma_1.default.budgetLine.delete({ where: { id: req.params.id } });
        res.json({ message: 'Supprimé' });
    }
    catch (e) {
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
    }
});
// --- Synthèses ---
router.get('/accounting/summary', async (req, res) => {
    try {
        const { where: acctWhere } = (0, admin_accounting_scope_util_1.resolveAccountingScope)(req);
        const studentWhere = (0, admin_accounting_scope_util_1.resolvePaymentStudentScope)(req);
        const { academicYear, from, to } = req.query;
        const dateFrom = from && typeof from === 'string' ? new Date(from) : undefined;
        const dateTo = to && typeof to === 'string' ? new Date(to) : undefined;
        const payWhere = { status: 'COMPLETED', student: studentWhere };
        if (dateFrom || dateTo) {
            payWhere.paidAt = {};
            if (dateFrom)
                payWhere.paidAt.gte = dateFrom;
            if (dateTo)
                payWhere.paidAt.lte = dateTo;
        }
        if (academicYear && typeof academicYear === 'string') {
            payWhere.tuitionFee = { academicYear: String(academicYear), student: studentWhere };
        }
        const payments = await prisma_1.default.payment.findMany({
            where: payWhere,
            select: { amount: true },
        });
        const tuitionRevenue = payments.reduce((s, p) => s + p.amount, 0);
        const expWhere = { ...acctWhere };
        if (dateFrom || dateTo) {
            expWhere.expenseDate = {};
            if (dateFrom)
                expWhere.expenseDate.gte = dateFrom;
            if (dateTo)
                expWhere.expenseDate.lte = dateTo;
        }
        if (academicYear && typeof academicYear === 'string') {
            expWhere.academicYear = String(academicYear);
        }
        const expenses = await prisma_1.default.schoolExpense.findMany({
            where: expWhere,
            select: { amount: true, category: true },
        });
        const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
        const expensesByCategory = expenses.reduce((acc, e) => {
            acc[e.category] = (acc[e.category] || 0) + e.amount;
            return acc;
        }, {});
        const petty = await prisma_1.default.pettyCashMovement.findMany({
            where: {
                ...acctWhere,
                ...(dateFrom || dateTo
                    ? {
                        movementDate: {
                            ...(dateFrom ? { gte: dateFrom } : {}),
                            ...(dateTo ? { lte: dateTo } : {}),
                        },
                    }
                    : {}),
            },
            select: { type: true, amount: true },
        });
        let pettyNet = 0;
        let pettyInPeriod = 0;
        let pettyOutPeriod = 0;
        for (const p of petty) {
            if (p.type === 'IN') {
                pettyNet += p.amount;
                pettyInPeriod += p.amount;
            }
            else {
                pettyNet -= p.amount;
                pettyOutPeriod += p.amount;
            }
        }
        const allPetty = await prisma_1.default.pettyCashMovement.findMany({
            where: acctWhere,
            select: { type: true, amount: true },
        });
        let pettyBalance = 0;
        for (const p of allPetty) {
            pettyBalance += p.type === 'IN' ? p.amount : -p.amount;
        }
        const budgetRows = academicYear && typeof academicYear === 'string'
            ? await prisma_1.default.budgetLine.findMany({
                where: { academicYear: String(academicYear), ...acctWhere },
            })
            : await prisma_1.default.budgetLine.findMany({ where: acctWhere });
        const budgetTotal = budgetRows.reduce((s, b) => s + b.budgetedAmount, 0);
        res.json({
            period: { from: dateFrom ?? null, to: dateTo ?? null, academicYear: academicYear ?? null },
            tuitionRevenue: Math.round(tuitionRevenue),
            totalExpenses: Math.round(totalExpenses),
            expensesByCategory,
            pettyCashNetPeriod: Math.round(pettyNet),
            pettyCashInPeriod: Math.round(pettyInPeriod),
            pettyCashOutPeriod: Math.round(pettyOutPeriod),
            pettyCashBalance: Math.round(pettyBalance),
            resultBeforePetty: Math.round(tuitionRevenue - totalExpenses),
            /** Synthèse type compte de résultat simplifié (hors bilan patrimonial détaillé) */
            simplifiedPL: {
                produitsEncaissementsScolarite: Math.round(tuitionRevenue),
                autresEncaissementsCaisse: Math.round(pettyInPeriod),
                totalProduits: Math.round(tuitionRevenue + pettyInPeriod),
                chargesExploitation: Math.round(totalExpenses),
                sortiesCaisse: Math.round(pettyOutPeriod),
                totalCharges: Math.round(totalExpenses + pettyOutPeriod),
                resultatNet: Math.round(tuitionRevenue + pettyInPeriod - totalExpenses - pettyOutPeriod),
            },
            budgetLines: budgetRows,
            budgetTotalPlanned: Math.round(budgetTotal),
        });
    }
    catch (e) {
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
    }
});
router.get('/accounting/journal', async (req, res) => {
    try {
        const { where: acctWhere } = (0, admin_accounting_scope_util_1.resolveAccountingScope)(req);
        const studentWhere = (0, admin_accounting_scope_util_1.resolvePaymentStudentScope)(req);
        const { from, to, academicYear } = req.query;
        const dateFrom = from && typeof from === 'string' ? new Date(from) : undefined;
        const dateTo = to && typeof to === 'string' ? new Date(to) : undefined;
        const rows = [];
        const payWhere = { status: 'COMPLETED', student: studentWhere };
        if (dateFrom || dateTo) {
            payWhere.paidAt = {};
            if (dateFrom)
                payWhere.paidAt.gte = dateFrom;
            if (dateTo)
                payWhere.paidAt.lte = dateTo;
        }
        if (academicYear && typeof academicYear === 'string') {
            payWhere.tuitionFee = { academicYear: String(academicYear), student: studentWhere };
        }
        const pays = await prisma_1.default.payment.findMany({
            where: payWhere,
            include: {
                tuitionFee: { select: { period: true, academicYear: true } },
                student: { include: { user: { select: { firstName: true, lastName: true } } } },
            },
        });
        for (const p of pays) {
            rows.push({
                id: `pay-${p.id}`,
                date: (p.paidAt || p.createdAt).toISOString(),
                kind: 'REVENUE',
                label: `Scolarité — ${p.tuitionFee.period} (${p.tuitionFee.academicYear}) — ${p.student.user.firstName} ${p.student.user.lastName}`,
                reference: p.paymentReference,
                amount: Math.round(p.amount),
                ledgerCode: TUITION_REVENUE.code,
                ledgerLabel: TUITION_REVENUE.label,
            });
        }
        const expWhere = { ...acctWhere };
        if (dateFrom || dateTo) {
            expWhere.expenseDate = {};
            if (dateFrom)
                expWhere.expenseDate.gte = dateFrom;
            if (dateTo)
                expWhere.expenseDate.lte = dateTo;
        }
        if (academicYear && typeof academicYear === 'string')
            expWhere.academicYear = String(academicYear);
        const exps = await prisma_1.default.schoolExpense.findMany({
            where: expWhere,
            include: { supplier: { select: { name: true } } },
        });
        for (const e of exps) {
            const L = EXPENSE_LEDGER[e.category];
            rows.push({
                id: `exp-${e.id}`,
                date: e.expenseDate.toISOString(),
                kind: 'EXPENSE',
                label: `${e.description}${e.supplier ? ` — ${e.supplier.name}` : ''}`,
                reference: e.reference,
                amount: Math.round(e.amount),
                ledgerCode: L.code,
                ledgerLabel: L.label,
            });
        }
        const pcWhere = { ...acctWhere };
        if (dateFrom || dateTo) {
            pcWhere.movementDate = {};
            if (dateFrom)
                pcWhere.movementDate.gte = dateFrom;
            if (dateTo)
                pcWhere.movementDate.lte = dateTo;
        }
        const pcs = await prisma_1.default.pettyCashMovement.findMany({ where: pcWhere });
        for (const c of pcs) {
            rows.push({
                id: `pc-${c.id}`,
                date: c.movementDate.toISOString(),
                kind: c.type === 'IN' ? 'PETTY_IN' : 'PETTY_OUT',
                label: c.reason,
                reference: c.reference,
                amount: Math.round(c.amount),
                ledgerCode: PETTY_LEDGER_IN.code,
                ledgerLabel: c.type === 'IN' ? `${PETTY_LEDGER_IN.label} (entrée)` : `${PETTY_LEDGER_OUT.label} (sortie)`,
            });
        }
        rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        res.json(rows);
    }
    catch (e) {
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
    }
});
router.get('/accounting/ledger', async (req, res) => {
    try {
        const { where: acctWhere } = (0, admin_accounting_scope_util_1.resolveAccountingScope)(req);
        const studentWhere = (0, admin_accounting_scope_util_1.resolvePaymentStudentScope)(req);
        const { from, to, academicYear } = req.query;
        const dateFrom = from && typeof from === 'string' ? new Date(from) : undefined;
        const dateTo = to && typeof to === 'string' ? new Date(to) : undefined;
        const rows = [];
        const payWhere = { status: 'COMPLETED', student: studentWhere };
        if (dateFrom || dateTo) {
            payWhere.paidAt = {};
            if (dateFrom)
                payWhere.paidAt.gte = dateFrom;
            if (dateTo)
                payWhere.paidAt.lte = dateTo;
        }
        if (academicYear && typeof academicYear === 'string') {
            payWhere.tuitionFee = { academicYear: String(academicYear), student: studentWhere };
        }
        const pays = await prisma_1.default.payment.findMany({ where: payWhere, select: { amount: true } });
        const tuitionSum = pays.reduce((s, p) => s + p.amount, 0);
        if (tuitionSum > 0) {
            rows.push({
                ledgerCode: TUITION_REVENUE.code,
                ledgerLabel: TUITION_REVENUE.label,
                kind: 'REVENUE',
                amount: Math.round(tuitionSum),
            });
        }
        const expWhere = { ...acctWhere };
        if (dateFrom || dateTo) {
            expWhere.expenseDate = {};
            if (dateFrom)
                expWhere.expenseDate.gte = dateFrom;
            if (dateTo)
                expWhere.expenseDate.lte = dateTo;
        }
        if (academicYear && typeof academicYear === 'string')
            expWhere.academicYear = String(academicYear);
        const exps = await prisma_1.default.schoolExpense.findMany({
            where: expWhere,
            select: { amount: true, category: true },
        });
        const byCat = new Map();
        for (const e of exps) {
            const L = EXPENSE_LEDGER[e.category];
            const k = L.code;
            const prev = byCat.get(k) || { code: L.code, label: L.label, amount: 0 };
            prev.amount += e.amount;
            byCat.set(k, prev);
        }
        for (const v of byCat.values()) {
            rows.push({ ledgerCode: v.code, ledgerLabel: v.label, kind: 'EXPENSE', amount: Math.round(v.amount) });
        }
        const pcWhere = { ...acctWhere };
        if (dateFrom || dateTo) {
            pcWhere.movementDate = {};
            if (dateFrom)
                pcWhere.movementDate.gte = dateFrom;
            if (dateTo)
                pcWhere.movementDate.lte = dateTo;
        }
        const pcs = await prisma_1.default.pettyCashMovement.findMany({ where: pcWhere, select: { type: true, amount: true } });
        let inSum = 0;
        let outSum = 0;
        for (const c of pcs) {
            if (c.type === 'IN')
                inSum += c.amount;
            else
                outSum += c.amount;
        }
        if (inSum > 0) {
            rows.push({
                ledgerCode: '530-IN',
                ledgerLabel: 'Petite caisse — entrées',
                kind: 'PETTY_IN',
                amount: Math.round(inSum),
            });
        }
        if (outSum > 0) {
            rows.push({
                ledgerCode: '530-OUT',
                ledgerLabel: 'Petite caisse — sorties',
                kind: 'PETTY_OUT',
                amount: Math.round(outSum),
            });
        }
        rows.sort((a, b) => a.ledgerCode.localeCompare(b.ledgerCode));
        res.json(rows);
    }
    catch (e) {
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
    }
});
exports.default = router;
//# sourceMappingURL=admin-accounting.routes.js.map