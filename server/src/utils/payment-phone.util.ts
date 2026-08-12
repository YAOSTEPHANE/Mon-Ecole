import { getWhatsAppDefaultCountryCode } from './integration-settings.util';

/** Indicatif pays pour Mobile Money (réutilise le réglage Intégrations / WhatsApp). */
export function getPaymentDefaultCountryCode(): string {
  const raw = getWhatsAppDefaultCountryCode().replace(/\D/g, '');
  return raw || '237';
}

export function isValidMobileMoneyPhone(phoneNumber: string, countryCode?: string): boolean {
  const cc = (countryCode ?? getPaymentDefaultCountryCode()).replace(/\D/g, '') || '237';
  const clean = phoneNumber.replace(/\s/g, '');
  const re = new RegExp(`^(\\+${cc})?\\d{8,10}$`);
  return re.test(clean);
}

export function mobileMoneyPhoneFormatHint(countryCode?: string): string {
  const cc = (countryCode ?? getPaymentDefaultCountryCode()).replace(/\D/g, '') || '237';
  return `+${cc} suivi de 8 à 10 chiffres, ou le numéro local seul`;
}
