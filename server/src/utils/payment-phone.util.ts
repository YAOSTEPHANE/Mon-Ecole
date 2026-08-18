import { getWhatsAppDefaultCountryCode } from './integration-settings.util';

/** Indicatif par défaut : Côte d’Ivoire (225). */
export const DEFAULT_PAYMENT_COUNTRY_CODE = '225';

/** Indicatif pays pour Mobile Money (réutilise le réglage Intégrations / WhatsApp). */
export function getPaymentDefaultCountryCode(): string {
  const raw = getWhatsAppDefaultCountryCode().replace(/\D/g, '');
  return raw || DEFAULT_PAYMENT_COUNTRY_CODE;
}

export function isValidMobileMoneyPhone(phoneNumber: string, countryCode?: string): boolean {
  const cc =
    (countryCode ?? getPaymentDefaultCountryCode()).replace(/\D/g, '') ||
    DEFAULT_PAYMENT_COUNTRY_CODE;
  const clean = phoneNumber.replace(/\s/g, '');
  const re = new RegExp(`^(\\+${cc})?\\d{8,10}$`);
  return re.test(clean);
}

export function mobileMoneyPhoneFormatHint(countryCode?: string): string {
  const cc =
    (countryCode ?? getPaymentDefaultCountryCode()).replace(/\D/g, '') ||
    DEFAULT_PAYMENT_COUNTRY_CODE;
  return `+${cc} suivi de 8 à 10 chiffres, ou le numéro local seul`;
}

/** MSISDN international sans « + » (ex. 2250700000000) pour APIs Wave / MTN / CinetPay. */
export function toMsisdn(phoneNumber: string | undefined, countryCode?: string): string {
  const cc =
    (countryCode ?? getPaymentDefaultCountryCode()).replace(/\D/g, '') ||
    DEFAULT_PAYMENT_COUNTRY_CODE;
  const digits = (phoneNumber || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('00')) return digits.slice(2);
  if (digits.startsWith(cc)) return digits;
  if (digits.startsWith('0')) return `${cc}${digits.slice(1)}`;
  if (digits.length <= 10) return `${cc}${digits}`;
  return digits;
}
