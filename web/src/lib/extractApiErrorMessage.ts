function stringifyApiErrorValue(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  if (!value || typeof value !== 'object') {
    return null;
  }
  const row = value as Record<string, unknown>;
  if (typeof row.message === 'string' && row.message.trim()) {
    return row.message.trim();
  }
  if (typeof row.code === 'string' && row.code.trim()) {
    return row.code.trim();
  }
  return null;
}

/** Extrait un message lisible depuis une réponse d’erreur API (axios). */
export function extractApiErrorMessage(
  err: unknown,
  fallback = 'Une erreur est survenue. Réessayez plus tard.'
): string {
  const response = (err as { response?: { data?: unknown; status?: number } })?.response;
  const data = response?.data;
  if (!data || typeof data !== 'object') {
    const msg = (err as Error)?.message;
    if (msg && /network|refused|failed/i.test(msg)) {
      return 'Serveur indisponible. Vérifiez votre connexion ou réessayez dans un instant.';
    }
    if (response?.status === 503) {
      return 'Service temporairement indisponible. Réessayez dans quelques instants.';
    }
    return fallback;
  }

  const record = data as Record<string, unknown>;
  const errorField = stringifyApiErrorValue(record.error);
  if (errorField) {
    return errorField;
  }
  const messageField = stringifyApiErrorValue(record.message);
  if (messageField) {
    return messageField;
  }

  const errors = record.errors;
  if (Array.isArray(errors) && errors.length > 0) {
    const parts = errors
      .map((e) => {
        if (!e || typeof e !== 'object') return null;
        const row = e as { msg?: string; message?: string };
        return row.msg || row.message || null;
      })
      .filter((s): s is string => Boolean(s));
    if (parts.length > 0) return parts.join(' · ');
  }

  return fallback;
}
