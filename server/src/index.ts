import dotenv from 'dotenv';
import { ensureJwtConfiguration } from './utils/jwt.util';
import { useBlobStorage } from './utils/blob-storage.util';
import { createApp } from './app/createApp';
import { attachRealtime } from './utils/realtime.util';
import http from 'http';
import { startScheduledMongoBackups } from './jobs/scheduled-mongodb-backup';
import { startScheduledTuitionReminders } from './jobs/scheduled-tuition-reminders';
import { startScheduledAppointmentReminders } from './jobs/scheduled-appointment-reminders';
import { startScheduledMenaPresenceImport } from './jobs/scheduled-mena-presence-import';
import { startScheduledAbsenceReminders } from './jobs/scheduled-absence-reminders';
import {
  logDatabaseUrlDiagnostics,
  logProductionEnvDiagnostics,
} from './utils/production-env-diagnostics.util';
import { requireSensitiveFieldEncryptionKey } from './utils/field-encryption.util';
import { refreshIntegrationSettingsCache } from './utils/integration-settings.util';

dotenv.config();

try {
  ensureJwtConfiguration();
} catch (e) {
  console.error(e);
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}

try {
  requireSensitiveFieldEncryptionKey();
} catch (e) {
  console.error(e);
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}

logDatabaseUrlDiagnostics();
logProductionEnvDiagnostics();

void refreshIntegrationSettingsCache().catch((e) => {
  console.warn('[integrations] Cache non chargé au démarrage:', e);
});

if (process.env.VERCEL === '1' && !useBlobStorage()) {
  console.error(
    '[Uploads] BLOB_READ_WRITE_TOKEN manquant — les fichiers uploadés ne seront pas conservés après un redéploiement. Ajoutez un Blob store : Vercel → Storage → Blob → Connect to project.',
  );
}

const app = createApp();
const PORT = process.env.PORT || 5000;

if (process.env.VERCEL !== '1') {
  startScheduledMongoBackups();
  startScheduledTuitionReminders();
  startScheduledAppointmentReminders();
  startScheduledMenaPresenceImport();
  startScheduledAbsenceReminders();
  const server = http.createServer(app);
  attachRealtime(server);
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

export default app;
