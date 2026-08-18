/**
 * Test SMTP (connexion + envoi optionnel).
 * Usage (depuis server/) :
 *   npx tsx scripts/test-smtp.ts
 *   SMTP_TEST_TO=vous@example.com npx tsx scripts/test-smtp.ts
 */
import 'dotenv/config';
import nodemailer from 'nodemailer';
import { isSmtpConfigured, sendTransactionalHtmlEmail } from '../src/utils/email.util';

async function main() {
  const host = process.env.SMTP_HOST?.trim() ?? '';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true';
  const user = process.env.SMTP_USER?.trim() ?? '';
  const from = process.env.EMAIL_FROM?.trim() || user;
  const testTo = process.env.SMTP_TEST_TO?.trim() || user;

  console.log('=== Test SMTP École à jour ===\n');
  console.log(`NODE_ENV: ${process.env.NODE_ENV ?? '(non défini)'}`);
  console.log(`isSmtpConfigured(): ${isSmtpConfigured()}`);
  console.log(`SMTP_HOST: ${host || '(vide)'}`);
  console.log(`SMTP_PORT: ${port}`);
  console.log(`SMTP_SECURE: ${secure}`);
  console.log(`SMTP_USER: ${user ? `${user.slice(0, 3)}***@${user.split('@')[1] ?? '?'}` : '(vide)'}`);
  console.log(`EMAIL_FROM: ${from}`);
  console.log(`Destinataire test: ${testTo || '(aucun — définir SMTP_TEST_TO ou SMTP_USER)'}\n`);

  if (!isSmtpConfigured()) {
    console.error('ÉCHEC: SMTP non configuré (SMTP_HOST, SMTP_USER, SMTP_PASS requis et valides).');
    process.exit(1);
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass: process.env.SMTP_PASS },
  });

  try {
    await transporter.verify();
    console.log('OK: Connexion SMTP (verify) réussie.\n');
  } catch (err) {
    console.error('ÉCHEC: Connexion SMTP (verify):');
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }

  if (!testTo || !testTo.includes('@')) {
    console.log('Envoi ignoré — précisez SMTP_TEST_TO=email@domaine.com pour tester un e-mail réel.');
    process.exit(0);
  }

  const subject = `[Test SMTP] École à jour — ${new Date().toISOString()}`;
  const text = 'Ceci est un e-mail de test depuis scripts/test-smtp.ts. Si vous le recevez, le SMTP fonctionne.';
  const html = `<p>${text}</p><p><small>${new Date().toLocaleString('fr-FR')}</small></p>`;

  const result = await sendTransactionalHtmlEmail(testTo, subject, text, html);
  if (result.ok) {
    console.log(`OK: E-mail de test envoyé à ${testTo}`);
    process.exit(0);
  } else {
    console.error('ÉCHEC: Envoi e-mail de test.');
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
