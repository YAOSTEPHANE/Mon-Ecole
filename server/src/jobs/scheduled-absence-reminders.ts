import cron from 'node-cron';
import { runAutomaticAbsenceReminders } from '../utils/absence-reminder.util';

function isEnabled(): boolean {
  const v = process.env.ENABLE_SCHEDULED_ABSENCE_REMINDERS?.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

function getCronExpression(): string {
  const expr = process.env.ABSENCE_REMINDERS_CRON?.trim();
  if (expr && cron.validate(expr)) return expr;
  return '0 10,14 * * 1-5';
}

/**
 * Relances automatiques absences non justifiées (e-mail, SMS, WhatsApp, notification app).
 * Désactivé par défaut ; activer avec ENABLE_SCHEDULED_ABSENCE_REMINDERS=true
 */
export function startScheduledAbsenceReminders(): void {
  if (process.env.VERCEL === '1') return;
  if (!isEnabled()) return;

  const expression = getCronExpression();
  if (!cron.validate(expression)) {
    console.warn(`[Relances absence] ABSENCE_REMINDERS_CRON invalide (${expression}) — désactivé.`);
    return;
  }

  cron.schedule(expression, async () => {
    try {
      const r = await runAutomaticAbsenceReminders();
      console.log(
        `[Relances absence] OK — ${r.remindersSent} relance(s) sur ${r.studentsChecked} absence(s).`
      );
    } catch (e) {
      console.error('[Relances absence] Erreur :', e);
    }
  });

  console.log(`[Relances absence] Planification activée (cron: ${expression}).`);
}
