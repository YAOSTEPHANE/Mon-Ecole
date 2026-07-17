"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startScheduledTuitionReminders = startScheduledTuitionReminders;
const node_cron_1 = __importDefault(require("node-cron"));
const tuition_financial_automation_util_1 = require("../utils/tuition-financial-automation.util");
function isScheduledTuitionRemindersEnabled() {
    const v = process.env.ENABLE_SCHEDULED_TUITION_REMINDERS?.trim().toLowerCase();
    return v === '1' || v === 'true' || v === 'yes';
}
function getCronExpression() {
    const expr = process.env.TUITION_REMINDERS_CRON?.trim();
    if (expr && node_cron_1.default.validate(expr))
        return expr;
    return '0 8 * * *';
}
/**
 * Relances automatiques (notifications + e-mail si SMTP configuré).
 * Désactivé par défaut ; un seul worker API en production recommandé.
 */
function startScheduledTuitionReminders() {
    if (process.env.VERCEL === '1')
        return;
    if (!isScheduledTuitionRemindersEnabled())
        return;
    const expression = getCronExpression();
    if (!node_cron_1.default.validate(expression)) {
        console.warn(`[Relances frais] TUITION_REMINDERS_CRON invalide (${expression}) — désactivé.`);
        return;
    }
    const minDays = Math.max(1, parseInt(process.env.TUITION_REMINDER_MIN_INTERVAL_DAYS || '7', 10) || 7);
    node_cron_1.default.schedule(expression, async () => {
        try {
            const r = await (0, tuition_financial_automation_util_1.runAutomaticTuitionReminders)({ minIntervalDays: minDays });
            console.log(`[Relances frais] OK — ${r.notifiedFees} ligne(s), ~${r.parentNotifications} notif(s) parents.`);
        }
        catch (e) {
            console.error('[Relances frais] Erreur :', e);
        }
    });
    console.log(`[Relances frais] Planification activée (cron: ${expression}, intervalle min. ${minDays} jours).`);
}
//# sourceMappingURL=scheduled-tuition-reminders.js.map