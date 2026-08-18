import { authenticator } from '@otplib/preset-default';
import { decryptSensitiveString, encryptSensitiveString } from './field-encryption.util';

authenticator.options = {
  step: 30,
  digits: 6,
  window: 1,
};

function issuer(): string {
  return process.env.TWO_FACTOR_ISSUER?.trim() || 'École à jour';
}

export function generateTwoFactorSecret(email: string): {
  secretPlain: string;
  secretEncrypted: string;
  otpauthUrl: string;
} {
  const secretPlain = authenticator.generateSecret();
  const secretEncrypted = encryptSensitiveString(secretPlain) || secretPlain;
  const otpauthUrl = authenticator.keyuri(email, issuer(), secretPlain);
  return { secretPlain, secretEncrypted, otpauthUrl };
}

export function verifyTwoFactorToken(secretEncrypted: string, token: string): boolean {
  const secretPlain = decryptSensitiveString(secretEncrypted) || secretEncrypted;
  return authenticator.verify({ token: token.trim(), secret: secretPlain });
}
