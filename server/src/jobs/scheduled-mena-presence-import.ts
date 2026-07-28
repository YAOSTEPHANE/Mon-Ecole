import cron from 'node-cron';
import { runMenaPresenceScheduledImport } from '../utils/mena-daily-presence-scheduled.util';

function isEnabled(): boolean {
  const v = process.env.ENABLE_SCHEDULED_MENA_PRESENCE_IMPORT?.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

function getCronExpression(): string {
  const expr = process.env.MENA_PRESENCE_IMPORT_CRON?.trim();
  if (expr && cron.validate(expr)) return expr;
  return '15 18 * * *';
}

/**
 * Import automatique présence MENA depuis dossier partagé / DB.
 * Désactivé par défaut.
 */
export function startScheduledMenaPresenceImport(): void {
  if (process.env.VERCEL === '1') return;
  if (!isEnabled()) return;

  const expression = getCronExpression();
  if (!cron.validate(expression)) {
    console.warn(`[MENA présence] MENA_PRESENCE_IMPORT_CRON invalide (${expression}) — désactivé.`);
    return;
  }

  cron.schedule(expression, async () => {
    try {
      const result = await runMenaPresenceScheduledImport();
      const filesOk = result.fileReports.reduce(
        (n, f) => n + f.report.imported + f.report.updated,
        0,
      );
      const dbOk = result.dbReport
        ? result.dbReport.imported + result.dbReport.updated
        : 0;
      console.log(
        `[MENA présence] Import planifié OK — fichiers: ${result.fileReports.length} (${filesOk} lignes), DB: ${dbOk}`,
      );
      if (result.skippedReason) {
        console.warn(`[MENA présence] ${result.skippedReason}`);
      }
    } catch (e) {
      console.error('[MENA présence] Erreur import planifié :', e);
    }
  });

  console.log(`[MENA présence] Planification activée (cron: ${expression}).`);
}
