import toast from 'react-hot-toast';

export type OnlinePaymentStartResult = {
  payment?: {
    id?: string;
    paymentMethod?: string;
    status?: string;
  };
  checkoutUrl?: string | null;
  provider?: string | null;
  mode?: 'live' | 'sandbox' | null;
  ussdHint?: string | null;
  message?: string;
};

export type PaymentPollSnapshot = {
  status?: string | null;
  receiptUrl?: string | null;
  receiptNumber?: string | null;
};

export function paymentSettlement(
  status?: string | null,
): 'COMPLETED' | 'FAILED' | null {
  const st = String(status || '').toUpperCase();
  if (st === 'COMPLETED' || st === 'PAID' || st === 'SUCCESS') return 'COMPLETED';
  if (st === 'FAILED' || st === 'CANCELLED' || st === 'CANCELED' || st === 'EXPIRED') {
    return 'FAILED';
  }
  return null;
}

export async function pollPaymentUntilSettled(
  fetchPayment: () => Promise<PaymentPollSnapshot>,
  options?: { intervalMs?: number; timeoutMs?: number; signal?: AbortSignal },
): Promise<'COMPLETED' | 'FAILED' | 'TIMEOUT'> {
  const intervalMs = options?.intervalMs ?? 3000;
  const timeoutMs = options?.timeoutMs ?? 120_000;
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    if (options?.signal?.aborted) return 'TIMEOUT';
    try {
      const snap = await fetchPayment();
      const settled = paymentSettlement(snap.status);
      if (settled) return settled;
    } catch {
      // Le webhook peut arriver entre deux essais.
    }
    await new Promise<void>((resolve) => {
      const t = setTimeout(resolve, intervalMs);
      options?.signal?.addEventListener('abort', () => {
        clearTimeout(t);
        resolve();
      });
    });
  }
  return 'TIMEOUT';
}

/** Redirige vers le checkout opérateur, ou indique d’attendre le webhook / reçu. */
export function applyOnlinePaymentStart(
  data: OnlinePaymentStartResult,
  opts: { onWaitForWebhook?: (paymentId: string) => void } = {},
): 'redirect' | 'poll' | 'pending' {
  const checkoutUrl = data.checkoutUrl?.trim();
  if (checkoutUrl) {
    toast.success('Ouverture du paiement sécurisé…');
    window.location.assign(checkoutUrl);
    return 'redirect';
  }
  if (data.mode === 'live' && data.payment?.id) {
    toast.success(
      data.ussdHint ||
        'Validez le paiement sur votre téléphone. Le reçu arrivera automatiquement.',
    );
    opts.onWaitForWebhook?.(data.payment.id);
    return 'poll';
  }
  toast.success(
    data.message ||
      'Paiement enregistré. Confirmation automatique dès validation opérateur (sandbox : économat).',
  );
  return 'pending';
}
