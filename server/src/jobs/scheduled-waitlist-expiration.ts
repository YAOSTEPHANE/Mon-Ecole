import cron from 'node-cron';
import { expireStaleWaitlistAdmissions } from '../utils/waitlist-expiration.util';

function isEnabled(): boolean {
  const v = process.env.ENABLE_SCHEDULED_WAITLIST_EXPIRATION?.trim().toLowerCase();
  // Activé par défaut (sauf désactivation explicite)
  if (v === '0' || v === 'false' || v === 'no') return false;
  return true;
}

function getCronExpression(): string {
  const expr = process.env.WAITLIST_EXPIRATION_CRON?.trim();
  if (expr && cron.validate(expr)) return expr;
  return '30 3 * * *'; // chaque nuit à 03:30
}

function getMaxAgeDays(): number {
  const raw = Number(process.env.WAITLIST_MAX_AGE_DAYS);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 30;
}

export function startScheduledWaitlistExpiration(): void {
  if (process.env.VERCEL === '1') return;
  if (!isEnabled()) {
    console.log('[WAITLIST] Expiration auto désactivée (ENABLE_SCHEDULED_WAITLIST_EXPIRATION=false).');
    return;
  }

  const expression = getCronExpression();
  if (!cron.validate(expression)) {
    console.warn(`[WAITLIST] Cron invalide (${expression}) — désactivé.`);
    return;
  }

  cron.schedule(expression, async () => {
    try {
      const r = await expireStaleWaitlistAdmissions({ maxAgeDays: getMaxAgeDays() });
      if (r.expired > 0) {
        console.log(`[WAITLIST] ${r.expired} dossier(s) expirés (> ${r.maxAgeDays} j).`);
      }
    } catch (e) {
      console.error('[WAITLIST] Erreur expiration :', e);
    }
  });

  console.log(`[WAITLIST] Expiration auto planifiée (cron: ${expression}, maxAge=${getMaxAgeDays()}j).`);
}
