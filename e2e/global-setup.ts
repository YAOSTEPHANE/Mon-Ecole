import fs from 'node:fs';
import path from 'node:path';
import { config as loadEnv } from 'dotenv';

const ROOT = path.resolve(__dirname, '..');
const FLAG_PATH = path.join(__dirname, '.e2e-ready.json');

function databaseLooksSafeForE2e(url: string): boolean {
  if (!url) return false;
  if (/prod|production/i.test(url) && process.env.E2E_ALLOW_PRODUCTION_DB !== '1') {
    return false;
  }
  return (
    /_test\b|\/test\b|test_|e2e|localhost|127\.0\.0\.1/i.test(url) ||
    process.env.E2E_ALLOW_NONLOCAL_DB === '1'
  );
}

export default async function globalSetup(): Promise<void> {
  loadEnv({ path: path.join(ROOT, 'server/.env') });

  const dbUrl = process.env.DATABASE_URL || '';
  const ready = Boolean(dbUrl) && databaseLooksSafeForE2e(dbUrl);
  let reason = '';
  if (!dbUrl) {
    reason =
      'DATABASE_URL manquant — copiez server/.env.example vers server/.env et configurez MongoDB.';
  } else if (!databaseLooksSafeForE2e(dbUrl)) {
    reason =
      'DATABASE_URL ne ressemble pas à une base de test (attendu: _test / localhost). Définissez E2E_ALLOW_NONLOCAL_DB=1 uniquement en connaissance de cause.';
  }

  fs.writeFileSync(FLAG_PATH, JSON.stringify({ ready, reason }), 'utf8');

  if (!ready) {
    console.warn(`\n[E2E] Prérequis non satisfaits — les tests seront ignorés.\n→ ${reason}\n`);
  }
}
