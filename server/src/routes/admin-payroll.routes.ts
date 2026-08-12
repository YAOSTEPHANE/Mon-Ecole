import express from 'express';
import type { PaymentMethod } from '@prisma/client';
import prisma from '../utils/prisma';
import type { SchoolContextRequest } from '../utils/school-context.util';
import {
  buildPayrollLineDrafts,
  monthLabelFr,
  recomputeLineNet,
  refreshPayrollRunTotals,
  summarizePayrollLines,
} from '../utils/payroll.util';
import { buildPayslipHtml } from '../utils/html-document.util';

const router = express.Router();

function parseYearMonth(bodyOrQuery: Record<string, unknown>): { year: number; month: number } | null {
  const year = Number(bodyOrQuery.year);
  const month = Number(bodyOrQuery.month);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return null;
  if (!Number.isInteger(month) || month < 1 || month > 12) return null;
  return { year, month };
}

function requireSchoolId(req: SchoolContextRequest, res: express.Response): string | null {
  const schoolId = req.schoolId;
  if (!schoolId) {
    res.status(400).json({ error: 'Établissement actif requis pour la paie' });
    return null;
  }
  return schoolId;
}

/** Aperçu des lignes qui seraient générées (sans enregistrer). */
router.get('/hr/payroll/preview', async (req: SchoolContextRequest, res) => {
  try {
    if (!requireSchoolId(req, res)) return;
    const ym = parseYearMonth(req.query as Record<string, unknown>);
    if (!ym) {
      return res.status(400).json({ error: 'Paramètres year et month requis (ex. year=2026&month=7)' });
    }
    const lines = await buildPayrollLineDrafts(ym.year, ym.month);
    const totals = summarizePayrollLines(lines);
    res.json({
      year: ym.year,
      month: ym.month,
      label: monthLabelFr(ym.year, ym.month),
      ...totals,
      lines,
    });
  } catch (e: unknown) {
    console.error('GET /admin/hr/payroll/preview:', e);
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

/** Liste des cycles de paie de l’établissement. */
router.get('/hr/payroll/runs', async (req: SchoolContextRequest, res) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;
    const yearFilter = req.query.year != null ? Number(req.query.year) : undefined;
    const runs = await prisma.payrollRun.findMany({
      where: {
        schoolId,
        ...(yearFilter != null && Number.isFinite(yearFilter) ? { year: yearFilter } : {}),
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      include: {
        lines: false,
      },
    });
    res.json(
      runs.map((r) => ({
        ...r,
        label: monthLabelFr(r.year, r.month),
      })),
    );
  } catch (e: unknown) {
    console.error('GET /admin/hr/payroll/runs:', e);
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

/** Détail d’un cycle + lignes. */
router.get('/hr/payroll/runs/:id', async (req: SchoolContextRequest, res) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;
    const run = await prisma.payrollRun.findFirst({
      where: { id: req.params.id, schoolId },
      include: { lines: { orderBy: { displayName: 'asc' } } },
    });
    if (!run) return res.status(404).json({ error: 'Cycle de paie introuvable' });
    res.json({ ...run, label: monthLabelFr(run.year, run.month) });
  } catch (e: unknown) {
    console.error('GET /admin/hr/payroll/runs/:id:', e);
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

/**
 * Génère (ou régénère si brouillon) un cycle de paie pour un mois.
 * Body: { year, month, notes?, force?: boolean }
 */
router.post('/hr/payroll/runs', async (req: SchoolContextRequest, res) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;
    const adminId = req.user!.id;
    const ym = parseYearMonth(req.body ?? {});
    if (!ym) {
      return res.status(400).json({ error: 'year et month sont requis' });
    }

    const existing = await prisma.payrollRun.findFirst({
      where: { schoolId, year: ym.year, month: ym.month },
    });

    if (existing && existing.status !== 'DRAFT') {
      return res.status(409).json({
        error: `Un cycle ${monthLabelFr(ym.year, ym.month)} existe déjà (${existing.status}). Impossible de régénérer.`,
        runId: existing.id,
      });
    }

    if (existing && existing.status === 'DRAFT' && !req.body?.force) {
      return res.status(409).json({
        error: 'Un brouillon existe déjà pour ce mois. Passez force=true pour le régénérer.',
        runId: existing.id,
      });
    }

    const drafts = await buildPayrollLineDrafts(ym.year, ym.month);
    if (drafts.length === 0) {
      return res.status(400).json({
        error:
          'Aucune fiche avec salaire de référence pour ce mois. Renseignez les salaires sur Enseignants / Éducateurs / Personnel.',
      });
    }
    const totals = summarizePayrollLines(drafts);
    const notes =
      typeof req.body?.notes === 'string' && req.body.notes.trim()
        ? String(req.body.notes).trim()
        : null;

    if (existing?.status === 'DRAFT') {
      await prisma.payrollLine.deleteMany({ where: { payrollRunId: existing.id } });
      await prisma.payrollLine.createMany({
        data: drafts.map((d) => ({
          payrollRunId: existing.id,
          ...d,
        })),
      });
      const updated = await prisma.payrollRun.update({
        where: { id: existing.id },
        data: {
          ...totals,
          notes,
          updatedAt: new Date(),
        },
        include: { lines: { orderBy: { displayName: 'asc' } } },
      });
      return res.json({ ...updated, label: monthLabelFr(updated.year, updated.month) });
    }

    const created = await prisma.payrollRun.create({
      data: {
        schoolId,
        year: ym.year,
        month: ym.month,
        status: 'DRAFT',
        ...totals,
        notes,
        createdByUserId: adminId,
        lines: {
          create: drafts.map((d) => ({ ...d })),
        },
      },
      include: { lines: { orderBy: { displayName: 'asc' } } },
    });

    res.status(201).json({ ...created, label: monthLabelFr(created.year, created.month) });
  } catch (e: unknown) {
    console.error('POST /admin/hr/payroll/runs:', e);
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

/** Met à jour une ligne (brouillon uniquement). */
router.patch('/hr/payroll/runs/:runId/lines/:lineId', async (req: SchoolContextRequest, res) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;
    const run = await prisma.payrollRun.findFirst({
      where: { id: req.params.runId, schoolId },
    });
    if (!run) return res.status(404).json({ error: 'Cycle de paie introuvable' });
    if (run.status !== 'DRAFT') {
      return res.status(400).json({ error: 'Seuls les brouillons peuvent être modifiés' });
    }

    const line = await prisma.payrollLine.findFirst({
      where: { id: req.params.lineId, payrollRunId: run.id },
    });
    if (!line) return res.status(404).json({ error: 'Ligne introuvable' });

    const body = req.body ?? {};
    const baseSalary =
      body.baseSalary !== undefined ? Math.max(0, Math.round(Number(body.baseSalary))) : line.baseSalary;
    const bonuses =
      body.bonuses !== undefined ? Math.max(0, Math.round(Number(body.bonuses))) : line.bonuses;
    const deductions =
      body.deductions !== undefined
        ? Math.max(0, Math.round(Number(body.deductions)))
        : line.deductions;
    const included = body.included !== undefined ? Boolean(body.included) : line.included;
    const notes =
      body.notes !== undefined
        ? body.notes == null || body.notes === ''
          ? null
          : String(body.notes).trim()
        : line.notes;

    if ([baseSalary, bonuses, deductions].some((n) => !Number.isFinite(n))) {
      return res.status(400).json({ error: 'Montants invalides' });
    }

    await prisma.payrollLine.update({
      where: { id: line.id },
      data: {
        baseSalary,
        bonuses,
        deductions,
        netAmount: recomputeLineNet(baseSalary, bonuses, deductions),
        included,
        notes,
      },
    });

    const refreshed = await refreshPayrollRunTotals(run.id);
    res.json({ ...refreshed, label: monthLabelFr(refreshed.year, refreshed.month) });
  } catch (e: unknown) {
    console.error('PATCH /admin/hr/payroll/runs/:runId/lines/:lineId:', e);
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

/** Valider un brouillon. */
router.post('/hr/payroll/runs/:id/validate', async (req: SchoolContextRequest, res) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;
    const run = await prisma.payrollRun.findFirst({
      where: { id: req.params.id, schoolId },
      include: { lines: true },
    });
    if (!run) return res.status(404).json({ error: 'Cycle de paie introuvable' });
    if (run.status !== 'DRAFT') {
      return res.status(400).json({ error: `Statut actuel : ${run.status}` });
    }
    const included = run.lines.filter((l) => l.included);
    if (included.length === 0) {
      return res.status(400).json({ error: 'Aucune ligne incluse à valider' });
    }

    const updated = await prisma.payrollRun.update({
      where: { id: run.id },
      data: {
        status: 'VALIDATED',
        validatedAt: new Date(),
        validatedByUserId: req.user!.id,
      },
      include: { lines: { orderBy: { displayName: 'asc' } } },
    });
    res.json({ ...updated, label: monthLabelFr(updated.year, updated.month) });
  } catch (e: unknown) {
    console.error('POST /admin/hr/payroll/runs/:id/validate:', e);
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

/**
 * Marquer comme payé (+ dépense comptable PAYROLL_AUX optionnelle).
 * Body: { createExpense?: boolean, paymentMethod?: PaymentMethod, academicYear?: string }
 */
router.post('/hr/payroll/runs/:id/mark-paid', async (req: SchoolContextRequest, res) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;
    const run = await prisma.payrollRun.findFirst({
      where: { id: req.params.id, schoolId },
      include: { lines: true },
    });
    if (!run) return res.status(404).json({ error: 'Cycle de paie introuvable' });
    if (run.status !== 'VALIDATED') {
      return res.status(400).json({
        error: 'Le cycle doit être validé avant d’être marqué comme payé',
      });
    }

    let schoolExpenseId = run.schoolExpenseId;
    const createExpense = req.body?.createExpense !== false;
    if (createExpense && !schoolExpenseId && run.totalNet > 0) {
      const paymentMethod = (req.body?.paymentMethod as PaymentMethod) || 'BANK_TRANSFER';
      const expenseDate = new Date(run.year, run.month, 0); // dernier jour du mois
      const expense = await prisma.schoolExpense.create({
        data: {
          schoolId,
          academicYear: req.body?.academicYear ? String(req.body.academicYear) : null,
          expenseDate,
          amount: Math.round(run.totalNet),
          category: 'PAYROLL_AUX',
          description: `Paie personnel — ${monthLabelFr(run.year, run.month)} (${run.lineCount} personne(s))`,
          paymentMethod,
          reference: `PAYROLL-${run.year}-${String(run.month).padStart(2, '0')}`,
          recordedByUserId: req.user!.id,
        },
      });
      schoolExpenseId = expense.id;
    }

    const updated = await prisma.payrollRun.update({
      where: { id: run.id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        paidByUserId: req.user!.id,
        schoolExpenseId,
      },
      include: { lines: { orderBy: { displayName: 'asc' } } },
    });
    res.json({ ...updated, label: monthLabelFr(updated.year, updated.month) });
  } catch (e: unknown) {
    console.error('POST /admin/hr/payroll/runs/:id/mark-paid:', e);
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

/** Annuler un brouillon ou une validation (pas un cycle déjà payé). */
router.post('/hr/payroll/runs/:id/cancel', async (req: SchoolContextRequest, res) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;
    const run = await prisma.payrollRun.findFirst({
      where: { id: req.params.id, schoolId },
    });
    if (!run) return res.status(404).json({ error: 'Cycle de paie introuvable' });
    if (run.status === 'PAID') {
      return res.status(400).json({ error: 'Un cycle déjà payé ne peut pas être annulé' });
    }
    if (run.status === 'CANCELLED') {
      return res.json({ ...run, label: monthLabelFr(run.year, run.month) });
    }

    const updated = await prisma.payrollRun.update({
      where: { id: run.id },
      data: { status: 'CANCELLED' },
      include: { lines: { orderBy: { displayName: 'asc' } } },
    });
    res.json({ ...updated, label: monthLabelFr(updated.year, updated.month) });
  } catch (e: unknown) {
    console.error('POST /admin/hr/payroll/runs/:id/cancel:', e);
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

/** Bulletin de paie HTML (impression / PDF navigateur) pour une ligne. */
router.get('/hr/payroll/runs/:runId/lines/:lineId/payslip-html', async (req: SchoolContextRequest, res) => {
  try {
    const schoolId = requireSchoolId(req, res);
    if (!schoolId) return;

    const line = await prisma.payrollLine.findFirst({
      where: { id: req.params.lineId, payrollRunId: req.params.runId },
      include: { payrollRun: true },
    });
    if (!line || line.payrollRun.schoolId !== schoolId) {
      return res.status(404).json({ error: 'Ligne de paie introuvable' });
    }

    const html = buildPayslipHtml({
      employeeName: line.displayName,
      employeeId: line.employeeId,
      personKind: line.personKind,
      year: line.payrollRun.year,
      month: line.payrollRun.month,
      monthLabel: monthLabelFr(line.payrollRun.year, line.payrollRun.month),
      baseSalary: line.baseSalary,
      bonuses: line.bonuses,
      deductions: line.deductions,
      netPay: line.netAmount,
      notes: line.notes,
    });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="bulletin-paie-${line.employeeId}.html"`
    );
    res.send(html);
  } catch (e: unknown) {
    console.error('GET payslip-html:', e);
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

export default router;
