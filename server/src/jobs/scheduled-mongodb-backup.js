"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startScheduledMongoBackups = startScheduledMongoBackups;
const node_cron_1 = __importDefault(require("node-cron"));
const mongodb_backup_util_1 = require("../utils/mongodb-backup.util");
function isScheduledBackupsEnabled() {
    const v = process.env.ENABLE_SCHEDULED_MONGODB_BACKUPS?.trim().toLowerCase();
    return v === '1' || v === 'true' || v === 'yes';
}
function getCronExpression() {
    const expr = process.env.MONGODB_BACKUP_CRON?.trim();
    if (expr && node_cron_1.default.validate(expr))
        return expr;
    return '0 3 * * *';
}
/**
 * Planifie des sauvegardes MongoDB dans le processus API (un seul worker en prod recommandé).
 * Désactivé sur Vercel (pas de système de fichiers persistant).
 */
function startScheduledMongoBackups() {
    if (!(0, mongodb_backup_util_1.isMongoBackupFilesystemWritable)())
        return;
    if (!isScheduledBackupsEnabled())
        return;
    const expression = getCronExpression();
    if (!node_cron_1.default.validate(expression)) {
        console.warn(`[Sauvegardes] MONGODB_BACKUP_CRON invalide (${expression}) — planification désactivée.`);
        return;
    }
    node_cron_1.default.schedule(expression, async () => {
        const result = await (0, mongodb_backup_util_1.runMongoBackup)();
        if (result.ok) {
            console.log(`[Sauvegardes] MongoDB OK → ${result.archivePath}`);
        }
        else {
            console.error(`[Sauvegardes] MongoDB échec : ${result.error}`);
        }
    });
    console.log(`[Sauvegardes] Planification MongoDB activée (cron: ${expression}). ` +
        'Pour plusieurs instances, utilisez plutôt une tâche cron système ou les sauvegardes Atlas.');
}
//# sourceMappingURL=scheduled-mongodb-backup.js.map