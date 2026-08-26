/**
 * Entrée Express minimale pour Vercel (sans dotenv / Socket.IO / jobs).
 */
import express from 'express';
import { ensureJwtConfiguration } from './utils/jwt.util';
import { ensureDeviceApiKeyConfiguration } from './utils/device-api-key.util';
import { useBlobStorage } from './utils/blob-storage.util';
import { createApp } from './app/createApp';
import {
  logDatabaseUrlDiagnostics,
  logProductionEnvDiagnostics,
} from './utils/production-env-diagnostics.util';
import { requireSensitiveFieldEncryptionKey } from './utils/field-encryption.util';

void express;

try {
  ensureJwtConfiguration();
} catch (e) {
  console.error(e);
  throw e;
}

try {
  ensureDeviceApiKeyConfiguration();
} catch (e) {
  console.error(e);
  if (process.env.NODE_ENV === 'production') {
    throw e;
  }
}

try {
  requireSensitiveFieldEncryptionKey();
} catch (e) {
  console.error(e);
}

logDatabaseUrlDiagnostics();
logProductionEnvDiagnostics();

if (!useBlobStorage()) {
  console.error(
    '[Uploads] BLOB_READ_WRITE_TOKEN manquant — les fichiers uploadés ne seront pas conservés après un redéploiement.',
  );
}

const app = createApp();

// Charge le cache intégrations après le boot (ne bloque pas le cold start).
void import('./utils/integration-settings.util')
  .then(({ refreshIntegrationSettingsCache }) => refreshIntegrationSettingsCache())
  .catch((e) => {
    console.warn('[integrations] Cache non chargé au démarrage:', e);
  });

export default app;
