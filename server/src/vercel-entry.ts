/**
 * Entrée Express minimale pour Vercel (sans Socket.IO / jobs locaux).
 * Bundlée en vercel-api.cjs pour embarquer dotenv et les deps JS.
 */
import express from 'express';
import dotenv from 'dotenv';
import { ensureJwtConfiguration } from './utils/jwt.util';
import { useBlobStorage } from './utils/blob-storage.util';
import { createApp } from './app/createApp';
import {
  logDatabaseUrlDiagnostics,
  logProductionEnvDiagnostics,
} from './utils/production-env-diagnostics.util';
import { requireSensitiveFieldEncryptionKey } from './utils/field-encryption.util';
import { refreshIntegrationSettingsCache } from './utils/integration-settings.util';

// Référence pour la détection @vercel/express
void express;

dotenv.config();

try {
  ensureJwtConfiguration();
} catch (e) {
  console.error(e);
}

try {
  requireSensitiveFieldEncryptionKey();
} catch (e) {
  console.error(e);
}

logDatabaseUrlDiagnostics();
logProductionEnvDiagnostics();

void refreshIntegrationSettingsCache().catch((e) => {
  console.warn('[integrations] Cache non chargé au démarrage:', e);
});

if (!useBlobStorage()) {
  console.error(
    '[Uploads] BLOB_READ_WRITE_TOKEN manquant — les fichiers uploadés ne seront pas conservés après un redéploiement.',
  );
}

export default createApp();
