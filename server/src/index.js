"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const jwt_util_1 = require("./utils/jwt.util");
const blob_storage_util_1 = require("./utils/blob-storage.util");
const createApp_1 = require("./app/createApp");
const scheduled_mongodb_backup_1 = require("./jobs/scheduled-mongodb-backup");
const scheduled_tuition_reminders_1 = require("./jobs/scheduled-tuition-reminders");
const scheduled_appointment_reminders_1 = require("./jobs/scheduled-appointment-reminders");
const production_env_diagnostics_util_1 = require("./utils/production-env-diagnostics.util");
dotenv_1.default.config();
try {
    (0, jwt_util_1.ensureJwtConfiguration)();
}
catch (e) {
    console.error(e);
    if (process.env.NODE_ENV === 'production') {
        process.exit(1);
    }
}
(0, production_env_diagnostics_util_1.logDatabaseUrlDiagnostics)();
(0, production_env_diagnostics_util_1.logProductionEnvDiagnostics)();
if (process.env.NODE_ENV === 'production' && !process.env.SENSITIVE_FIELD_ENCRYPTION_KEY?.trim()) {
    console.warn('[Sécurité] SENSITIVE_FIELD_ENCRYPTION_KEY est absent — les champs élève sensibles (adresse, urgence, santé) sont stockés en clair. Définissez une clé forte et ré-enregistrez les données si besoin.');
}
if (process.env.VERCEL === '1' && !(0, blob_storage_util_1.useBlobStorage)()) {
    console.error('[Uploads] BLOB_READ_WRITE_TOKEN manquant — les fichiers uploadés ne seront pas conservés après un redéploiement. Ajoutez un Blob store : Vercel → Storage → Blob → Connect to project.');
}
const app = (0, createApp_1.createApp)();
const PORT = process.env.PORT || 5000;
if (process.env.VERCEL !== '1') {
    (0, scheduled_mongodb_backup_1.startScheduledMongoBackups)();
    (0, scheduled_tuition_reminders_1.startScheduledTuitionReminders)();
    (0, scheduled_appointment_reminders_1.startScheduledAppointmentReminders)();
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
    });
}
exports.default = app;
//# sourceMappingURL=index.js.map