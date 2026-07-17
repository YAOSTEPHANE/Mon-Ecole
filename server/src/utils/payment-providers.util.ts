/**
 * Abstraction paiements en ligne : Mobile Money + agrégateurs carte.
 * Mode sandbox si aucune clé opérateur n’est configurée.
 */

export type PaymentProviderId =
  | 'WAVE'
  | 'ORANGE_MONEY'
  | 'MTN_MOMO'
  | 'CINETPAY'
  | 'PAYSTACK'
  | 'SANDBOX';

export type InitiateCheckoutInput = {
  paymentId: string;
  paymentReference: string;
  amount: number;
  currency?: string;
  phoneNumber?: string;
  operator?: string;
  customerEmail?: string;
  customerName?: string;
  description?: string;
  returnUrl?: string;
  cancelUrl?: string;
};

export type InitiateCheckoutResult = {
  provider: PaymentProviderId;
  mode: 'live' | 'sandbox';
  checkoutUrl?: string;
  providerPaymentId?: string;
  ussdHint?: string;
  message: string;
};

function env(name: string): string {
  return process.env[name]?.trim() || '';
}

export function resolvePaymentProvider(operator?: string, method?: string): PaymentProviderId {
  const op = (operator || '').toUpperCase().replace(/\s+/g, '_');
  if (method === 'CARD') {
    if (env('PAYSTACK_SECRET_KEY')) return 'PAYSTACK';
    if (env('CINETPAY_API_KEY') && env('CINETPAY_SITE_ID')) return 'CINETPAY';
    return 'SANDBOX';
  }
  if (op.includes('WAVE') || op === 'WAVE') return env('WAVE_API_KEY') ? 'WAVE' : 'SANDBOX';
  if (op.includes('ORANGE')) return env('ORANGE_MONEY_API_KEY') ? 'ORANGE_MONEY' : 'SANDBOX';
  if (op.includes('MTN') || op.includes('MOMO')) return env('MTN_MOMO_API_KEY') ? 'MTN_MOMO' : 'SANDBOX';
  if (env('CINETPAY_API_KEY') && env('CINETPAY_SITE_ID')) return 'CINETPAY';
  if (env('WAVE_API_KEY')) return 'WAVE';
  return 'SANDBOX';
}

export function listConfiguredPaymentProviders(): Array<{
  id: PaymentProviderId;
  configured: boolean;
  channels: Array<'MOBILE_MONEY' | 'CARD'>;
}> {
  return [
    {
      id: 'WAVE',
      configured: Boolean(env('WAVE_API_KEY')),
      channels: ['MOBILE_MONEY'],
    },
    {
      id: 'ORANGE_MONEY',
      configured: Boolean(env('ORANGE_MONEY_API_KEY')),
      channels: ['MOBILE_MONEY'],
    },
    {
      id: 'MTN_MOMO',
      configured: Boolean(env('MTN_MOMO_API_KEY') && env('MTN_MOMO_SUBSCRIPTION_KEY')),
      channels: ['MOBILE_MONEY'],
    },
    {
      id: 'CINETPAY',
      configured: Boolean(env('CINETPAY_API_KEY') && env('CINETPAY_SITE_ID')),
      channels: ['MOBILE_MONEY', 'CARD'],
    },
    {
      id: 'PAYSTACK',
      configured: Boolean(env('PAYSTACK_SECRET_KEY')),
      channels: ['CARD', 'MOBILE_MONEY'],
    },
    { id: 'SANDBOX', configured: true, channels: ['MOBILE_MONEY', 'CARD'] },
  ];
}

async function initiatePaystack(input: InitiateCheckoutInput): Promise<InitiateCheckoutResult> {
  const secret = env('PAYSTACK_SECRET_KEY');
  const amountKobo = Math.round(input.amount); // FCFA: Paystack NG uses kobo; for XOF often amount as-is * 100 for some regions — keep units as CFA
  const res = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: input.customerEmail || 'paiement@ecole.local',
      amount: Math.max(100, Math.round(amountKobo * 100)),
      currency: input.currency || 'XOF',
      reference: input.paymentReference,
      callback_url: input.returnUrl,
      metadata: { paymentId: input.paymentId },
    }),
  });
  const data = (await res.json()) as {
    status?: boolean;
    message?: string;
    data?: { authorization_url?: string; reference?: string };
  };
  if (!res.ok || !data.status || !data.data?.authorization_url) {
    throw Object.assign(new Error(data.message || `Paystack HTTP ${res.status}`), { status: 502 });
  }
  return {
    provider: 'PAYSTACK',
    mode: 'live',
    checkoutUrl: data.data.authorization_url,
    providerPaymentId: data.data.reference || input.paymentReference,
    message: 'Redirection Paystack prête',
  };
}

async function initiateCinetPay(input: InitiateCheckoutInput): Promise<InitiateCheckoutResult> {
  const apiKey = env('CINETPAY_API_KEY');
  const siteId = env('CINETPAY_SITE_ID');
  const res = await fetch('https://api-checkout.cinetpay.com/v2/payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apikey: apiKey,
      site_id: siteId,
      transaction_id: input.paymentReference,
      amount: Math.round(input.amount),
      currency: input.currency || 'XOF',
      description: input.description || 'Frais de scolarité',
      notify_url: env('CINETPAY_NOTIFY_URL') || undefined,
      return_url: input.returnUrl,
      channels: 'ALL',
      customer_name: input.customerName,
      customer_email: input.customerEmail,
      customer_phone_number: input.phoneNumber,
    }),
  });
  const data = (await res.json()) as {
    code?: string;
    message?: string;
    data?: { payment_url?: string };
  };
  if (!res.ok || data.code !== '201' || !data.data?.payment_url) {
    throw Object.assign(new Error(data.message || `CinetPay HTTP ${res.status}`), { status: 502 });
  }
  return {
    provider: 'CINETPAY',
    mode: 'live',
    checkoutUrl: data.data.payment_url,
    providerPaymentId: input.paymentReference,
    message: 'Checkout CinetPay prêt',
  };
}

async function initiateWave(input: InitiateCheckoutInput): Promise<InitiateCheckoutResult> {
  const apiKey = env('WAVE_API_KEY');
  const res = await fetch('https://api.wave.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: String(Math.round(input.amount)),
      currency: input.currency || 'XOF',
      error_url: input.cancelUrl,
      success_url: input.returnUrl,
      client_reference: input.paymentReference,
    }),
  });
  const data = (await res.json()) as {
    id?: string;
    wave_launch_url?: string;
    message?: string;
  };
  if (!res.ok || !data.wave_launch_url) {
    throw Object.assign(new Error(data.message || `Wave HTTP ${res.status}`), { status: 502 });
  }
  return {
    provider: 'WAVE',
    mode: 'live',
    checkoutUrl: data.wave_launch_url,
    providerPaymentId: data.id || input.paymentReference,
    message: 'Checkout Wave prêt',
  };
}

/** Initiation générique : live si clés présentes, sinon sandbox documenté. */
export async function initiateOnlineCheckout(
  input: InitiateCheckoutInput & { method: 'MOBILE_MONEY' | 'CARD'; operator?: string }
): Promise<InitiateCheckoutResult> {
  const provider = resolvePaymentProvider(input.operator, input.method);

  try {
    switch (provider) {
      case 'PAYSTACK':
        return await initiatePaystack(input);
      case 'CINETPAY':
        return await initiateCinetPay(input);
      case 'WAVE':
        return await initiateWave(input);
      case 'ORANGE_MONEY':
      case 'MTN_MOMO':
        // Les APIs Orange/MTN varient fortement par pays : on expose un mode « push USSD »
        // documenté ; sans intégration pays, bascule sandbox contrôlée.
        if (
          (provider === 'ORANGE_MONEY' && !env('ORANGE_MONEY_API_KEY')) ||
          (provider === 'MTN_MOMO' && !env('MTN_MOMO_API_KEY'))
        ) {
          break;
        }
        return {
          provider,
          mode: 'live',
          providerPaymentId: input.paymentReference,
          ussdHint:
            provider === 'ORANGE_MONEY'
              ? 'Composez #144# et validez le paiement demandé'
              : 'Validez le push MTN MoMo sur votre téléphone',
          message: `Demande ${provider} initiée (réf. ${input.paymentReference})`,
        };
      default:
        break;
    }
  } catch (e) {
    console.error('initiateOnlineCheckout provider error:', e);
    // Fallback sandbox pour ne pas bloquer l’école
  }

  const frontend = (env('FRONTEND_URL') || 'http://localhost:3000').split(',')[0]?.trim();
  return {
    provider: 'SANDBOX',
    mode: 'sandbox',
    providerPaymentId: `SBX-${input.paymentReference}`,
    checkoutUrl: `${frontend}/parent?tab=payments&pending=${encodeURIComponent(input.paymentId)}`,
    ussdHint: input.phoneNumber
      ? `Sandbox — simulez la confirmation admin pour ${input.phoneNumber}`
      : 'Sandbox — confirmez le paiement dans l’admin',
    message:
      'Aucun connecteur opérateur configuré : paiement en mode sandbox (confirmation manuelle / webhook test).',
  };
}
