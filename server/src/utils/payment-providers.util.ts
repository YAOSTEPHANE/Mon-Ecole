/**
 * Abstraction paiements en ligne : Wave, Orange, MTN, CinetPay (Moov + repli), Paystack.
 * Mode sandbox uniquement si aucun connecteur live n’est configuré.
 */

import { randomUUID } from 'node:crypto';
import { getPaymentEnv, buildPublicApiBase } from './integration-settings.util';
import { toMsisdn } from './payment-phone.util';

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
  return getPaymentEnv(name);
}

function waveReady(): boolean {
  return Boolean(env('WAVE_API_KEY'));
}

function cinetpayReady(): boolean {
  return Boolean(env('CINETPAY_API_KEY') && env('CINETPAY_SITE_ID'));
}

function paystackReady(): boolean {
  return Boolean(env('PAYSTACK_SECRET_KEY'));
}

function mtnReady(): boolean {
  return Boolean(
    env('MTN_MOMO_API_USER') && env('MTN_MOMO_API_KEY') && env('MTN_MOMO_SUBSCRIPTION_KEY'),
  );
}

function orangeReady(): boolean {
  return Boolean(
    (env('ORANGE_MONEY_MERCHANT_KEY') || env('ORANGE_MONEY_API_KEY')) &&
      env('ORANGE_MONEY_CLIENT_ID') &&
      env('ORANGE_MONEY_CLIENT_SECRET'),
  );
}

export function paymentsWebhookPublicUrl(slug: string): string {
  const explicit =
    slug === 'cinetpay' ? env('CINETPAY_NOTIFY_URL') : '';
  if (explicit) return explicit;
  return `${buildPublicApiBase()}/api/payments/webhooks/${slug}`;
}

export function resolvePaymentProvider(operator?: string, method?: string): PaymentProviderId {
  const op = (operator || '').toUpperCase().replace(/\s+/g, '_');
  if (method === 'CARD') {
    if (paystackReady()) return 'PAYSTACK';
    if (cinetpayReady()) return 'CINETPAY';
    return 'SANDBOX';
  }
  if (op.includes('WAVE') || op === 'WAVE') {
    if (waveReady()) return 'WAVE';
    if (cinetpayReady()) return 'CINETPAY';
    return 'SANDBOX';
  }
  if (op.includes('MTN') || op.includes('MOMO')) {
    if (mtnReady()) return 'MTN_MOMO';
    if (cinetpayReady()) return 'CINETPAY';
    return 'SANDBOX';
  }
  if (op.includes('ORANGE')) {
    if (orangeReady()) return 'ORANGE_MONEY';
    if (cinetpayReady()) return 'CINETPAY';
    return 'SANDBOX';
  }
  if (op.includes('MOOV')) {
    if (cinetpayReady()) return 'CINETPAY';
    return 'SANDBOX';
  }
  if (cinetpayReady()) return 'CINETPAY';
  if (waveReady()) return 'WAVE';
  return 'SANDBOX';
}

export function listConfiguredPaymentProviders(): Array<{
  id: PaymentProviderId;
  configured: boolean;
  channels: Array<'MOBILE_MONEY' | 'CARD'>;
}> {
  return [
    { id: 'WAVE', configured: waveReady(), channels: ['MOBILE_MONEY'] },
    {
      id: 'ORANGE_MONEY',
      configured: orangeReady() || cinetpayReady(),
      channels: ['MOBILE_MONEY'],
    },
    {
      id: 'MTN_MOMO',
      configured: mtnReady() || cinetpayReady(),
      channels: ['MOBILE_MONEY'],
    },
    {
      id: 'CINETPAY',
      configured: cinetpayReady(),
      channels: ['MOBILE_MONEY', 'CARD'],
    },
    {
      id: 'PAYSTACK',
      configured: paystackReady(),
      channels: ['CARD', 'MOBILE_MONEY'],
    },
    { id: 'SANDBOX', configured: true, channels: ['MOBILE_MONEY', 'CARD'] },
  ];
}

function cinetpayChannels(operator?: string, method?: string): string {
  if (method === 'CARD') return 'CREDIT_CARD';
  const op = (operator || '').toUpperCase();
  if (op.includes('WAVE')) return 'WAVE';
  if (op.includes('ORANGE')) return 'ORANGE';
  if (op.includes('MTN') || op.includes('MOMO')) return 'MOMO';
  if (op.includes('MOOV')) return 'MOOV';
  return 'ALL';
}

async function initiatePaystack(input: InitiateCheckoutInput): Promise<InitiateCheckoutResult> {
  const secret = env('PAYSTACK_SECRET_KEY');
  const amountKobo = Math.round(input.amount);
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

async function initiateCinetPay(
  input: InitiateCheckoutInput & { method?: 'MOBILE_MONEY' | 'CARD' },
): Promise<InitiateCheckoutResult> {
  const apiKey = env('CINETPAY_API_KEY');
  const siteId = env('CINETPAY_SITE_ID');
  const msisdn = toMsisdn(input.phoneNumber);
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
      notify_url: paymentsWebhookPublicUrl('cinetpay'),
      return_url: input.returnUrl,
      channels: cinetpayChannels(input.operator, input.method),
      customer_name: input.customerName,
      customer_email: input.customerEmail,
      customer_phone_number: msisdn || input.phoneNumber,
      lock_phone_number: Boolean(msisdn),
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
    message: 'Checkout CinetPay prêt — confirmez puis le reçu arrive automatiquement',
  };
}

export async function checkCinetPayTransaction(transactionId: string): Promise<{
  code?: string;
  message?: string;
  status?: string;
}> {
  const res = await fetch('https://api-checkout.cinetpay.com/v2/payment/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apikey: env('CINETPAY_API_KEY'),
      site_id: env('CINETPAY_SITE_ID'),
      transaction_id: transactionId,
    }),
  });
  const data = (await res.json()) as {
    code?: string;
    message?: string;
    data?: { status?: string };
  };
  return {
    code: data.code,
    message: data.message,
    status: data.data?.status,
  };
}

async function initiateWave(input: InitiateCheckoutInput): Promise<InitiateCheckoutResult> {
  const apiKey = env('WAVE_API_KEY');
  const msisdn = toMsisdn(input.phoneNumber);
  const body: Record<string, unknown> = {
    amount: String(Math.round(input.amount)),
    currency: input.currency || 'XOF',
    error_url: input.cancelUrl || input.returnUrl,
    success_url: input.returnUrl,
    client_reference: input.paymentReference,
  };
  if (msisdn) body.restrict_payer_mobile = `+${msisdn}`;
  const res = await fetch('https://api.wave.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
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
    message: 'Checkout Wave prêt — confirmez dans l’application',
  };
}

async function mtnCollectionToken(): Promise<string> {
  const base = (env('MTN_MOMO_BASE_URL') || 'https://proxy.momoapi.mtn.com').replace(/\/$/, '');
  const user = env('MTN_MOMO_API_USER');
  const key = env('MTN_MOMO_API_KEY');
  const sub = env('MTN_MOMO_SUBSCRIPTION_KEY');
  const basic = Buffer.from(`${user}:${key}`).toString('base64');
  const res = await fetch(`${base}/collection/token/`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Ocp-Apim-Subscription-Key': sub,
    },
  });
  const data = (await res.json()) as { access_token?: string; message?: string };
  if (!res.ok || !data.access_token) {
    throw Object.assign(new Error(data.message || `MTN token HTTP ${res.status}`), { status: 502 });
  }
  return data.access_token;
}

async function initiateMtn(input: InitiateCheckoutInput): Promise<InitiateCheckoutResult> {
  const msisdn = toMsisdn(input.phoneNumber);
  if (!msisdn) {
    throw Object.assign(new Error('Numéro MSISDN requis pour MTN MoMo'), { status: 400 });
  }
  const base = (env('MTN_MOMO_BASE_URL') || 'https://proxy.momoapi.mtn.com').replace(/\/$/, '');
  const targetEnv = env('MTN_MOMO_TARGET_ENV') || 'mtnivorycoast';
  const sub = env('MTN_MOMO_SUBSCRIPTION_KEY');
  const token = await mtnCollectionToken();
  const referenceId = randomUUID();
  const res = await fetch(`${base}/collection/v1_0/requesttopay`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Reference-Id': referenceId,
      'X-Target-Environment': targetEnv,
      'Ocp-Apim-Subscription-Key': sub,
      'Content-Type': 'application/json',
      'X-Callback-Url': paymentsWebhookPublicUrl('mtn-momo'),
    },
    body: JSON.stringify({
      amount: String(Math.round(input.amount)),
      currency: input.currency || 'XOF',
      externalId: input.paymentReference,
      payer: { partyIdType: 'MSISDN', partyId: msisdn },
      payerMessage: input.description || 'Frais de scolarité',
      payeeNote: input.paymentReference,
    }),
  });
  if (res.status !== 202 && !res.ok) {
    const text = await res.text();
    throw Object.assign(new Error(text || `MTN requesttopay HTTP ${res.status}`), { status: 502 });
  }
  return {
    provider: 'MTN_MOMO',
    mode: 'live',
    providerPaymentId: referenceId,
    ussdHint: 'Validez la demande MTN MoMo sur votre téléphone. Le reçu arrivera automatiquement.',
    message: `Demande MTN MoMo envoyée (réf. ${input.paymentReference})`,
  };
}

async function initiateOrange(input: InitiateCheckoutInput): Promise<InitiateCheckoutResult> {
  const clientId = env('ORANGE_MONEY_CLIENT_ID');
  const clientSecret = env('ORANGE_MONEY_CLIENT_SECRET');
  const merchantKey = env('ORANGE_MONEY_MERCHANT_KEY') || env('ORANGE_MONEY_API_KEY');
  const oauthUrl = env('ORANGE_MONEY_OAUTH_URL') || 'https://api.orange.com/oauth/v3/token';
  const webpayUrl =
    env('ORANGE_MONEY_WEBPAY_URL') || 'https://api.orange.com/orange-money-webpay/ci/v1/webpayment';

  const tokenRes = await fetch(oauthUrl, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const tokenData = (await tokenRes.json()) as { access_token?: string; error_description?: string };
  if (!tokenRes.ok || !tokenData.access_token) {
    throw Object.assign(
      new Error(tokenData.error_description || `Orange OAuth HTTP ${tokenRes.status}`),
      { status: 502 },
    );
  }

  const payRes = await fetch(webpayUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      merchant_key: merchantKey,
      currency: input.currency || 'OUV',
      order_id: input.paymentReference,
      amount: Math.round(input.amount),
      return_url: input.returnUrl,
      cancel_url: input.cancelUrl || input.returnUrl,
      notif_url: paymentsWebhookPublicUrl('orange-money'),
      lang: 'fr',
      reference: input.paymentId,
    }),
  });
  const payData = (await payRes.json()) as {
    payment_url?: string;
    pay_token?: string;
    message?: string;
    status?: number;
  };
  if (!payRes.ok || !payData.payment_url) {
    throw Object.assign(new Error(payData.message || `Orange WebPay HTTP ${payRes.status}`), {
      status: 502,
    });
  }
  return {
    provider: 'ORANGE_MONEY',
    mode: 'live',
    checkoutUrl: payData.payment_url,
    providerPaymentId: payData.pay_token || input.paymentReference,
    message: 'Checkout Orange Money prêt — confirmez puis le reçu arrive automatiquement',
  };
}

function sandboxResult(input: InitiateCheckoutInput): InitiateCheckoutResult {
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

/** Initiation : live si clés présentes ; échec live → repli CinetPay ; sinon erreur (pas de sandbox silencieux). */
export async function initiateOnlineCheckout(
  input: InitiateCheckoutInput & { method: 'MOBILE_MONEY' | 'CARD'; operator?: string },
): Promise<InitiateCheckoutResult> {
  const provider = resolvePaymentProvider(input.operator, input.method);
  if (provider === 'SANDBOX') {
    return sandboxResult(input);
  }

  try {
    switch (provider) {
      case 'PAYSTACK':
        return await initiatePaystack(input);
      case 'CINETPAY':
        return await initiateCinetPay(input);
      case 'WAVE':
        return await initiateWave(input);
      case 'MTN_MOMO':
        return await initiateMtn(input);
      case 'ORANGE_MONEY':
        return await initiateOrange(input);
      default: {
        const _never: never = provider;
        void _never;
        return sandboxResult(input);
      }
    }
  } catch (e) {
    console.error('initiateOnlineCheckout provider error:', e);
    if (provider !== 'CINETPAY' && cinetpayReady() && input.method === 'MOBILE_MONEY') {
      console.error('Repli CinetPay après échec', provider);
      return await initiateCinetPay(input);
    }
    throw e;
  }
}
