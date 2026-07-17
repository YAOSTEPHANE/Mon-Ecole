/**
 * Observabilité optionnelle (Sentry-compatible).
 * Sans SENTRY_DSN : journal console uniquement.
 * Avec @sentry/node installé + DSN : captureException / captureMessage.
 */

type SentryLike = {
  init: (opts: Record<string, unknown>) => void;
  captureException: (err: unknown, ctx?: Record<string, unknown>) => void;
  captureMessage: (msg: string, level?: string) => void;
};

let sentry: SentryLike | null = null;
let initTried = false;

async function loadSentry(): Promise<SentryLike | null> {
  if (initTried) return sentry;
  initTried = true;
  const dsn = process.env.SENTRY_DSN?.trim();
  if (!dsn) return null;
  try {
    // Dynamic import — le package peut être absent en local
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@sentry/node') as SentryLike;
    mod.init({
      dsn,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.05),
    });
    sentry = mod;
    return sentry;
  } catch {
    console.warn('SENTRY_DSN défini mais @sentry/node non installé — journal console uniquement.');
    return null;
  }
}

export async function initObservability(): Promise<void> {
  await loadSentry();
}

export async function captureException(error: unknown, context?: Record<string, unknown>): Promise<void> {
  const s = await loadSentry();
  if (s) {
    s.captureException(error, context ? { extra: context } : undefined);
    return;
  }
  console.error('[observability]', error, context || '');
}

export async function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): Promise<void> {
  const s = await loadSentry();
  if (s) {
    s.captureMessage(message, level);
    return;
  }
  console.log(`[observability:${level}]`, message);
}
