import type { PrismaClient } from '@prisma/client';
import prisma from './prisma';
import { decryptSensitiveString, encryptSensitiveString } from './field-encryption.util';

export const PLATFORM_INTEGRATIONS_ID = 'default';

/** Forme du document singleton (évite de dépendre d’un client Prisma régénéré). */
type PlatformIntegrationsRow = {
  id: string;
  menaPresenceWebhookSecret: string | null;
  menaPresenceWatchDir: string | null;
  menaPresenceImportEnabled: boolean;
  menaPresenceCron: string | null;
  menaPresenceDbUrl: string | null;
  menaPresenceDbQuery: string | null;
  nfcApiKey: string | null;
  paymentWebhookSecret: string | null;
  waveApiKey: string | null;
  orangeMoneyApiKey: string | null;
  mtnMomoApiKey: string | null;
  mtnMomoSubscriptionKey: string | null;
  cinetpayApiKey: string | null;
  cinetpaySiteId: string | null;
  paystackSecretKey: string | null;
  whatsappToken: string | null;
  whatsappPhoneNumberId: string | null;
  whatsappDefaultCountryCode: string | null;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpSecure: boolean | null;
  smtpUser: string | null;
  smtpPass: string | null;
  emailFrom: string | null;
  updatedAt?: Date;
};

/** Accès au modèle même si le client Prisma n’a pas encore été régénéré après db push. */
function platformIntegrationsDelegate() {
  const client = prisma as PrismaClient & {
    platformIntegrations: {
      findUnique: (args: {
        where: { id: string };
      }) => Promise<PlatformIntegrationsRow | null>;
      upsert: (args: {
        where: { id: string };
        create: { id: string } & Record<string, unknown>;
        update: Record<string, unknown>;
      }) => Promise<PlatformIntegrationsRow>;
    };
  };
  if (!client.platformIntegrations) {
    throw new Error(
      'Modèle PlatformIntegrations indisponible — redémarrez l’API après `npx prisma generate`.'
    );
  }
  return client.platformIntegrations;
}

/** Marqueur client pour effacer une valeur DB et retomber sur l’env. */
export const CLEAR_INTEGRATION_VALUE = '__CLEAR__';

export type IntegrationSecretField =
  | 'menaPresenceWebhookSecret'
  | 'menaPresenceDbUrl'
  | 'nfcApiKey'
  | 'paymentWebhookSecret'
  | 'waveApiKey'
  | 'orangeMoneyApiKey'
  | 'mtnMomoApiKey'
  | 'mtnMomoSubscriptionKey'
  | 'cinetpayApiKey'
  | 'paystackSecretKey'
  | 'whatsappToken'
  | 'smtpPass';

const SECRET_FIELDS: IntegrationSecretField[] = [
  'menaPresenceWebhookSecret',
  'menaPresenceDbUrl',
  'nfcApiKey',
  'paymentWebhookSecret',
  'waveApiKey',
  'orangeMoneyApiKey',
  'mtnMomoApiKey',
  'mtnMomoSubscriptionKey',
  'cinetpayApiKey',
  'paystackSecretKey',
  'whatsappToken',
  'smtpPass',
];

type DecryptedSnapshot = {
  menaPresenceWebhookSecret: string;
  menaPresenceWatchDir: string;
  menaPresenceImportEnabled: boolean;
  menaPresenceCron: string;
  menaPresenceDbUrl: string;
  menaPresenceDbQuery: string;
  nfcApiKey: string;
  paymentWebhookSecret: string;
  waveApiKey: string;
  orangeMoneyApiKey: string;
  mtnMomoApiKey: string;
  mtnMomoSubscriptionKey: string;
  cinetpayApiKey: string;
  cinetpaySiteId: string;
  paystackSecretKey: string;
  whatsappToken: string;
  whatsappPhoneNumberId: string;
  whatsappDefaultCountryCode: string;
  smtpHost: string;
  smtpPort: number | null;
  smtpSecure: boolean | null;
  smtpUser: string;
  smtpPass: string;
  emailFrom: string;
};

const EMPTY_SNAPSHOT: DecryptedSnapshot = {
  menaPresenceWebhookSecret: '',
  menaPresenceWatchDir: '',
  menaPresenceImportEnabled: false,
  menaPresenceCron: '',
  menaPresenceDbUrl: '',
  menaPresenceDbQuery: '',
  nfcApiKey: '',
  paymentWebhookSecret: '',
  waveApiKey: '',
  orangeMoneyApiKey: '',
  mtnMomoApiKey: '',
  mtnMomoSubscriptionKey: '',
  cinetpayApiKey: '',
  cinetpaySiteId: '',
  paystackSecretKey: '',
  whatsappToken: '',
  whatsappPhoneNumberId: '',
  whatsappDefaultCountryCode: '',
  smtpHost: '',
  smtpPort: null,
  smtpSecure: null,
  smtpUser: '',
  smtpPass: '',
  emailFrom: '',
};

let cache: DecryptedSnapshot = { ...EMPTY_SNAPSHOT };
let cacheLoaded = false;

function decryptField(stored: string | null | undefined): string {
  if (!stored) return '';
  return (decryptSensitiveString(stored) ?? stored).trim();
}

function toSnapshot(row: PlatformIntegrationsRow | null): DecryptedSnapshot {
  if (!row) return { ...EMPTY_SNAPSHOT };
  return {
    menaPresenceWebhookSecret: decryptField(row.menaPresenceWebhookSecret),
    menaPresenceWatchDir: (row.menaPresenceWatchDir ?? '').trim(),
    menaPresenceImportEnabled: Boolean(row.menaPresenceImportEnabled),
    menaPresenceCron: (row.menaPresenceCron ?? '').trim(),
    menaPresenceDbUrl: decryptField(row.menaPresenceDbUrl),
    menaPresenceDbQuery: (row.menaPresenceDbQuery ?? '').trim(),
    nfcApiKey: decryptField(row.nfcApiKey),
    paymentWebhookSecret: decryptField(row.paymentWebhookSecret),
    waveApiKey: decryptField(row.waveApiKey),
    orangeMoneyApiKey: decryptField(row.orangeMoneyApiKey),
    mtnMomoApiKey: decryptField(row.mtnMomoApiKey),
    mtnMomoSubscriptionKey: decryptField(row.mtnMomoSubscriptionKey),
    cinetpayApiKey: decryptField(row.cinetpayApiKey),
    cinetpaySiteId: (row.cinetpaySiteId ?? '').trim(),
    paystackSecretKey: decryptField(row.paystackSecretKey),
    whatsappToken: decryptField(row.whatsappToken),
    whatsappPhoneNumberId: (row.whatsappPhoneNumberId ?? '').trim(),
    whatsappDefaultCountryCode: (row.whatsappDefaultCountryCode ?? '').trim(),
    smtpHost: (row.smtpHost ?? '').trim(),
    smtpPort: row.smtpPort ?? null,
    smtpSecure: row.smtpSecure ?? null,
    smtpUser: (row.smtpUser ?? '').trim(),
    smtpPass: decryptField(row.smtpPass),
    emailFrom: (row.emailFrom ?? '').trim(),
  };
}

export async function refreshIntegrationSettingsCache(): Promise<DecryptedSnapshot> {
  try {
    const row = await platformIntegrationsDelegate().findUnique({
      where: { id: PLATFORM_INTEGRATIONS_ID },
    });
    cache = toSnapshot(row);
    cacheLoaded = true;
  } catch (error) {
    console.warn(
      '[integrations] Impossible de charger PlatformIntegrations — repli env uniquement.',
      error instanceof Error ? error.message : error
    );
    cache = { ...EMPTY_SNAPSHOT };
    cacheLoaded = true;
  }
  return cache;
}

export function getIntegrationSnapshot(): DecryptedSnapshot {
  return cache;
}

export async function ensureIntegrationSettingsCache(): Promise<DecryptedSnapshot> {
  if (!cacheLoaded) {
    return refreshIntegrationSettingsCache();
  }
  return cache;
}

/** Valeur DB non vide, sinon variable d’environnement. */
export function resolveIntegrationValue(dbValue: string | null | undefined, envKey: string): string {
  const fromDb = (dbValue ?? '').trim();
  if (fromDb) return fromDb;
  return (process.env[envKey] ?? '').trim();
}

export function resolveFromCache(
  field: keyof DecryptedSnapshot,
  envKey: string
): string {
  const dbVal = cache[field];
  if (typeof dbVal === 'string' && dbVal.trim()) return dbVal.trim();
  if (typeof dbVal === 'number' && dbVal != null) return String(dbVal);
  return (process.env[envKey] ?? '').trim();
}

export function getMenaPresenceWebhookSecret(): string {
  return resolveFromCache('menaPresenceWebhookSecret', 'MENA_PRESENCE_WEBHOOK_SECRET');
}

export function getMenaPresenceWatchDir(): string {
  return resolveFromCache('menaPresenceWatchDir', 'MENA_PRESENCE_WATCH_DIR');
}

export function getMenaPresenceCron(): string {
  const fromDb = cache.menaPresenceCron.trim();
  if (fromDb) return fromDb;
  return (process.env.MENA_PRESENCE_IMPORT_CRON ?? '').trim() || '15 18 * * *';
}

export function isMenaPresenceImportEnabled(): boolean {
  if (cache.menaPresenceImportEnabled) return true;
  const v = (process.env.ENABLE_SCHEDULED_MENA_PRESENCE_IMPORT ?? '').trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

export function getMenaPresenceDbUrl(): string {
  return resolveFromCache('menaPresenceDbUrl', 'MENA_PRESENCE_DB_URL');
}

export function getMenaPresenceDbQuery(): string {
  return resolveFromCache('menaPresenceDbQuery', 'MENA_PRESENCE_DB_QUERY');
}

export function getNfcApiKeyFromIntegrations(): string {
  return resolveFromCache('nfcApiKey', 'NFC_API_KEY');
}

export function getPaymentWebhookSecret(): string {
  return resolveFromCache('paymentWebhookSecret', 'PAYMENT_WEBHOOK_SECRET');
}

export function getPaymentEnv(name: string): string {
  switch (name) {
    case 'WAVE_API_KEY':
      return resolveFromCache('waveApiKey', 'WAVE_API_KEY');
    case 'ORANGE_MONEY_API_KEY':
      return resolveFromCache('orangeMoneyApiKey', 'ORANGE_MONEY_API_KEY');
    case 'MTN_MOMO_API_KEY':
      return resolveFromCache('mtnMomoApiKey', 'MTN_MOMO_API_KEY');
    case 'MTN_MOMO_SUBSCRIPTION_KEY':
      return resolveFromCache('mtnMomoSubscriptionKey', 'MTN_MOMO_SUBSCRIPTION_KEY');
    case 'CINETPAY_API_KEY':
      return resolveFromCache('cinetpayApiKey', 'CINETPAY_API_KEY');
    case 'CINETPAY_SITE_ID':
      return resolveFromCache('cinetpaySiteId', 'CINETPAY_SITE_ID');
    case 'PAYSTACK_SECRET_KEY':
      return resolveFromCache('paystackSecretKey', 'PAYSTACK_SECRET_KEY');
    case 'WAVE_WEBHOOK_SECRET':
      return (process.env.WAVE_WEBHOOK_SECRET ?? '').trim();
    case 'MTN_MOMO_API_USER':
      return (process.env.MTN_MOMO_API_USER ?? '').trim();
    case 'ORANGE_MONEY_MERCHANT_KEY':
      return (process.env.ORANGE_MONEY_MERCHANT_KEY ?? '').trim();
    case 'ORANGE_MONEY_CLIENT_ID':
      return (process.env.ORANGE_MONEY_CLIENT_ID ?? '').trim();
    case 'ORANGE_MONEY_CLIENT_SECRET':
      return (process.env.ORANGE_MONEY_CLIENT_SECRET ?? '').trim();
    case 'PAYMENT_WEBHOOK_SECRET':
      return getPaymentWebhookSecret();
    default:
      return (process.env[name] ?? '').trim();
  }
}

export function getWhatsAppToken(): string {
  return resolveFromCache('whatsappToken', 'WHATSAPP_TOKEN');
}

export function getWhatsAppPhoneNumberId(): string {
  return resolveFromCache('whatsappPhoneNumberId', 'WHATSAPP_PHONE_NUMBER_ID');
}

export function getWhatsAppDefaultCountryCode(): string {
  return resolveFromCache('whatsappDefaultCountryCode', 'WHATSAPP_DEFAULT_COUNTRY_CODE') || '225';
}

export function getSmtpHost(): string {
  return resolveFromCache('smtpHost', 'SMTP_HOST');
}

export function getSmtpPort(): number {
  if (cache.smtpPort != null && cache.smtpPort > 0) return cache.smtpPort;
  return parseInt(process.env.SMTP_PORT || '587', 10);
}

export function getSmtpSecure(): boolean {
  if (cache.smtpSecure != null) return cache.smtpSecure;
  return process.env.SMTP_SECURE === 'true';
}

export function getSmtpUser(): string {
  return resolveFromCache('smtpUser', 'SMTP_USER');
}

export function getSmtpPass(): string {
  return resolveFromCache('smtpPass', 'SMTP_PASS');
}

export function getEmailFrom(): string {
  return (
    resolveFromCache('emailFrom', 'EMAIL_FROM') ||
    getSmtpUser() ||
    'noreply@localhost'
  );
}

export function isSecretConfigured(field: IntegrationSecretField): boolean {
  const fromDb = (cache[field] as string | undefined)?.trim();
  if (fromDb) return true;
  const envMap: Record<IntegrationSecretField, string> = {
    menaPresenceWebhookSecret: 'MENA_PRESENCE_WEBHOOK_SECRET',
    menaPresenceDbUrl: 'MENA_PRESENCE_DB_URL',
    nfcApiKey: 'NFC_API_KEY',
    paymentWebhookSecret: 'PAYMENT_WEBHOOK_SECRET',
    waveApiKey: 'WAVE_API_KEY',
    orangeMoneyApiKey: 'ORANGE_MONEY_API_KEY',
    mtnMomoApiKey: 'MTN_MOMO_API_KEY',
    mtnMomoSubscriptionKey: 'MTN_MOMO_SUBSCRIPTION_KEY',
    cinetpayApiKey: 'CINETPAY_API_KEY',
    paystackSecretKey: 'PAYSTACK_SECRET_KEY',
    whatsappToken: 'WHATSAPP_TOKEN',
    smtpPass: 'SMTP_PASS',
  };
  return Boolean((process.env[envMap[field]] ?? '').trim());
}

export function isDbOverrideSet(field: keyof DecryptedSnapshot): boolean {
  const v = cache[field];
  if (typeof v === 'boolean') return v === true;
  if (typeof v === 'number') return v != null;
  return Boolean((v as string)?.trim());
}

function encryptIfNeeded(plain: string): string {
  return encryptSensitiveString(plain) ?? plain;
}

export type IntegrationSettingsUpdateInput = {
  menaPresenceWebhookSecret?: string | null;
  menaPresenceWatchDir?: string | null;
  menaPresenceImportEnabled?: boolean;
  menaPresenceCron?: string | null;
  menaPresenceDbUrl?: string | null;
  menaPresenceDbQuery?: string | null;
  nfcApiKey?: string | null;
  paymentWebhookSecret?: string | null;
  waveApiKey?: string | null;
  orangeMoneyApiKey?: string | null;
  mtnMomoApiKey?: string | null;
  mtnMomoSubscriptionKey?: string | null;
  cinetpayApiKey?: string | null;
  cinetpaySiteId?: string | null;
  paystackSecretKey?: string | null;
  whatsappToken?: string | null;
  whatsappPhoneNumberId?: string | null;
  whatsappDefaultCountryCode?: string | null;
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpSecure?: boolean | null;
  smtpUser?: string | null;
  smtpPass?: string | null;
  emailFrom?: string | null;
};

function applySecretUpdate(
  data: Record<string, unknown>,
  field: IntegrationSecretField,
  value: string | null | undefined
): void {
  if (value === undefined) return;
  if (value === null || value === '' || value === CLEAR_INTEGRATION_VALUE) {
    data[field] = null;
    return;
  }
  data[field] = encryptIfNeeded(value.trim());
}

function applyPlainUpdate(
  data: Record<string, unknown>,
  field: string,
  value: string | null | undefined
): void {
  if (value === undefined) return;
  if (value === null || value === '' || value === CLEAR_INTEGRATION_VALUE) {
    data[field] = null;
    return;
  }
  data[field] = value.trim();
}

export async function updatePlatformIntegrations(
  input: IntegrationSettingsUpdateInput
): Promise<PlatformIntegrationsRow> {
  const data: Record<string, unknown> = {};

  for (const field of SECRET_FIELDS) {
    applySecretUpdate(data, field, input[field]);
  }

  applyPlainUpdate(data, 'menaPresenceWatchDir', input.menaPresenceWatchDir);
  applyPlainUpdate(data, 'menaPresenceCron', input.menaPresenceCron);
  applyPlainUpdate(data, 'menaPresenceDbQuery', input.menaPresenceDbQuery);
  applyPlainUpdate(data, 'cinetpaySiteId', input.cinetpaySiteId);
  applyPlainUpdate(data, 'whatsappPhoneNumberId', input.whatsappPhoneNumberId);
  applyPlainUpdate(data, 'whatsappDefaultCountryCode', input.whatsappDefaultCountryCode);
  applyPlainUpdate(data, 'smtpHost', input.smtpHost);
  applyPlainUpdate(data, 'smtpUser', input.smtpUser);
  applyPlainUpdate(data, 'emailFrom', input.emailFrom);

  if (input.menaPresenceImportEnabled !== undefined) {
    data.menaPresenceImportEnabled = Boolean(input.menaPresenceImportEnabled);
  }
  if (input.smtpPort !== undefined) {
    data.smtpPort =
      input.smtpPort === null || Number.isNaN(input.smtpPort) ? null : Number(input.smtpPort);
  }
  if (input.smtpSecure !== undefined) {
    data.smtpSecure = input.smtpSecure;
  }

  const row = await platformIntegrationsDelegate().upsert({
    where: { id: PLATFORM_INTEGRATIONS_ID },
    create: {
      id: PLATFORM_INTEGRATIONS_ID,
      ...data,
    },
    update: data,
  });

  await refreshIntegrationSettingsCache();
  return row;
}

export function buildPublicApiBase(reqHost?: string): string {
  const fromEnv =
    (process.env.API_PUBLIC_URL ?? '').trim() ||
    (process.env.BACKEND_URL ?? '').trim() ||
    (process.env.SERVER_URL ?? '').trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  if (reqHost) return reqHost.replace(/\/$/, '');
  const port = process.env.PORT || '5000';
  return `http://127.0.0.1:${port}`;
}

export function getIntegrationPublicStatus(apiBase: string) {
  return {
    webhooks: {
      menaPresence: `${apiBase}/api/mena-presence/webhook`,
      paymentMobileMoney: `${apiBase}/api/payments/webhooks/mobile-money`,
      paymentWave: `${apiBase}/api/payments/webhooks/wave`,
      paymentCinetpay: `${apiBase}/api/payments/webhooks/cinetpay`,
      paymentPaystack: `${apiBase}/api/payments/webhooks/paystack`,
      paymentMtn: `${apiBase}/api/payments/webhooks/mtn-momo`,
      paymentOrange: `${apiBase}/api/payments/webhooks/orange-money`,
    },
    mena: {
      webhookSecretConfigured: isSecretConfigured('menaPresenceWebhookSecret'),
      webhookSecretFromDb: isDbOverrideSet('menaPresenceWebhookSecret'),
      watchDir: getMenaPresenceWatchDir() || null,
      watchDirFromDb: isDbOverrideSet('menaPresenceWatchDir'),
      importEnabled: isMenaPresenceImportEnabled(),
      importEnabledFromDb: isDbOverrideSet('menaPresenceImportEnabled'),
      cron: getMenaPresenceCron(),
      cronFromDb: isDbOverrideSet('menaPresenceCron'),
      dbUrlConfigured: isSecretConfigured('menaPresenceDbUrl'),
      dbUrlFromDb: isDbOverrideSet('menaPresenceDbUrl'),
      dbQuery: getMenaPresenceDbQuery() || null,
      dbQueryFromDb: isDbOverrideSet('menaPresenceDbQuery'),
    },
    nfc: {
      apiKeyConfigured: isSecretConfigured('nfcApiKey'),
      apiKeyFromDb: isDbOverrideSet('nfcApiKey'),
    },
    payments: {
      webhookSecretConfigured: isSecretConfigured('paymentWebhookSecret'),
      webhookSecretFromDb: isDbOverrideSet('paymentWebhookSecret'),
      waveConfigured: isSecretConfigured('waveApiKey'),
      waveFromDb: isDbOverrideSet('waveApiKey'),
      orangeConfigured: isSecretConfigured('orangeMoneyApiKey'),
      orangeFromDb: isDbOverrideSet('orangeMoneyApiKey'),
      mtnConfigured:
        isSecretConfigured('mtnMomoApiKey') && isSecretConfigured('mtnMomoSubscriptionKey'),
      mtnFromDb: isDbOverrideSet('mtnMomoApiKey'),
      cinetpayConfigured:
        isSecretConfigured('cinetpayApiKey') && Boolean(getPaymentEnv('CINETPAY_SITE_ID')),
      cinetpayFromDb: isDbOverrideSet('cinetpayApiKey'),
      cinetpaySiteId: getPaymentEnv('CINETPAY_SITE_ID') || null,
      paystackConfigured: isSecretConfigured('paystackSecretKey'),
      paystackFromDb: isDbOverrideSet('paystackSecretKey'),
    },
    whatsapp: {
      configured: Boolean(getWhatsAppToken() && getWhatsAppPhoneNumberId()),
      tokenFromDb: isDbOverrideSet('whatsappToken'),
      phoneNumberId: getWhatsAppPhoneNumberId() || null,
      phoneNumberIdFromDb: isDbOverrideSet('whatsappPhoneNumberId'),
      defaultCountryCode: getWhatsAppDefaultCountryCode(),
      defaultCountryCodeFromDb: isDbOverrideSet('whatsappDefaultCountryCode'),
    },
    smtp: {
      configured: Boolean(getSmtpHost() && getSmtpUser() && getSmtpPass()),
      host: getSmtpHost() || null,
      hostFromDb: isDbOverrideSet('smtpHost'),
      port: getSmtpPort(),
      portFromDb: cache.smtpPort != null,
      secure: getSmtpSecure(),
      secureFromDb: cache.smtpSecure != null,
      user: getSmtpUser() || null,
      userFromDb: isDbOverrideSet('smtpUser'),
      passConfigured: isSecretConfigured('smtpPass'),
      passFromDb: isDbOverrideSet('smtpPass'),
      emailFrom: getEmailFrom() || null,
      emailFromFromDb: isDbOverrideSet('emailFrom'),
    },
  };
}
