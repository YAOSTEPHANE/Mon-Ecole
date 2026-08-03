import crypto from 'crypto';
import nodemailer from 'nodemailer';
import {
  getEmailFrom as getConfiguredEmailFrom,
  getSmtpHost,
  getSmtpPass,
  getSmtpPort,
  getSmtpSecure,
  getSmtpUser,
} from './integration-settings.util';
import prisma from './prisma';

/**
 * Génère un token de réinitialisation de mot de passe
 */
export const generateResetToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

/** Hash SHA-256 du token opaque (seul le hash est stocké en base). */
export function hashPasswordResetToken(token: string): string {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
}

/**
 * Crée et sauvegarde un token de réinitialisation dans la base de données
 * @param expiresInHours durée de validité (défaut 1 h pour « mot de passe oublié »)
 */
export const createPasswordResetToken = async (
  userId: string,
  expiresInHours: number = 1
): Promise<string> => {
  // Supprimer les anciens tokens non utilisés pour cet utilisateur
  await prisma.passwordResetToken.deleteMany({
    where: {
      userId,
      used: false,
    },
  });

  // Générer un nouveau token
  const token = generateResetToken();
  const expiresAt = new Date();
  const hours = Number.isFinite(expiresInHours) && expiresInHours > 0 ? expiresInHours : 1;
  expiresAt.setHours(expiresAt.getHours() + hours);

  // Sauvegarder uniquement le hash
  await prisma.passwordResetToken.create({
    data: {
      userId,
      token: hashPasswordResetToken(token),
      expiresAt,
    },
  });

  return token;
};

/**
 * Vérifie si un token de réinitialisation est valide
 */
export const verifyResetToken = async (token: string): Promise<{ valid: boolean; userId?: string }> => {
  const hashed = hashPasswordResetToken(token);
  const resetToken =
    (await prisma.passwordResetToken.findUnique({ where: { token: hashed } })) ||
    // Compatibilité : anciens tokens stockés en clair
    (await prisma.passwordResetToken.findUnique({ where: { token } }));

  if (!resetToken) {
    return { valid: false };
  }

  if (resetToken.used) {
    return { valid: false };
  }

  if (resetToken.expiresAt < new Date()) {
    return { valid: false };
  }

  return { valid: true, userId: resetToken.userId };
};

/**
 * Marque un token comme utilisé (atomique : ne réclame qu’un token encore valide).
 */
export const markTokenAsUsed = async (token: string): Promise<void> => {
  const hashed = hashPasswordResetToken(token);
  const now = new Date();
  const claimed = await prisma.passwordResetToken.updateMany({
    where: {
      OR: [{ token: hashed }, { token }],
      used: false,
      expiresAt: { gt: now },
    },
    data: { used: true },
  });
  if (claimed.count === 0) {
    throw new Error('Token invalide ou déjà utilisé');
  }
};

/**
 * Consomme un token (vérification + marquage atomique) et renvoie le userId.
 */
export const consumePasswordResetToken = async (
  token: string,
): Promise<{ valid: boolean; userId?: string }> => {
  const hashed = hashPasswordResetToken(token);
  const now = new Date();
  const existing =
    (await prisma.passwordResetToken.findFirst({
      where: {
        OR: [{ token: hashed }, { token }],
        used: false,
        expiresAt: { gt: now },
      },
    }));
  if (!existing) return { valid: false };

  const claimed = await prisma.passwordResetToken.updateMany({
    where: { id: existing.id, used: false, expiresAt: { gt: now } },
    data: { used: true },
  });
  if (claimed.count === 0) return { valid: false };
  return { valid: true, userId: existing.userId };
};

function getFrontendBase(): string {
  const raw = process.env.FRONTEND_URL || 'http://localhost:3000';
  return raw.split(',')[0].trim();
}

/** URL du front (première origine CORS) — liens dans e-mails / notifications push */
export function getPublicFrontendBase(): string {
  return getFrontendBase();
}

export function isSmtpConfigured(): boolean {
  const host = getSmtpHost();
  const user = getSmtpUser();
  const pass = getSmtpPass();
  if (!host || !user || !pass) return false;
  if (user === 'your-email@gmail.com' || pass === 'your-password') return false;
  return true;
}

function getEmailFrom(): string {
  return getConfiguredEmailFrom();
}

/**
 * E-mail HTML/text générique (alertes importantes).
 */
export async function sendTransactionalHtmlEmail(
  to: string,
  subject: string,
  text: string,
  html: string
): Promise<{ ok: boolean }> {
  try {
    const transporter = await getTransporter();
    if (transporter) {
      await transporter.sendMail({
        from: getEmailFrom(),
        to,
        subject,
        text,
        html,
      });
      return { ok: true };
    }
    console.log('\n=== E-MAIL TRANSACTIONNEL (SMTP non configuré) ===');
    console.log(`À: ${to}`);
    console.log(`Sujet: ${subject}`);
    console.log(text);
    console.log('========================\n');
    return { ok: true };
  } catch (error) {
    console.error('sendTransactionalHtmlEmail:', error);
    return { ok: false };
  }
}

async function getTransporter(): Promise<nodemailer.Transporter | null> {
  if (!isSmtpConfigured()) return null;
  return nodemailer.createTransport({
    host: getSmtpHost(),
    port: getSmtpPort(),
    secure: getSmtpSecure(),
    auth: {
      user: getSmtpUser(),
      pass: getSmtpPass(),
    },
  });
}

/**
 * Génère le lien de réinitialisation de mot de passe
 */
export const getResetPasswordUrl = (token: string): string => {
  const frontendUrl = getFrontendBase();
  return `${frontendUrl}/reset-password?token=${token}`;
};

/**
 * Envoie un email de réinitialisation de mot de passe (SMTP si configuré, sinon log console).
 */
export const sendPasswordResetEmail = async (email: string, token: string, firstName: string): Promise<void> => {
  const resetUrl = getResetPasswordUrl(token);
  const transporter = await getTransporter();

  if (transporter) {
    await transporter.sendMail({
      from: getEmailFrom(),
      to: email,
      subject: 'Réinitialisation de votre mot de passe',
      text: `Bonjour ${firstName},\n\nPour définir un nouveau mot de passe, ouvrez ce lien :\n${resetUrl}\n\nCe lien expire dans une heure.\n`,
      html: `<p>Bonjour ${firstName},</p><p>Pour définir un nouveau mot de passe, cliquez sur le lien ci-dessous :</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>Ce lien expire dans une heure.</p>`,
    });
    return;
  }

  console.log('\n=== EMAIL DE RÉINITIALISATION DE MOT DE PASSE (SMTP non configuré) ===');
  console.log(`Destinataire: ${email}`);
  console.log(`Nom: ${firstName}`);
  console.log(`Lien de réinitialisation: ${resetUrl}`);
  console.log(`Token: ${token}`);
  console.log('================================================\n');
};

/**
 * E-mail envoyé lorsqu’un compte est créé sans mot de passe : même page que la réinitialisation.
 */
export const sendWelcomeSetPasswordEmail = async (
  email: string,
  token: string,
  firstName: string
): Promise<void> => {
  const resetUrl = getResetPasswordUrl(token);
  const transporter = await getTransporter();
  const subject = 'Votre compte — définissez votre mot de passe';
  const text = `Bonjour ${firstName},\n\nUn compte a été créé pour cette adresse e-mail. Pour choisir votre mot de passe et accéder à l’espace, ouvrez le lien ci-dessous :\n${resetUrl}\n\nCe lien expire dans 48 heures. Si vous n’êtes pas concerné(e), ignorez ce message.\n`;
  const html = `<p>Bonjour ${firstName},</p><p>Un compte a été créé pour cette adresse e-mail. Pour <strong>choisir votre mot de passe</strong> et accéder à l’espace, cliquez sur le lien ci-dessous :</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>Ce lien expire dans <strong>48 heures</strong>. Si vous n’êtes pas concerné(e), ignorez ce message.</p>`;

  if (transporter) {
    await transporter.sendMail({
      from: getEmailFrom(),
      to: email,
      subject,
      text,
      html,
    });
    return;
  }

  console.log('\n=== E-MAIL CRÉATION DE COMPTE — DÉFINIR MOT DE PASSE (SMTP non configuré) ===');
  console.log(`Destinataire: ${email}`);
  console.log(`Nom: ${firstName}`);
  console.log(`Lien: ${resetUrl}`);
  console.log(`Token: ${token}`);
  console.log('================================================\n');
};

/**
 * Envoie un email de message
 */
export const sendMessageEmail = async (
  email: string,
  subject: string,
  content: string,
  senderName: string
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  try {
    const transporter = await getTransporter();
    const subj = subject || 'Message de School Manager';

    if (transporter) {
      const info = await transporter.sendMail({
        from: getEmailFrom(),
        to: email,
        subject: subj,
        text: `${senderName} vous a écrit :\n\n${content}\n`,
        html: `<h2>Message de ${senderName}</h2><p>${content.replace(/\n/g, '<br/>')}</p>`,
      });
      return { success: true, messageId: info.messageId };
    }

    console.log('\n=== EMAIL DE MESSAGE (SMTP non configuré) ===');
    console.log(`Destinataire: ${email}`);
    console.log(`Expéditeur: ${senderName}`);
    console.log(`Sujet: ${subj}`);
    console.log(`Contenu: ${content}`);
    console.log('========================\n');

    const messageId = `email_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    return { success: true, messageId };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur lors de l\'envoi de l\'email';
    console.error('Erreur lors de l\'envoi de l\'email:', error);
    return { success: false, error: message };
  }
};

export type AttendanceEmailPayload = {
  to: string;
  parentFirstName: string;
  studentFullName: string;
  statusLabel: string;
  courseLine: string;
  dateStr: string;
  timeStr: string;
  senderName: string;
  /** Détail optionnel (ex. durée du retard) */
  detailLine?: string;
  punchPhase?: 'CHECK_IN' | 'CHECK_OUT';
};

/**
 * Courriel aux parents lors d’un pointage (présence / absence).
 */
export const sendAttendanceNotificationEmail = async (
  payload: AttendanceEmailPayload
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  try {
    const transporter = await getTransporter();
    const punchWord =
      payload.punchPhase === 'CHECK_OUT'
        ? 'sortie'
        : payload.punchPhase === 'CHECK_IN'
          ? 'entrée'
          : null;
    const subject = punchWord
      ? `Pointage ${punchWord} — ${payload.studentFullName}`
      : `Présence scolaire — ${payload.studentFullName}`;
    const extra = payload.detailLine ? `\n\n${payload.detailLine}` : '';
    const extraHtml = payload.detailLine ? `<p>${payload.detailLine}</p>` : '';
    const actionLine = punchWord
      ? `${payload.studentFullName} a effectué son pointage de ${punchWord} pour le cours « ${payload.courseLine} » le ${payload.dateStr} à ${payload.timeStr} (${payload.statusLabel}).`
      : `${payload.studentFullName} a été enregistré(e) comme « ${payload.statusLabel} » pour le cours « ${payload.courseLine} » le ${payload.dateStr} (${payload.timeStr}).`;
    const text = `Bonjour ${payload.parentFirstName},\n\nNous vous informons que ${actionLine}${extra}\n\nCordialement,\n${payload.senderName}`;
    const html = `<p>Bonjour ${payload.parentFirstName},</p><p>Nous vous informons que ${actionLine}</p>${extraHtml}<p>Cordialement,<br/>${payload.senderName}</p>`;

    if (transporter) {
      const info = await transporter.sendMail({
        from: getEmailFrom(),
        to: payload.to,
        subject,
        text,
        html,
      });
      return { success: true, messageId: info.messageId };
    }

    console.log('\n=== EMAIL PRÉSENCE (SMTP non configuré) ===');
    console.log(`Destinataire: ${payload.to}`);
    console.log(`Sujet: ${subject}`);
    console.log(text);
    console.log('========================\n');

    const messageId = `email_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    return { success: true, messageId };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur lors de l\'envoi de l\'email';
    console.error('Erreur lors de l\'envoi de l\'email de présence:', error);
    return { success: false, error: message };
  }
};

export type TeacherLeaveDecisionPayload = {
  to: string;
  teacherFirstName: string;
  decision: 'APPROVED' | 'REJECTED';
  leaveTypeLabel: string;
  startDateStr: string;
  endDateStr: string;
  adminComment?: string | null;
};

/**
 * Courriel à l’enseignant lorsque la direction approuve ou refuse une demande de congé.
 */
export const sendTeacherLeaveDecisionEmail = async (
  payload: TeacherLeaveDecisionPayload
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  try {
    const transporter = await getTransporter();
    const decided =
      payload.decision === 'APPROVED'
        ? 'acceptée'
        : 'refusée';
    const subject =
      payload.decision === 'APPROVED'
        ? `Demande de congé acceptée — ${payload.leaveTypeLabel}`
        : `Demande de congé refusée — ${payload.leaveTypeLabel}`;
    const lines: string[] = [
      `Bonjour ${payload.teacherFirstName},`,
      '',
      `Votre demande de congé (${payload.leaveTypeLabel}, du ${payload.startDateStr} au ${payload.endDateStr}) a été ${decided} par la direction.`,
    ];
    if (payload.adminComment) {
      lines.push('', 'Message de la direction :', payload.adminComment);
    }
    lines.push('', 'Cordialement,', 'La direction');
    const text = lines.join('\n');
    const html = `<p>Bonjour ${payload.teacherFirstName},</p><p>Votre demande de congé (<strong>${payload.leaveTypeLabel}</strong>, du <strong>${payload.startDateStr}</strong> au <strong>${payload.endDateStr}</strong>) a été <strong>${decided}</strong> par la direction.</p>${
      payload.adminComment
        ? `<p><strong>Message de la direction :</strong><br/>${payload.adminComment.replace(/\n/g, '<br/>')}</p>`
        : ''
    }<p>Cordialement,<br/>La direction</p>`;

    if (transporter) {
      const info = await transporter.sendMail({
        from: getEmailFrom(),
        to: payload.to,
        subject,
        text,
        html,
      });
      return { success: true, messageId: info.messageId };
    }

    console.log('\n=== EMAIL DÉCISION CONGÉ ENSEIGNANT (SMTP non configuré) ===');
    console.log(`Destinataire: ${payload.to}`);
    console.log(`Sujet: ${subject}`);
    console.log(text);
    console.log('========================\n');

    const messageId = `email_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    return { success: true, messageId };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur lors de l\'envoi de l\'email';
    console.error('Erreur email décision congé:', error);
    return { success: false, error: message };
  }
};
