/** Formate un numéro saisi avec l’indicatif pays configuré (ex. 225 Côte d’Ivoire). */
const FALLBACK_CC = '225';

export function formatMobileMoneyPhoneInput(raw: string, countryCode: string): string {
  const cc = countryCode.replace(/\D/g, '') || FALLBACK_CC;
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith(cc)) {
    return `+${digits}`;
  }
  if (digits.length <= 10) {
    return `+${cc} ${digits}`;
  }
  return digits;
}

export function isValidMobileMoneyPhone(phoneNumber: string, countryCode: string): boolean {
  const cc = countryCode.replace(/\D/g, '') || FALLBACK_CC;
  const clean = phoneNumber.replace(/\s/g, '');
  const re = new RegExp(`^(\\+${cc})?\\d{8,10}$`);
  return re.test(clean);
}

export function mobileMoneyPhonePlaceholder(countryCode: string): string {
  const cc = countryCode.replace(/\D/g, '') || FALLBACK_CC;
  return `+${cc} …`;
}

export function mobileMoneyPhoneHint(countryCode: string): string {
  const cc = countryCode.replace(/\D/g, '') || FALLBACK_CC;
  return `Format: +${cc} … ou numéro local (8–10 chiffres)`;
}
