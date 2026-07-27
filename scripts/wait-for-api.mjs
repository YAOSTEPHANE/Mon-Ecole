/**
 * Attend que l’API réponde avant de lancer Next (évite ECONNREFUSED au démarrage).
 *
 * En dev, NEXT_PUBLIC_API_URL peut valoir `/api` (proxy Next) : ce chemin relatif
 * ne fonctionne pas avec fetch côté Node — on cible alors le backend local directement.
 */
function resolveHealthUrl() {
  const explicit = process.env.API_WAIT_URL?.replace(/\/+$/, '').trim();
  if (explicit) return explicit;

  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '').trim();
  if (apiUrl?.startsWith('http://') || apiUrl?.startsWith('https://')) {
    const base = apiUrl.replace(/\/api$/i, '');
    return `${base}/api/health`;
  }

  const host = process.env.API_WAIT_HOST || '127.0.0.1';
  const port = process.env.PORT || '5000';
  return `http://${host}:${port}/api/health`;
}

const healthUrl = resolveHealthUrl();
const maxAttempts = Number(process.env.API_WAIT_MAX_ATTEMPTS || 120);
const delayMs = Number(process.env.API_WAIT_DELAY_MS || 500);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

for (let attempt = 1; attempt <= maxAttempts; attempt++) {
  try {
    const res = await fetch(healthUrl, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      console.log(`[wait-for-api] API prête (${healthUrl})`);
      process.exit(0);
    }
  } catch {
    /* retry */
  }
  if (attempt === 1) {
    console.log(`[wait-for-api] En attente de l’API sur ${healthUrl}…`);
  }
  await sleep(delayMs);
}

console.error(
  `[wait-for-api] API injoignable après ${maxAttempts} tentatives (${healthUrl}).`,
);
console.error(
  '[wait-for-api] Vérifiez que le backend tourne (npm run dev:server) et que le port est libre.',
);
process.exit(1);
