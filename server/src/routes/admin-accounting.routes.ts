import express from 'express';
import type { PaymentMethod, PettyCashMovementType, Prisma, SchoolExpenseCategory } from '@prisma/client';
import prisma from '../utils/prisma';
import type { SchoolContextRequest } from '../utils/school-context.util';
import { studentScopeWhere } from '../utils/school-context.util';
import {
  assertBudgetLineInSchool,
  assertCashRegisterInSchool,
  assertPettyCashInSchool,
  assertSchoolExpenseInSchool,
  assertSupplierInSchool,
  resolveAccountingScope,
  resolvePaymentStudentScope,
} from '../utils/admin-accounting-scope.util';
import {
  COUNTER_CASH_REGISTER_ID,
  COUNTER_MOBILE_REGISTER_ID,
  computeRegisterBalance,
  counterRegisterVirtual,
  sortCashMovements,
  summarizeRegisterPeriod,
  type CashMovementRow,
  type CashRegisterSummary,
} from '../utils/accounting-cash.util';

const router = express.Router();

const EXPENSE_LEDGER: Record<
  SchoolExpenseCategory,
  { code: string; label: string }
> = {
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

async function ensureDefaultCashRegisters(schoolId: string) {
  const existing = await prisma.cashRegister.count({ where: { schoolId } });
  if (existing > 0) return;
  await prisma.cashRegister.createMany({
    data: [
      {
        schoolId,
        code: 'CAISSE-01',
        name: 'Petite caisse principale',
        type: 'PETTY',
        description: 'Caisse pour dépenses courantes et fonds de roulement',
        openingFloat: 0,
      },
      {
        schoolId,
        code: 'GUICHET-01',
        name: 'Guichet scolarité',
        type: 'COUNTER',
        description: 'Suivi des mouvements manuels guichet (encaissements auto depuis les paiements)',
        openingFloat: 0,
      },
    ],
  });
}

// --- Caisses ---

router.get('/cash-registers', async (req: SchoolContextRequest, res) => {
  try {
    const { schoolId, where } = resolveAccountingScope(req);
    await ensureDefaultCashRegisters(schoolId);
    const rows = await prisma.cashRegister.findMany({
      where,
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });
    res.json(rows);
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

router.post('/cash-registers', async (req: SchoolContextRequest, res) => {
  try {
    const { schoolId } = resolveAccountingScope(req);
    const { code, name, type, description, openingFloat, isActive } = req.body ?? {};
    if (!code || !name) {
      return res.status(400).json({ error: 'code et name sont requis' });
    }
    const t = String(type ?? 'PETTY').toUpperCase();
    if (!['PETTY', 'COUNTER', 'AUXILIARY'].includes(t)) {
      return res.status(400).json({ error: 'type invalide' });
    }
    const row = await prisma.cashRegister.create({
      data: {
        schoolId,
        code: String(code).trim().toUpperCase(),
        name: String(name).trim(),
        type: t as 'PETTY' | 'COUNTER' | 'AUXILIARY',
        description: description ? String(description) : null,
        openingFloat: openingFloat != null ? Math.round(Number(openingFloat)) : 0,
        isActive: isActive !== false,
      },
    });
    res.status(201).json(row);
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

router.put('/cash-registers/:id', async (req: SchoolContextRequest, res) => {
  try {
    if (!(await assertCashRegisterInSchool(req.params.id, req))) {
      return res.status(404).json({ error: 'Caisse introuvable' });
    }
    const { name, description, openingFloat, isActive, type } = req.body ?? {};
    const data: Prisma.CashRegisterUpdateInput = {};
    if (name != null) data.name = String(name).trim();
    if (description !== undefined) data.description = description ? String(description) : null;
    if (openingFloat != null) data.openingFloat = Math.round(Number(openingFloat));
    if (isActive !== undefined) data.isActive = Boolean(isActive);
    if (type != null) {
      const t = String(type).toUpperCase();
      if (!['PETTY', 'COUNTER', 'AUXILIARY'].includes(t)) {
        return res.status(400).json({ error: 'type invalide' });
      }
      data.type = t as 'PETTY' | 'COUNTER' | 'AUXILIARY';
    }
    const row = await prisma.cashRegister.update({ where: { id: req.params.id }, data });
    res.json(row);
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

router.delete('/cash-registers/:id', async (req: SchoolContextRequest, res) => {
  try {
    if (!(await assertCashRegisterInSchool(req.params.id, req))) {
      return res.status(404).json({ error: 'Caisse introuvable' });
    }
    const linked = await prisma.pettyCashMovement.count({
      where: { cashRegisterId: req.params.id },
    });
    if (linked > 0) {
      return res.status(400).json({
        error: 'Impossible de supprimer une caisse avec des mouvements. Désactivez-la plutôt.',
      });
    }
    await prisma.cashRegister.delete({ where: { id: req.params.id } });
    res.json({ message: 'Supprimé' });
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

router.get('/accounting/cash/overview', async (req: SchoolContextRequest, res) => {
  try {
    const { schoolId, where: acctWhere } = resolveAccountingScope(req);
    const studentWhere = resolvePaymentStudentScope(req);
    await ensureDefaultCashRegisters(schoolId);

    const fromQ = typeof req.query.from === 'string' ? req.query.from.trim() : '';
    const toQ = typeof req.query.to === 'string' ? req.query.to.trim() : '';
    const registerId =
      typeof req.query.registerId === 'string' && req.query.registerId !== 'all'
        ? req.query.registerId
        : null;

    const rangeStart = fromQ ? new Date(fromQ) : null;
    const rangeEnd = toQ ? new Date(toQ) : null;
    if (rangeStart && Number.isNaN(rangeStart.getTime())) {
      return res.status(400).json({ error: 'Paramètre from invalide' });
    }
    if (rangeEnd && Number.isNaN(rangeEnd.getTime())) {
      return res.status(400).json({ error: 'Paramètre to invalide' });
    }

    const [registers, movements, payments] = await Promise.all([
      prisma.cashRegister.findMany({ where: acctWhere, orderBy: { name: 'asc' } }),
      prisma.pettyCashMovement.findMany({
        where: acctWhere,
        include: {
          cashRegister: { select: { id: true, code: true, name: true } },
          recordedBy: { select: { firstName: true, lastName: true } },
        },
        orderBy: { movementDate: 'desc' },
      }),
      prisma.payment.findMany({
        where: {
          status: 'COMPLETED',
          student: studentWhere,
          paymentMethod: { in: ['CASH', 'MOBILE_MONEY'] },
          ...(rangeStart && rangeEnd ? { paidAt: { gte: rangeStart, lte: rangeEnd } } : {}),
        },
        select: {
          id: true,
          amount: true,
          paymentMethod: true,
          paymentReference: true,
          paidAt: true,
          createdAt: true,
          student: {
            select: {
              user: { select: { firstName: true, lastName: true } },
            },
          },
          tuitionFee: { select: { period: true } },
        },
        orderBy: { paidAt: 'desc' },
      }),
    ]);

    const registerSummaries: CashRegisterSummary[] = [];
    const defaultPettyId =
      registers.find((r) => r.type === 'PETTY' && r.isActive)?.id ?? registers.find((r) => r.type === 'PETTY')?.id;

    for (const reg of registers) {
      const regMoves = movements.filter(
        (m) => m.cashRegisterId === reg.id || (!m.cashRegisterId && reg.id === defaultPettyId),
      );
      const period = summarizeRegisterPeriod(regMoves, rangeStart, rangeEnd);
      registerSummaries.push({
        id: reg.id,
        code: reg.code,
        name: reg.name,
        type: reg.type,
        isActive: reg.isActive,
        openingFloat: Math.round(reg.openingFloat),
        balance: computeRegisterBalance(
          reg.openingFloat,
          regMoves.map((m) => ({ type: m.type, amount: m.amount })),
        ),
        ...period,
      });
    }

    const cashPayments = payments.filter((p) => p.paymentMethod === 'CASH');
    const mobilePayments = payments.filter((p) => p.paymentMethod === 'MOBILE_MONEY');
    const cashTotal = cashPayments.reduce((s, p) => s + p.amount, 0);
    const mobileTotal = mobilePayments.reduce((s, p) => s + p.amount, 0);

    registerSummaries.push(
      counterRegisterVirtual(
        COUNTER_CASH_REGISTER_ID,
        'GUICHET-ESP',
        'Guichet — espèces (paiements)',
        'COUNTER',
        cashTotal,
        cashPayments.length,
      ),
      counterRegisterVirtual(
        COUNTER_MOBILE_REGISTER_ID,
        'GUICHET-MM',
        'Guichet — mobile money',
        'COUNTER',
        mobileTotal,
        mobilePayments.length,
      ),
    );

    const unified: CashMovementRow[] = [];

    for (const m of movements) {
      if (rangeStart && m.movementDate < rangeStart) continue;
      if (rangeEnd && m.movementDate > rangeEnd) continue;
      const effectiveRegisterId = m.cashRegisterId ?? defaultPettyId ?? 'unknown';
      if (registerId && effectiveRegisterId !== registerId) continue;
      const reg = registers.find((r) => r.id === effectiveRegisterId);
      unified.push({
        id: m.id,
        date: m.movementDate.toISOString(),
        registerId: effectiveRegisterId,
        registerName: reg?.name ?? m.cashRegister?.name ?? 'Petite caisse',
        registerCode: reg?.code ?? m.cashRegister?.code ?? 'CAISSE',
        kind: m.type,
        amount: Math.round(m.amount),
        label: m.reason,
        reference: m.reference,
        recordedBy: `${m.recordedBy.firstName} ${m.recordedBy.lastName}`,
        source: 'PETTY',
      });
    }

    if (!registerId || registerId === COUNTER_CASH_REGISTER_ID) {
      for (const p of cashPayments) {
        unified.push({
          id: `pay-${p.id}`,
          date: (p.paidAt ?? p.createdAt).toISOString(),
          registerId: COUNTER_CASH_REGISTER_ID,
          registerName: 'Guichet — espèces (paiements)',
          registerCode: 'GUICHET-ESP',
          kind: 'COLLECTION',
          amount: Math.round(p.amount),
          label: `Scolarité ${p.tuitionFee.period} — ${p.student.user.firstName} ${p.student.user.lastName}`,
          reference: p.paymentReference,
          paymentMethod: 'CASH',
          source: 'PAYMENT',
        });
      }
    }

    if (!registerId || registerId === COUNTER_MOBILE_REGISTER_ID) {
      for (const p of mobilePayments) {
        unified.push({
          id: `pay-${p.id}`,
          date: (p.paidAt ?? p.createdAt).toISOString(),
          registerId: COUNTER_MOBILE_REGISTER_ID,
          registerName: 'Guichet — mobile money',
          registerCode: 'GUICHET-MM',
          kind: 'COLLECTION',
          amount: Math.round(p.amount),
          label: `Scolarité ${p.tuitionFee.period} — ${p.student.user.firstName} ${p.student.user.lastName}`,
          reference: p.paymentReference,
          paymentMethod: 'MOBILE_MONEY',
          source: 'PAYMENT',
        });
      }
    }

    const physicalRegisters = registerSummaries.filter((r) => !r.isVirtual);
    const physicalIn = physicalRegisters.reduce((s, r) => s + r.periodIn, 0);
    const physicalOut = physicalRegisters.reduce((s, r) => s + r.periodOut, 0);
    const counterCollections = Math.round(cashTotal + mobileTotal);
    const consolidated = {
      registerCount: physicalRegisters.length,
      totalPhysicalBalance: physicalRegisters.reduce((s, r) => s + r.balance, 0),
      periodIn: Math.round(physicalIn + counterCollections),
      periodOut: physicalOut,
      counterCollections,
      movementCount: unified.length,
      netFlow: Math.round(physicalIn + counterCollections - physicalOut),
    };

    res.json({
      period: {
        from: rangeStart?.toISOString() ?? null,
        to: rangeEnd?.toISOString() ?? null,
      },
      registers: registerSummaries,
      consolidated,
      movements: sortCashMovements(unified),
    });
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

// --- Fournisseurs ---

router.get('/suppliers', async (req: SchoolContextRequest, res) => {
  try {
    const { where } = resolveAccountingScope(req);
    const rows = await prisma.supplier.findMany({ where, orderBy: { name: 'asc' } });
    res.json(rows);
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

router.post('/suppliers', async (req: SchoolContextRequest, res) => {
  try {
    const { schoolId } = resolveAccountingScope(req);
    const { name, contactName, email, phone, taxId, address, notes, isActive } = req.body ?? {};
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'name est requis' });
    }
    const row = await prisma.supplier.create({
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
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

router.put('/suppliers/:id', async (req: SchoolContextRequest, res) => {
  try {
    if (!(await assertSupplierInSchool(req.params.id, req))) {
      return res.status(404).json({ error: 'Fournisseur introuvable' });
    }
    const { name, contactName, email, phone, taxId, address, notes, isActive } = req.body ?? {};
    const row = await prisma.supplier.update({
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
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

router.delete('/suppliers/:id', async (req: SchoolContextRequest, res) => {
  try {
    if (!(await assertSupplierInSchool(req.params.id, req))) {
      return res.status(404).json({ error: 'Fournisseur introuvable' });
    }
    await prisma.supplier.delete({ where: { id: req.params.id } });
    res.json({ message: 'Supprimé' });
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

// --- Dépenses ---

router.get('/school-expenses', async (req: SchoolContextRequest, res) => {
  try {
    const { where: schoolScope } = resolveAccountingScope(req);
    const { academicYear, from, to, category } = req.query;
    const where: Prisma.SchoolExpenseWhereInput = { ...schoolScope };
    if (academicYear && typeof academicYear === 'string') where.academicYear = academicYear;
    if (category && typeof category === 'string') where.category = category as SchoolExpenseCategory;
    if (from && typeof from === 'string') {
      const gte = new Date(from);
      where.expenseDate = { ...((where.expenseDate as Prisma.DateTimeFilter) || {}), gte };
    }
    if (to && typeof to === 'string') {
      const lte = new Date(to);
      where.expenseDate = { ...((where.expenseDate as Prisma.DateTimeFilter) || {}), lte };
    }
    const rows = await prisma.schoolExpense.findMany({
      where,
      orderBy: { expenseDate: 'desc' },
      include: {
        supplier: { select: { id: true, name: true } },
        recordedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    res.json(rows);
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

router.post('/school-expenses', async (req: SchoolContextRequest, res) => {
  try {
    const { schoolId } = resolveAccountingScope(req);
    const adminId = req.user!.id;
    const {
      supplierId,
      academicYear,
      expenseDate,
      amount,
      category,
      description,
      paymentMethod,
      isPettyCash,
      reference,
    } = req.body ?? {};
    if (!expenseDate || amount == null || !description) {
      return res.status(400).json({ error: 'expenseDate, amount et description sont requis' });
    }
    const amt = Math.round(Number(amount));
    if (!Number.isFinite(amt) || amt <= 0) return res.status(400).json({ error: 'Montant invalide' });
    const row = await prisma.schoolExpense.create({
      data: {
        schoolId,
        supplierId: supplierId || null,
        academicYear: academicYear ? String(academicYear) : null,
        expenseDate: new Date(expenseDate),
        amount: amt,
        category: (category as SchoolExpenseCategory) || 'OTHER',
        description: String(description).trim(),
        paymentMethod: (paymentMethod as PaymentMethod) || 'BANK_TRANSFER',
        isPettyCash: Boolean(isPettyCash),
        reference: reference ? String(reference) : null,
        recordedByUserId: adminId,
      },
      include: { supplier: true, recordedBy: { select: { firstName: true, lastName: true } } },
    });
    res.status(201).json(row);
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

router.put('/school-expenses/:id', async (req: SchoolContextRequest, res) => {
  try {
    if (!(await assertSchoolExpenseInSchool(req.params.id, req))) {
      return res.status(404).json({ error: 'Dépense introuvable' });
    }
    const {
      supplierId,
      academicYear,
      expenseDate,
      amount,
      category,
      description,
      paymentMethod,
      isPettyCash,
      reference,
    } = req.body ?? {};
    const row = await prisma.schoolExpense.update({
      where: { id: req.params.id },
      data: {
        ...(supplierId !== undefined && { supplierId: supplierId || null }),
        ...(academicYear !== undefined && { academicYear: academicYear ? String(academicYear) : null }),
        ...(expenseDate !== undefined && { expenseDate: new Date(expenseDate) }),
        ...(amount !== undefined && { amount: Math.round(Number(amount)) }),
        ...(category !== undefined && { category: category as SchoolExpenseCategory }),
        ...(description !== undefined && { description: String(description).trim() }),
        ...(paymentMethod !== undefined && { paymentMethod: paymentMethod as PaymentMethod }),
        ...(isPettyCash !== undefined && { isPettyCash: Boolean(isPettyCash) }),
        ...(reference !== undefined && { reference: reference ? String(reference) : null }),
      },
      include: { supplier: true },
    });
    res.json(row);
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

router.delete('/school-expenses/:id', async (req: SchoolContextRequest, res) => {
  try {
    if (!(await assertSchoolExpenseInSchool(req.params.id, req))) {
      return res.status(404).json({ error: 'Dépense introuvable' });
    }
    await prisma.schoolExpense.delete({ where: { id: req.params.id } });
    res.json({ message: 'Supprimé' });
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

// --- Petite caisse ---

router.get('/petty-cash-movements', async (req: SchoolContextRequest, res) => {
  try {
    const { where: schoolScope } = resolveAccountingScope(req);
    const { from, to } = req.query;
    const where: Prisma.PettyCashMovementWhereInput = { ...schoolScope };
    if (from && typeof from === 'string') where.movementDate = { gte: new Date(from) };
    if (to && typeof to === 'string') {
      where.movementDate = { ...((where.movementDate as object) || {}), lte: new Date(to) };
    }
    const rows = await prisma.pettyCashMovement.findMany({
      where,
      orderBy: { movementDate: 'desc' },
      include: {
        recordedBy: { select: { firstName: true, lastName: true } },
        cashRegister: { select: { id: true, code: true, name: true } },
      },
    });
    res.json(rows);
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

router.post('/petty-cash-movements', async (req: SchoolContextRequest, res) => {
  try {
    const { schoolId } = resolveAccountingScope(req);
    const adminId = req.user!.id;
    const { movementDate, type, amount, reason, reference, cashRegisterId } = req.body ?? {};
    if (!movementDate || !type || amount == null || !reason) {
      return res.status(400).json({ error: 'movementDate, type, amount et reason sont requis' });
    }
    const t = String(type).toUpperCase() as PettyCashMovementType;
    if (t !== 'IN' && t !== 'OUT') return res.status(400).json({ error: 'type doit être IN ou OUT' });
    const amt = Math.round(Number(amount));
    if (!Number.isFinite(amt) || amt <= 0) return res.status(400).json({ error: 'Montant invalide' });
    await ensureDefaultCashRegisters(schoolId);
    let registerId: string | null = cashRegisterId ? String(cashRegisterId) : null;
    if (registerId) {
      if (!(await assertCashRegisterInSchool(registerId, req))) {
        return res.status(400).json({ error: 'Caisse introuvable' });
      }
    } else {
      const defaultReg = await prisma.cashRegister.findFirst({
        where: { schoolId, type: 'PETTY', isActive: true },
        orderBy: { createdAt: 'asc' },
      });
      registerId = defaultReg?.id ?? null;
    }
    const row = await prisma.pettyCashMovement.create({
      data: {
        schoolId,
        cashRegisterId: registerId,
        movementDate: new Date(movementDate),
        type: t,
        amount: amt,
        reason: String(reason).trim(),
        reference: reference ? String(reference) : null,
        recordedByUserId: adminId,
      },
      include: { cashRegister: { select: { id: true, code: true, name: true } } },
    });
    res.status(201).json(row);
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

router.delete('/petty-cash-movements/:id', async (req: SchoolContextRequest, res) => {
  try {
    if (!(await assertPettyCashInSchool(req.params.id, req))) {
      return res.status(404).json({ error: 'Mouvement introuvable' });
    }
    await prisma.pettyCashMovement.delete({ where: { id: req.params.id } });
    res.json({ message: 'Supprimé' });
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

router.get('/petty-cash-balance', async (req: SchoolContextRequest, res) => {
  try {
    const { where } = resolveAccountingScope(req);
    const all = await prisma.pettyCashMovement.findMany({
      where,
      select: { type: true, amount: true },
    });
    let bal = 0;
    for (const m of all) {
      bal += m.type === 'IN' ? m.amount : -m.amount;
    }
    res.json({ balance: Math.round(bal) });
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

// --- Budget prévisionnel ---

router.get('/budget-lines', async (req: SchoolContextRequest, res) => {
  try {
    const { where: schoolScope } = resolveAccountingScope(req);
    const { academicYear } = req.query;
    const where: Prisma.BudgetLineWhereInput = { ...schoolScope };
    if (academicYear && typeof academicYear === 'string') where.academicYear = academicYear;
    const rows = await prisma.budgetLine.findMany({
      where,
      orderBy: [{ academicYear: 'asc' }, { label: 'asc' }],
    });
    res.json(rows);
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

router.post('/budget-lines', async (req: SchoolContextRequest, res) => {
  try {
    const { schoolId } = resolveAccountingScope(req);
    const { academicYear, label, category, budgetedAmount, notes } = req.body ?? {};
    if (!academicYear || !label || budgetedAmount == null) {
      return res.status(400).json({ error: 'academicYear, label et budgetedAmount sont requis' });
    }
    const row = await prisma.budgetLine.create({
      data: {
        schoolId,
        academicYear: String(academicYear).trim(),
        label: String(label).trim(),
        category: (category as SchoolExpenseCategory) || 'OTHER',
        budgetedAmount: Math.round(Number(budgetedAmount)),
        notes: notes ? String(notes) : null,
      },
    });
    res.status(201).json(row);
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

router.put('/budget-lines/:id', async (req: SchoolContextRequest, res) => {
  try {
    if (!(await assertBudgetLineInSchool(req.params.id, req))) {
      return res.status(404).json({ error: 'Ligne budgétaire introuvable' });
    }
    const { academicYear, label, category, budgetedAmount, notes } = req.body ?? {};
    const row = await prisma.budgetLine.update({
      where: { id: req.params.id },
      data: {
        ...(academicYear !== undefined && { academicYear: String(academicYear) }),
        ...(label !== undefined && { label: String(label).trim() }),
        ...(category !== undefined && { category: category as SchoolExpenseCategory }),
        ...(budgetedAmount !== undefined && { budgetedAmount: Math.round(Number(budgetedAmount)) }),
        ...(notes !== undefined && { notes: notes ? String(notes) : null }),
      },
    });
    res.json(row);
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

router.delete('/budget-lines/:id', async (req: SchoolContextRequest, res) => {
  try {
    if (!(await assertBudgetLineInSchool(req.params.id, req))) {
      return res.status(404).json({ error: 'Ligne budgétaire introuvable' });
    }
    await prisma.budgetLine.delete({ where: { id: req.params.id } });
    res.json({ message: 'Supprimé' });
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

// --- Synthèses ---

router.get('/accounting/summary', async (req: SchoolContextRequest, res) => {
  try {
    const { where: acctWhere } = resolveAccountingScope(req);
    const studentWhere = resolvePaymentStudentScope(req);
    const { academicYear, from, to } = req.query;
    const dateFrom = from && typeof from === 'string' ? new Date(from) : undefined;
    const dateTo = to && typeof to === 'string' ? new Date(to) : undefined;

    const payWhere: Prisma.PaymentWhereInput = { status: 'COMPLETED', student: studentWhere };
    if (dateFrom || dateTo) {
      payWhere.paidAt = {};
      if (dateFrom) (payWhere.paidAt as Prisma.DateTimeFilter).gte = dateFrom;
      if (dateTo) (payWhere.paidAt as Prisma.DateTimeFilter).lte = dateTo;
    }
    if (academicYear && typeof academicYear === 'string') {
      payWhere.tuitionFee = { academicYear: String(academicYear), student: studentWhere };
    }
    const payments = await prisma.payment.findMany({
      where: payWhere,
      select: { amount: true },
    });
    const tuitionRevenue = payments.reduce((s, p) => s + p.amount, 0);

    const expWhere: Prisma.SchoolExpenseWhereInput = { ...acctWhere };
    if (dateFrom || dateTo) {
      expWhere.expenseDate = {};
      if (dateFrom) (expWhere.expenseDate as Prisma.DateTimeFilter).gte = dateFrom;
      if (dateTo) (expWhere.expenseDate as Prisma.DateTimeFilter).lte = dateTo;
    }
    if (academicYear && typeof academicYear === 'string') {
      expWhere.academicYear = String(academicYear);
    }
    const expenses = await prisma.schoolExpense.findMany({
      where: expWhere,
      select: { amount: true, category: true },
    });
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const expensesByCategory = expenses.reduce<Record<string, number>>((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {});

    const petty = await prisma.pettyCashMovement.findMany({
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
      } else {
        pettyNet -= p.amount;
        pettyOutPeriod += p.amount;
      }
    }

    const allPetty = await prisma.pettyCashMovement.findMany({
      where: acctWhere,
      select: { type: true, amount: true },
    });
    let pettyBalance = 0;
    for (const p of allPetty) {
      pettyBalance += p.type === 'IN' ? p.amount : -p.amount;
    }

    const budgetRows =
      academicYear && typeof academicYear === 'string'
        ? await prisma.budgetLine.findMany({
            where: { academicYear: String(academicYear), ...acctWhere },
          })
        : await prisma.budgetLine.findMany({ where: acctWhere });
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
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

router.get('/accounting/journal', async (req: SchoolContextRequest, res) => {
  try {
    const { where: acctWhere } = resolveAccountingScope(req);
    const studentWhere = resolvePaymentStudentScope(req);
    const { from, to, academicYear } = req.query;
    const dateFrom = from && typeof from === 'string' ? new Date(from) : undefined;
    const dateTo = to && typeof to === 'string' ? new Date(to) : undefined;

    type JRow = {
      id: string;
      date: string;
      kind: 'REVENUE' | 'EXPENSE' | 'PETTY_IN' | 'PETTY_OUT';
      label: string;
      reference: string | null;
      amount: number;
      ledgerCode: string;
      ledgerLabel: string;
      paymentMethod: string | null;
      debit: number;
      credit: number;
    };
    const rows: JRow[] = [];

    const payWhere: Prisma.PaymentWhereInput = { status: 'COMPLETED', student: studentWhere };
    if (dateFrom || dateTo) {
      payWhere.paidAt = {};
      if (dateFrom) (payWhere.paidAt as Prisma.DateTimeFilter).gte = dateFrom;
      if (dateTo) (payWhere.paidAt as Prisma.DateTimeFilter).lte = dateTo;
    }
    if (academicYear && typeof academicYear === 'string') {
      payWhere.tuitionFee = { academicYear: String(academicYear), student: studentWhere };
    }
    const pays = await prisma.payment.findMany({
      where: payWhere,
      include: {
        tuitionFee: { select: { period: true, academicYear: true } },
        student: { include: { user: { select: { firstName: true, lastName: true } } } },
      },
    });
    for (const p of pays) {
      const payAmount = Math.round(p.amount);
      rows.push({
        id: `pay-${p.id}`,
        date: (p.paidAt || p.createdAt).toISOString(),
        kind: 'REVENUE',
        label: `Scolarité — ${p.tuitionFee.period} (${p.tuitionFee.academicYear}) — ${p.student.user.firstName} ${p.student.user.lastName}`,
        reference: p.paymentReference,
        amount: payAmount,
        ledgerCode: TUITION_REVENUE.code,
        ledgerLabel: TUITION_REVENUE.label,
        paymentMethod: p.paymentMethod,
        debit: 0,
        credit: payAmount,
      });
    }

    const expWhere: Prisma.SchoolExpenseWhereInput = { ...acctWhere };
    if (dateFrom || dateTo) {
      expWhere.expenseDate = {};
      if (dateFrom) (expWhere.expenseDate as Prisma.DateTimeFilter).gte = dateFrom;
      if (dateTo) (expWhere.expenseDate as Prisma.DateTimeFilter).lte = dateTo;
    }
    if (academicYear && typeof academicYear === 'string') expWhere.academicYear = String(academicYear);
    const exps = await prisma.schoolExpense.findMany({
      where: expWhere,
      include: { supplier: { select: { name: true } } },
    });
    for (const e of exps) {
      const L = EXPENSE_LEDGER[e.category];
      const expAmount = Math.round(e.amount);
      rows.push({
        id: `exp-${e.id}`,
        date: e.expenseDate.toISOString(),
        kind: 'EXPENSE',
        label: `${e.description}${e.supplier ? ` — ${e.supplier.name}` : ''}`,
        reference: e.reference,
        amount: expAmount,
        ledgerCode: L.code,
        ledgerLabel: L.label,
        paymentMethod: e.paymentMethod,
        debit: expAmount,
        credit: 0,
      });
    }

    const pcWhere: Prisma.PettyCashMovementWhereInput = { ...acctWhere };
    if (dateFrom || dateTo) {
      pcWhere.movementDate = {};
      if (dateFrom) (pcWhere.movementDate as Prisma.DateTimeFilter).gte = dateFrom;
      if (dateTo) (pcWhere.movementDate as Prisma.DateTimeFilter).lte = dateTo;
    }
    const pcs = await prisma.pettyCashMovement.findMany({ where: pcWhere });
    for (const c of pcs) {
      const pcAmount = Math.round(c.amount);
      const isIn = c.type === 'IN';
      rows.push({
        id: `pc-${c.id}`,
        date: c.movementDate.toISOString(),
        kind: isIn ? 'PETTY_IN' : 'PETTY_OUT',
        label: c.reason,
        reference: c.reference,
        amount: pcAmount,
        ledgerCode: PETTY_LEDGER_IN.code,
        ledgerLabel: isIn ? `${PETTY_LEDGER_IN.label} (entrée)` : `${PETTY_LEDGER_OUT.label} (sortie)`,
        paymentMethod: null,
        debit: isIn ? 0 : pcAmount,
        credit: isIn ? pcAmount : 0,
      });
    }

    rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    res.json(rows);
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

router.get('/accounting/ledger', async (req: SchoolContextRequest, res) => {
  try {
    const { where: acctWhere } = resolveAccountingScope(req);
    const studentWhere = resolvePaymentStudentScope(req);
    const { from, to, academicYear } = req.query;
    const dateFrom = from && typeof from === 'string' ? new Date(from) : undefined;
    const dateTo = to && typeof to === 'string' ? new Date(to) : undefined;

    type JRow = {
      ledgerCode: string;
      ledgerLabel: string;
      kind: string;
      amount: number;
    };
    const rows: JRow[] = [];

    const payWhere: Prisma.PaymentWhereInput = { status: 'COMPLETED', student: studentWhere };
    if (dateFrom || dateTo) {
      payWhere.paidAt = {};
      if (dateFrom) (payWhere.paidAt as Prisma.DateTimeFilter).gte = dateFrom;
      if (dateTo) (payWhere.paidAt as Prisma.DateTimeFilter).lte = dateTo;
    }
    if (academicYear && typeof academicYear === 'string') {
      payWhere.tuitionFee = { academicYear: String(academicYear), student: studentWhere };
    }
    const pays = await prisma.payment.findMany({ where: payWhere, select: { amount: true } });
    const tuitionSum = pays.reduce((s, p) => s + p.amount, 0);
    if (tuitionSum > 0) {
      rows.push({
        ledgerCode: TUITION_REVENUE.code,
        ledgerLabel: TUITION_REVENUE.label,
        kind: 'REVENUE',
        amount: Math.round(tuitionSum),
      });
    }

    const expWhere: Prisma.SchoolExpenseWhereInput = { ...acctWhere };
    if (dateFrom || dateTo) {
      expWhere.expenseDate = {};
      if (dateFrom) (expWhere.expenseDate as Prisma.DateTimeFilter).gte = dateFrom;
      if (dateTo) (expWhere.expenseDate as Prisma.DateTimeFilter).lte = dateTo;
    }
    if (academicYear && typeof academicYear === 'string') expWhere.academicYear = String(academicYear);
    const exps = await prisma.schoolExpense.findMany({
      where: expWhere,
      select: { amount: true, category: true },
    });
    const byCat = new Map<string, { code: string; label: string; amount: number }>();
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

    const pcWhere: Prisma.PettyCashMovementWhereInput = { ...acctWhere };
    if (dateFrom || dateTo) {
      pcWhere.movementDate = {};
      if (dateFrom) (pcWhere.movementDate as Prisma.DateTimeFilter).gte = dateFrom;
      if (dateTo) (pcWhere.movementDate as Prisma.DateTimeFilter).lte = dateTo;
    }
    const pcs = await prisma.pettyCashMovement.findMany({ where: pcWhere, select: { type: true, amount: true } });
    let inSum = 0;
    let outSum = 0;
    for (const c of pcs) {
      if (c.type === 'IN') inSum += c.amount;
      else outSum += c.amount;
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
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

export default router;
