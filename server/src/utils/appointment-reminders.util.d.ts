/**
 * Notifications ~24 h et ~1 h avant le début des rendez-vous confirmés.
 * Fenêtres larges pour tolérer un cron toutes les 15–60 minutes.
 */
export declare function runAppointmentReminders(): Promise<{
    reminded24h: number;
    reminded1h: number;
}>;
//# sourceMappingURL=appointment-reminders.util.d.ts.map