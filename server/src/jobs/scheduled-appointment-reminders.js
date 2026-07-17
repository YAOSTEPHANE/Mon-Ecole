"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startScheduledAppointmentReminders = startScheduledAppointmentReminders;
const node_cron_1 = __importDefault(require("node-cron"));
const appointment_reminders_util_1 = require("../utils/appointment-reminders.util");
function isScheduledAppointmentRemindersEnabled() {
    const v = process.env.ENABLE_SCHEDULED_APPOINTMENT_REMINDERS?.trim().toLowerCase();
    return v === '1' || v === 'true' || v === 'yes';
}
function getCronExpression() {
    const expr = process.env.APPOINTMENT_REMINDERS_CRON?.trim();
    if (expr && node_cron_1.default.validate(expr))
        return expr;
    return '*/15 * * * *';
}
/**
 * Rappels J-24h et H-1 pour les rendez-vous confirmés.
 * Désactivé par défaut ; un seul worker API en production recommandé.
 */
function startScheduledAppointmentReminders() {
    if (process.env.VERCEL === '1')
        return;
    if (!isScheduledAppointmentRemindersEnabled())
        return;
    const expression = getCronExpression();
    if (!node_cron_1.default.validate(expression)) {
        console.warn(`[Rappels RDV] APPOINTMENT_REMINDERS_CRON invalide (${expression}) — désactivé.`);
        return;
    }
    node_cron_1.default.schedule(expression, async () => {
        try {
            const r = await (0, appointment_reminders_util_1.runAppointmentReminders)();
            if (r.reminded24h > 0 || r.reminded1h > 0) {
                console.log(`[Rappels RDV] OK — ~24h: ${r.reminded24h}, ~1h: ${r.reminded1h}.`);
            }
        }
        catch (e) {
            console.error('[Rappels RDV] Erreur :', e);
        }
    });
    console.log(`[Rappels RDV] Planification activée (cron: ${expression}).`);
}
//# sourceMappingURL=scheduled-appointment-reminders.js.map