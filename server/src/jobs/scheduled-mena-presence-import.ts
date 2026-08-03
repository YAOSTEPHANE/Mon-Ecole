import cron from 'node-cron';
import {
  getMenaPresenceCron,
  isMenaPresenceImportEnabled,
  refreshIntegrationSettingsCache,
} from '../utils/integration-settings.util';
import { runMenaPresenceScheduledImport } from '../utils/mena-daily-presence-scheduled.util';

/**
 * Import automatique présence MENA depuis dossier partagé / DB.
 * Désactivé par défaut (env ou admin → Intégrations).
 */
export function startScheduledMenaPresenceImport(): void {
  if (process.env.VERCEL === '1') return;

  void refreshIntegrationSettingsCache().then(() => {
    if (!isMenaPresenceImportEnabled()) return;

    const expression = getMenaPresenceCron();
    if (!cron.validate(expression)) {
      console.warn(`[MENA présence] Cron invalide (${expression}) — désactivé.`);
      return;
    }

    cron.schedule(expression, async () => {
      try {
        await refreshIntegrationSettingsCache();
        if (!isMenaPresenceImportEnabled()) return;
        const result = await runMenaPresenceScheduledImport();
        const filesOk = result.fileReports.reduce(
          (n, f) => n + f.report.imported + f.report.updated,
          0
        );
        const dbOk = result.dbReport
          ? result.dbReport.imported + result.dbReport.updated
          : 0;
        console.log(
          `[MENA présence] Import planifié OK — fichiers: ${result.fileReports.length} (${filesOk} lignes), DB: ${dbOk}`
        );
        if (result.skippedReason) {
          console.warn(`[MENA présence] ${result.skippedReason}`);
        }
      } catch (e) {
        console.error('[MENA présence] Erreur import planifié :', e);
      }
    });

    console.log(`[MENA présence] Planification activée (cron: ${expression}).`);
  });
}
