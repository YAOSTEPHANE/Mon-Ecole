/** Formate un numéro saisi avec l’indicatif pays configuré (ex. 237, 227). */
export function formatMobileMoneyPhoneInput(raw: string, countryCode: string): string {
  const cc = countryCode.replace(/\D/g, '') || '237';
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
  const cc = countryCode.replace(/\D/g, '') || '237';
  const clean = phoneNumber.replace(/\s/g, '');
  const re = new RegExp(`^(\\+${cc})?\\d{8,10}$`);
  return re.test(clean);
}

export function mobileMoneyPhonePlaceholder(countryCode: string): string {
  const cc = countryCode.replace(/\D/g, '') || '237';
  return `+${cc} …`;
}

export function mobileMoneyPhoneHint(countryCode: string): string {
  const cc = countryCode.replace(/\D/g, '') || '237';
  return `Format: +${cc} … ou numéro local (8–10 chiffres)`;
}
