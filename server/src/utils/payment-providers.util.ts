/**
 * Connecteurs Mobile Money / carte en production.
 * Wave, MTN MoMo, Orange Money (CI), CinetPay (Moov + repli agrégateur), Paystack.
 * Sandbox uniquement si aucun opérateur n’est configuré.
 */

import { randomUUID } from 'node:crypto';
import { buildPublicApiBase, getPaymentEnv } from './integration-settings.util';
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

function cinetpayReady(): boolean {
  return Boolean(env('CINETPAY_API_KEY') && env('CINETPAY_SITE_ID'));
}

function waveReady(): boolean {
  return Boolean(env('WAVE_API_KEY'));
}

function paystackReady(): boolean {
  return Boolean(env('PAYSTACK_SECRET_KEY'));
}

function mtnReady(): boolean {
  return Boolean(
    env('MTN_MOMO_API_KEY') && env('MTN_MOMO_SUBSCRIPTION_KEY') && env('MTN_MOMO_API_USER')
  );
}

function orangeReady(): boolean {
  const merchant = env('ORANGE_MONEY_MERCHANT_KEY') || env('ORANGE_MONEY_API_KEY');
  return Boolean(merchant && env('ORANGE_MONEY_CLIENT_ID') && env('ORANGE_MONEY_CLIENT_SECRET'));
}

export function paymentsWebhookPublicUrl(provider: string): string {
  const explicit = env('CINETPAY_NOTIFY_URL');
  if (provider === 'cinetpay' && explicit) return explicit;
  const base = buildPublicApiBase().replace(/\/$/, '');
  return `${base}/api/payments/webhooks/${provider}`;
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
    { id: 'ORANGE_MONEY', configured: orangeReady() || cinetpayReady(), channels: ['MOBILE_MONEY'] },
    { id: 'MTN_MOMO', configured: mtnReady() || cinetpayReady(), channels: ['MOBILE_MONEY'] },
    {
      id: 'CINETPAY',
      configured: cinetpayReady(),
      channels: ['MOBILE_MONEY', 'CARD'],
    },
    { id: 'PAYSTACK', configured: paystackReady(), channels: ['CARD', 'MOBILE_MONEY'] },
    { id: 'SANDBOX', configured: true, channels: ['MOBILE_MONEY', 'CARD'] },
  ];
}

async function readJson(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function jsonError(data: Record<string, unknown>, fallback: string): string {
  const msg = data.message ?? data.error ?? data.Message;
  return typeof msg === 'string' && msg.trim() ? msg : fallback;
}

async function initiatePaystack(input: InitiateCheckoutInput): Promise<InitiateCheckoutResult> {
  const secret = env('PAYSTACK_SECRET_KEY');
  const res = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: input.customerEmail || 'paiement@ecole.local',
      amount: Math.max(100, Math.round(input.amount * 100)),
      currency: input.currency || 'XOF',
      reference: input.paymentReference,
      callback_url: input.returnUrl,
      metadata: { paymentId: input.paymentId },
    }),
  });
  const data = await readJson(res);
  const inner = (data.data && typeof data.data === 'object' ? data.data : {}) as {
    authorization_url?: string;
    reference?: string;
  };
  if (!res.ok || data.status !== true || !inner.authorization_url) {
    throw Object.assign(new Error(jsonError(data, `Paystack HTTP ${res.status}`)), { status: 502 });
  }
  return {
    provider: 'PAYSTACK',
    mode: 'live',
    checkoutUrl: inner.authorization_url,
    providerPaymentId: inner.reference || input.paymentReference,
    message: 'Redirection Paystack prête',
  };
}

function cinetpayChannel(operator?: string): string {
  const op = (operator || '').toUpperCase();
  if (op.includes('WAVE') || op.includes('ORANGE') || op.includes('MTN') || op.includes('MOOV') || op.includes('MOMO')) {
    return 'MOBILE_MONEY';
  }
  return 'ALL';
}

async function initiateCinetPay(input: InitiateCheckoutInput): Promise<InitiateCheckoutResult> {
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
      description: (input.description || 'Frais de scolarité').slice(0, 100),
      notify_url: paymentsWebhookPublicUrl('cinetpay'),
      return_url: input.returnUrl,
      channels: cinetpayChannel(input.operator),
      lang: 'fr',
      metadata: input.paymentId,
      customer_name: input.customerName || 'Famille',
      customer_surname: 'École',
      customer_email: input.customerEmail || undefined,
      customer_phone_number: msisdn || input.phoneNumber,
      lock_phone_number: Boolean(msisdn),
    }),
  });
  const data = await readJson(res);
  const inner = (data.data && typeof data.data === 'object' ? data.data : {}) as {
    payment_url?: string;
  };
  if (!res.ok || String(data.code) !== '201' || !inner.payment_url) {
    throw Object.assign(new Error(jsonError(data, `CinetPay HTTP ${res.status}`)), { status: 502 });
  }
  return {
    provider: 'CINETPAY',
    mode: 'live',
    checkoutUrl: inner.payment_url,
    providerPaymentId: input.paymentReference,
    message: 'Checkout CinetPay prêt — validez sur votre téléphone',
  };
}

export async function checkCinetPayTransaction(transactionId: string): Promise<'SUCCESS' | 'FAILED' | 'PENDING'> {
  const res = await fetch('https://api-checkout.cinetpay.com/v2/payment/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apikey: env('CINETPAY_API_KEY'),
      site_id: env('CINETPAY_SITE_ID'),
      transaction_id: transactionId,
    }),
  });
  const data = await readJson(res);
  const inner = (data.data && typeof data.data === 'object' ? data.data : {}) as {
    status?: string;
  };
  const status = String(inner.status || data.code || '').toUpperCase();
  if (status === 'ACCEPTED' || status === '00' || String(data.code) === '00') return 'SUCCESS';
  if (status === 'REFUSED' || status === 'CANCELLED' || status === 'EXPIRED') return 'FAILED';
  return 'PENDING';
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
  if (msisdn) body.restrict_payer_mobile = msisdn;
  const res = await fetch('https://api.wave.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await readJson(res);
  const launchUrl = typeof data.wave_launch_url === 'string' ? data.wave_launch_url : '';
  if (!res.ok || !launchUrl) {
    throw Object.assign(new Error(jsonError(data, `Wave HTTP ${res.status}`)), { status: 502 });
  }
  return {
    provider: 'WAVE',
    mode: 'live',
    checkoutUrl: launchUrl,
    providerPaymentId: typeof data.id === 'string' ? data.id : input.paymentReference,
    message: 'Checkout Wave prêt',
  };
}

function mtnBaseUrl(): string {
  const explicit = env('MTN_MOMO_BASE_URL');
  if (explicit) return explicit.replace(/\/$/, '');
  const target = (env('MTN_MOMO_TARGET_ENV') || 'mtnivorycoast').toLowerCase();
  if (target === 'sandbox' || target.includes('sandbox')) {
    return 'https://sandbox.momodeveloper.mtn.com';
  }
  return 'https://proxy.momoapi.mtn.com';
}

async function mtnCollectionToken(): Promise<string> {
  const user = env('MTN_MOMO_API_USER');
  const key = env('MTN_MOMO_API_KEY');
  const sub = env('MTN_MOMO_SUBSCRIPTION_KEY');
  const basic = Buffer.from(`${user}:${key}`).toString('base64');
  const res = await fetch(`${mtnBaseUrl()}/collection/token/`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Ocp-Apim-Subscription-Key': sub,
    },
  });
  const data = await readJson(res);
  const token = typeof data.access_token === 'string' ? data.access_token : '';
  if (!res.ok || !token) {
    throw Object.assign(new Error(jsonError(data, `MTN token HTTP ${res.status}`)), { status: 502 });
  }
  return token;
}

async function initiateMtnMomo(input: InitiateCheckoutInput): Promise<InitiateCheckoutResult> {
  const msisdn = toMsisdn(input.phoneNumber);
  if (!msisdn) {
    throw Object.assign(new Error('Numéro MTN MoMo requis'), { status: 400 });
  }
  const token = await mtnCollectionToken();
  const referenceId = randomUUID();
  const target = env('MTN_MOMO_TARGET_ENV') || 'mtnivorycoast';
  const res = await fetch(`${mtnBaseUrl()}/collection/v1_0/requesttopay`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Reference-Id': referenceId,
      'X-Target-Environment': target,
      'Ocp-Apim-Subscription-Key': env('MTN_MOMO_SUBSCRIPTION_KEY'),
      'X-Callback-Url': paymentsWebhookPublicUrl('mtn-momo'),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: String(Math.round(input.amount)),
      currency: input.currency || 'XOF',
      externalId: input.paymentReference,
      payer: { partyIdType: 'MSISDN', partyId: msisdn },
      payerMessage: (input.description || 'Frais de scolarité').slice(0, 160),
      payeeNote: input.paymentId,
    }),
  });
  if (res.status !== 202 && !res.ok) {
    const data = await readJson(res);
    throw Object.assign(new Error(jsonError(data, `MTN requestToPay HTTP ${res.status}`)), {
      status: 502,
    });
  }
  return {
    provider: 'MTN_MOMO',
    mode: 'live',
    providerPaymentId: referenceId,
    ussdHint: 'Validez la demande MTN MoMo sur votre téléphone (PIN). Le reçu arrivera automatiquement.',
    message: `Demande MTN MoMo envoyée au ${msisdn}`,
  };
}

async function orangeAccessToken(): Promise<string> {
  const id = env('ORANGE_MONEY_CLIENT_ID');
  const secret = env('ORANGE_MONEY_CLIENT_SECRET');
  const authUrl = env('ORANGE_MONEY_AUTH_URL') || 'https://api.orange.com/oauth/v3/token';
  const basic = Buffer.from(`${id}:${secret}`).toString('base64');
  const res = await fetch(authUrl, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: 'grant_type=client_credentials',
  });
  const data = await readJson(res);
  const token = typeof data.access_token === 'string' ? data.access_token : '';
  if (!res.ok || !token) {
    throw Object.assign(new Error(jsonError(data, `Orange OAuth HTTP ${res.status}`)), { status: 502 });
  }
  return token;
}

async function initiateOrangeMoney(input: InitiateCheckoutInput): Promise<InitiateCheckoutResult> {
  const merchant = env('ORANGE_MONEY_MERCHANT_KEY') || env('ORANGE_MONEY_API_KEY');
  const token = await orangeAccessToken();
  const webpayUrl =
    env('ORANGE_MONEY_WEBPAY_URL') || 'https://api.orange.com/orange-money-webpay/ci/v1/webpayment';
  const res = await fetch(webpayUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      merchant_key: merchant,
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
  const data = await readJson(res);
  const paymentUrl =
    (typeof data.payment_url === 'string' && data.payment_url) ||
    (typeof data.pay_token === 'string' ? '' : '');
  const nested = data.data && typeof data.data === 'object' ? (data.data as Record<string, unknown>) : {};
  const url =
    paymentUrl ||
    (typeof nested.payment_url === 'string' ? nested.payment_url : '') ||
    (typeof data.paymentUrl === 'string' ? data.paymentUrl : '');
  if (!res.ok || !url) {
    throw Object.assign(new Error(jsonError(data, `Orange Money HTTP ${res.status}`)), { status: 502 });
  }
  const payToken = typeof data.pay_token === 'string' ? data.pay_token : input.paymentReference;
  return {
    provider: 'ORANGE_MONEY',
    mode: 'live',
    checkoutUrl: url,
    providerPaymentId: payToken,
    message: 'Checkout Orange Money prêt',
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
      : 'Sandbox — confirmez le paiement dans l’admin (Intégrations → clés opérateurs)',
    message:
      'Aucun connecteur opérateur configuré : paiement en mode sandbox (confirmation manuelle).',
  };
}

/** Initiation générique : live si clés présentes, sinon sandbox. */
export async function initiateOnlineCheckout(
  input: InitiateCheckoutInput & { method: 'MOBILE_MONEY' | 'CARD'; operator?: string }
): Promise<InitiateCheckoutResult> {
  const provider = resolvePaymentProvider(input.operator, input.method);

  if (provider === 'SANDBOX') {
    return sandboxResult(input);
  }

  const run = async (id: PaymentProviderId): Promise<InitiateCheckoutResult> => {
    switch (id) {
      case 'PAYSTACK':
        return initiatePaystack(input);
      case 'CINETPAY':
        return initiateCinetPay(input);
      case 'WAVE':
        return initiateWave(input);
      case 'MTN_MOMO':
        return initiateMtnMomo(input);
      case 'ORANGE_MONEY':
        return initiateOrangeMoney(input);
      default:
        return sandboxResult(input);
    }
  };

  try {
    return await run(provider);
  } catch (e) {
    console.error(`initiateOnlineCheckout ${provider}:`, e);
    if (provider !== 'CINETPAY' && cinetpayReady() && input.method === 'MOBILE_MONEY') {
      try {
        return await initiateCinetPay(input);
      } catch (fallbackErr) {
        console.error('initiateOnlineCheckout CinetPay fallback:', fallbackErr);
      }
    }
    throw e;
  }
}
