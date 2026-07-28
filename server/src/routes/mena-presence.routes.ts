import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { secureCompareStrings } from '../utils/secure-compare.util';
import {
  importMenaDailyPresenceRows,
  type MenaPresenceImportRow,
} from '../utils/mena-daily-presence-import.util';
import { deviceBiometricLimiter } from '../middleware/rate-limit.middleware';

const router = express.Router();

function readPresenceSecret(req: Request): string | undefined {
  const header = req.headers['x-mena-presence-secret'];
  if (typeof header === 'string' && header.length > 0) return header;
  const alt = req.headers['x-mena-webhook-secret'];
  if (typeof alt === 'string' && alt.length > 0) return alt;
  const bodyKey = req.body?.secret;
  if (typeof bodyKey === 'string' && bodyKey.length > 0) return bodyKey;
  return undefined;
}

function verifyMenaPresenceSecret(req: Request, res: Response, next: NextFunction): void {
  const expected = process.env.MENA_PRESENCE_WEBHOOK_SECRET?.trim();
  if (!expected) {
    res.status(503).json({
      error:
        'MENA_PRESENCE_WEBHOOK_SECRET non configuré sur le serveur. Impossible d’accepter les webhooks.',
    });
    return;
  }
  const provided = readPresenceSecret(req);
  if (!provided || !secureCompareStrings(provided, expected)) {
    res.status(401).json({ error: 'Secret webhook invalide' });
    return;
  }
  next();
}

router.use(deviceBiometricLimiter);
router.use(verifyMenaPresenceSecret);

function normalizeBodyToRows(body: unknown): MenaPresenceImportRow[] {
  if (!body || typeof body !== 'object') return [];
  const b = body as Record<string, unknown>;

  if (Array.isArray(b.records)) {
    return b.records
      .filter((r): r is Record<string, unknown> => !!r && typeof r === 'object')
      .map((r) => ({
        externalId: String(
          r.matricule ?? r.nationalMatricule ?? r.studentId ?? r.nfcId ?? r.biometricId ?? r.id ?? '',
        ),
        date: (r.date as string | Date | undefined) ?? (b.date as string | undefined),
        status: r.status != null ? String(r.status) : r.statut != null ? String(r.statut) : undefined,
        checkInAt: (r.checkInAt as string | Date | undefined) ?? (r.heure_arrivee as string | undefined),
        externalRef: r.externalRef != null ? String(r.externalRef) : null,
        rawPayload: r as object,
      }));
  }

  const singleId = b.matricule ?? b.nationalMatricule ?? b.studentId ?? b.nfcId ?? b.biometricId ?? b.id;
  if (singleId != null && String(singleId).trim()) {
    return [
      {
        externalId: String(singleId),
        date: b.date as string | Date | undefined,
        status: b.status != null ? String(b.status) : b.statut != null ? String(b.statut) : undefined,
        checkInAt:
          (b.checkInAt as string | Date | undefined) ?? (b.heure_arrivee as string | undefined),
        externalRef: b.externalRef != null ? String(b.externalRef) : null,
        rawPayload: b as object,
      },
    ];
  }

  return [];
}

/**
 * Webhook logiciel MENA → présence journalière.
 * Header: X-Mena-Presence-Secret: <MENA_PRESENCE_WEBHOOK_SECRET>
 */
router.post('/webhook', async (req, res) => {
  try {
    const rows = normalizeBodyToRows(req.body);
    if (rows.length === 0) {
      return res.status(400).json({
        error:
          'Aucun enregistrement. Envoyez { matricule, date?, statut?, checkInAt? } ou { date?, records: [...] }.',
      });
    }

    const defaultDate =
      typeof req.body?.date === 'string' && req.body.date.trim() ? req.body.date.trim() : undefined;

    const report = await importMenaDailyPresenceRows(rows, 'MENA_API', { defaultDate });
    res.status(201).json({ success: true, ...report });
  } catch (e) {
    console.error('POST /mena-presence/webhook:', e);
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

export default router;
