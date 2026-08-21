import cron from 'node-cron';
import { runAutomaticTuitionReminders } from '../utils/tuition-financial-automation.util';

function isScheduledTuitionRemindersEnabled(): boolean {
  const v = process.env.ENABLE_SCHEDULED_TUITION_REMINDERS?.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

function getCronExpression(): string {
  const expr = process.env.TUITION_REMINDERS_CRON?.trim();
  if (expr && cron.validate(expr)) return expr;
  return '0 8 * * *';
}

/**
 * Relances automatiques (notifications + e-mail si SMTP configuré).
 * Désactivé par défaut ; un seul worker API en production recommandé.
 */
export function startScheduledTuitionReminders(): void {
  if (process.env.VERCEL === '1') return;
  if (!isScheduledTuitionRemindersEnabled()) return;

  const expression = getCronExpression();
  if (!cron.validate(expression)) {
    console.warn(`[Relances frais] TUITION_REMINDERS_CRON invalide (${expression}) — désactivé.`);
    return;
  }

  const minDays = Math.max(
    1,
    parseInt(process.env.TUITION_REMINDER_MIN_INTERVAL_DAYS || '7', 10) || 7
  );

  cron.schedule(expression, async () => {
    try {
      const r = await runAutomaticTuitionReminders({ minIntervalDays: minDays });
      console.log(
        `[Relances frais] OK — ${r.notifiedFees} ligne(s), ~${r.parentNotifications} notif(s), ` +
          `${r.smsSent} SMS, ${r.whatsappSent} WhatsApp.`,
      );
    } catch (e) {
      console.error('[Relances frais] Erreur :', e);
    }
  });

  console.log(
    `[Relances frais] Planification activée (cron: ${expression}, intervalle min. ${minDays} jours).`
  );
}
