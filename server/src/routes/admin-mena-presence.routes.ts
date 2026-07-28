import express from 'express';
import prisma from '../utils/prisma';
import type { SchoolContextRequest } from '../utils/school-context.util';
import {
  importMenaDailyPresenceRows,
  MENA_PRESENCE_CSV_TEMPLATE,
  normalizePresenceDay,
  parseMenaPresenceCsv,
} from '../utils/mena-daily-presence-import.util';

const router = express.Router();

function presenceWebhookConfigured(): boolean {
  return Boolean(process.env.MENA_PRESENCE_WEBHOOK_SECRET?.trim());
}

function watchDirConfigured(): boolean {
  return Boolean(process.env.MENA_PRESENCE_WATCH_DIR?.trim());
}

function dbImportConfigured(): boolean {
  return Boolean(process.env.MENA_PRESENCE_DB_URL?.trim());
}

function scheduledImportEnabled(): boolean {
  const v = process.env.ENABLE_SCHEDULED_MENA_PRESENCE_IMPORT?.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

/** Statut des canaux d’import présence journalière MENA. */
router.get('/mena-presence/status', async (_req: SchoolContextRequest, res) => {
  try {
    res.json({
      webhookConfigured: presenceWebhookConfigured(),
      watchDirConfigured: watchDirConfigured(),
      watchDir: process.env.MENA_PRESENCE_WATCH_DIR?.trim() || null,
      dbConfigured: dbImportConfigured(),
      scheduledImportEnabled: scheduledImportEnabled(),
      cron: process.env.MENA_PRESENCE_IMPORT_CRON?.trim() || '15 18 * * *',
    });
  } catch (e) {
    console.error('GET /admin/mena-presence/status:', e);
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

router.get('/mena-presence/csv-template', (_req, res) => {
  res
    .type('text/csv; charset=utf-8')
    .setHeader('Content-Disposition', 'attachment; filename="mena-presence-template.csv"')
    .send('\ufeff' + MENA_PRESENCE_CSV_TEMPLATE);
});

/** Import CSV/Excel exporté (texte CSV) depuis le logiciel MENA. */
router.post('/mena-presence/import-csv', async (req: SchoolContextRequest, res) => {
  try {
    const csv = typeof req.body.csv === 'string' ? req.body.csv : '';
    if (!csv.trim()) {
      return res.status(400).json({ error: 'CSV vide ou manquant (champ csv)' });
    }

    const defaultDate =
      typeof req.body.date === 'string' && req.body.date.trim()
        ? req.body.date.trim()
        : undefined;

    const rows = parseMenaPresenceCsv(csv);
    if (rows.length === 0) {
      return res.status(400).json({ error: 'Aucune ligne exploitable dans le CSV' });
    }

    const report = await importMenaDailyPresenceRows(rows, 'MENA_CSV', { defaultDate });
    res.status(201).json(report);
  } catch (e) {
    console.error('POST /admin/mena-presence/import-csv:', e);
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

/** Liste des présences journalières pour une date. */
router.get('/mena-presence/day', async (req: SchoolContextRequest, res) => {
  try {
    const dateRaw = typeof req.query.date === 'string' ? req.query.date : undefined;
    const day = normalizePresenceDay(dateRaw);
    const next = new Date(day);
    next.setDate(next.getDate() + 1);

    const schoolId = req.schoolId ?? null;

    const rows = await prisma.studentDailyPresence.findMany({
      where: {
        date: { gte: day, lt: next },
        ...(schoolId
          ? {
              student: {
                OR: [{ schoolId }, { schoolId: null }],
              },
            }
          : {}),
      },
      include: {
        student: {
          select: {
            id: true,
            studentId: true,
            nationalMatricule: true,
            class: { select: { id: true, name: true } },
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { checkInAt: 'asc' },
    });

    const present = rows.filter((r) => r.status === 'PRESENT' || r.status === 'LATE').length;
    const absent = rows.filter((r) => r.status === 'ABSENT').length;
    const late = rows.filter((r) => r.status === 'LATE').length;

    res.json({
      date: day.toISOString().slice(0, 10),
      counts: { total: rows.length, present, absent, late },
      rows,
    });
  } catch (e) {
    console.error('GET /admin/mena-presence/day:', e);
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

/** Déclenche manuellement l’import dossier / DB (même logique que le cron). */
router.post('/mena-presence/run-scheduled', async (_req: SchoolContextRequest, res) => {
  try {
    const { runMenaPresenceScheduledImport } = await import(
      '../utils/mena-daily-presence-scheduled.util'
    );
    const result = await runMenaPresenceScheduledImport();
    res.json(result);
  } catch (e) {
    console.error('POST /admin/mena-presence/run-scheduled:', e);
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

export default router;
