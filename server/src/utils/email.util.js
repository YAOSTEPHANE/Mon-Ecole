"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendTeacherLeaveDecisionEmail = exports.sendAttendanceNotificationEmail = exports.sendMessageEmail = exports.sendWelcomeSetPasswordEmail = exports.sendPasswordResetEmail = exports.getResetPasswordUrl = exports.markTokenAsUsed = exports.verifyResetToken = exports.createPasswordResetToken = exports.generateResetToken = void 0;
exports.getPublicFrontendBase = getPublicFrontendBase;
exports.isSmtpConfigured = isSmtpConfigured;
exports.sendTransactionalHtmlEmail = sendTransactionalHtmlEmail;
const crypto_1 = __importDefault(require("crypto"));
const nodemailer_1 = __importDefault(require("nodemailer"));
const prisma_1 = __importDefault(require("./prisma"));
/**
 * Génère un token de réinitialisation de mot de passe
 */
const generateResetToken = () => {
    return crypto_1.default.randomBytes(32).toString('hex');
};
exports.generateResetToken = generateResetToken;
/**
 * Crée et sauvegarde un token de réinitialisation dans la base de données
 * @param expiresInHours durée de validité (défaut 1 h pour « mot de passe oublié »)
 */
const createPasswordResetToken = async (userId, expiresInHours = 1) => {
    // Supprimer les anciens tokens non utilisés pour cet utilisateur
    await prisma_1.default.passwordResetToken.deleteMany({
        where: {
            userId,
            used: false,
            expiresAt: {
                lt: new Date(), // Supprimer les tokens expirés
            },
        },
    });
    // Générer un nouveau token
    const token = (0, exports.generateResetToken)();
    const expiresAt = new Date();
    const hours = Number.isFinite(expiresInHours) && expiresInHours > 0 ? expiresInHours : 1;
    expiresAt.setHours(expiresAt.getHours() + hours);
    // Sauvegarder le token
    await prisma_1.default.passwordResetToken.create({
        data: {
            userId,
            token,
            expiresAt,
        },
    });
    return token;
};
exports.createPasswordResetToken = createPasswordResetToken;
/**
 * Vérifie si un token de réinitialisation est valide
 */
const verifyResetToken = async (token) => {
    const resetToken = await prisma_1.default.passwordResetToken.findUnique({
        where: { token },
    });
    if (!resetToken) {
        return { valid: false };
    }
    // Vérifier si le token a été utilisé
    if (resetToken.used) {
        return { valid: false };
    }
    // Vérifier si le token a expiré
    if (resetToken.expiresAt < new Date()) {
        return { valid: false };
    }
    return { valid: true, userId: resetToken.userId };
};
exports.verifyResetToken = verifyResetToken;
/**
 * Marque un token comme utilisé
 */
const markTokenAsUsed = async (token) => {
    await prisma_1.default.passwordResetToken.update({
        where: { token },
        data: { used: true },
    });
};
exports.markTokenAsUsed = markTokenAsUsed;
function getFrontendBase() {
    const raw = process.env.FRONTEND_URL || 'http://localhost:3000';
    return raw.split(',')[0].trim();
}
/** URL du front (première origine CORS) — liens dans e-mails / notifications push */
function getPublicFrontendBase() {
    return getFrontendBase();
}
function isSmtpConfigured() {
    const host = process.env.SMTP_HOST?.trim();
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASS?.trim();
    if (!host || !user || !pass)
        return false;
    if (user === 'your-email@gmail.com' || pass === 'your-password')
        return false;
    return true;
}
function getEmailFrom() {
    return process.env.EMAIL_FROM?.trim() || process.env.SMTP_USER || 'noreply@localhost';
}
/**
 * E-mail HTML/text générique (alertes importantes).
 */
async function sendTransactionalHtmlEmail(to, subject, text, html) {
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
    }
    catch (error) {
        console.error('sendTransactionalHtmlEmail:', error);
        return { ok: false };
    }
}
async function getTransporter() {
    if (!isSmtpConfigured())
        return null;
    return nodemailer_1.default.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
}
/**
 * Génère le lien de réinitialisation de mot de passe
 */
const getResetPasswordUrl = (token) => {
    const frontendUrl = getFrontendBase();
    return `${frontendUrl}/reset-password?token=${token}`;
};
exports.getResetPasswordUrl = getResetPasswordUrl;
/**
 * Envoie un email de réinitialisation de mot de passe (SMTP si configuré, sinon log console).
 */
const sendPasswordResetEmail = async (email, token, firstName) => {
    const resetUrl = (0, exports.getResetPasswordUrl)(token);
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
exports.sendPasswordResetEmail = sendPasswordResetEmail;
/**
 * E-mail envoyé lorsqu’un compte est créé sans mot de passe : même page que la réinitialisation.
 */
const sendWelcomeSetPasswordEmail = async (email, token, firstName) => {
    const resetUrl = (0, exports.getResetPasswordUrl)(token);
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
exports.sendWelcomeSetPasswordEmail = sendWelcomeSetPasswordEmail;
/**
 * Envoie un email de message
 */
const sendMessageEmail = async (email, subject, content, senderName) => {
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
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur lors de l\'envoi de l\'email';
        console.error('Erreur lors de l\'envoi de l\'email:', error);
        return { success: false, error: message };
    }
};
exports.sendMessageEmail = sendMessageEmail;
/**
 * Courriel aux parents lors d’un pointage (présence / absence).
 */
const sendAttendanceNotificationEmail = async (payload) => {
    try {
        const transporter = await getTransporter();
        const punchWord = payload.punchPhase === 'CHECK_OUT'
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
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur lors de l\'envoi de l\'email';
        console.error('Erreur lors de l\'envoi de l\'email de présence:', error);
        return { success: false, error: message };
    }
};
exports.sendAttendanceNotificationEmail = sendAttendanceNotificationEmail;
/**
 * Courriel à l’enseignant lorsque la direction approuve ou refuse une demande de congé.
 */
const sendTeacherLeaveDecisionEmail = async (payload) => {
    try {
        const transporter = await getTransporter();
        const decided = payload.decision === 'APPROVED'
            ? 'acceptée'
            : 'refusée';
        const subject = payload.decision === 'APPROVED'
            ? `Demande de congé acceptée — ${payload.leaveTypeLabel}`
            : `Demande de congé refusée — ${payload.leaveTypeLabel}`;
        const lines = [
            `Bonjour ${payload.teacherFirstName},`,
            '',
            `Votre demande de congé (${payload.leaveTypeLabel}, du ${payload.startDateStr} au ${payload.endDateStr}) a été ${decided} par la direction.`,
        ];
        if (payload.adminComment) {
            lines.push('', 'Message de la direction :', payload.adminComment);
        }
        lines.push('', 'Cordialement,', 'La direction');
        const text = lines.join('\n');
        const html = `<p>Bonjour ${payload.teacherFirstName},</p><p>Votre demande de congé (<strong>${payload.leaveTypeLabel}</strong>, du <strong>${payload.startDateStr}</strong> au <strong>${payload.endDateStr}</strong>) a été <strong>${decided}</strong> par la direction.</p>${payload.adminComment
            ? `<p><strong>Message de la direction :</strong><br/>${payload.adminComment.replace(/\n/g, '<br/>')}</p>`
            : ''}<p>Cordialement,<br/>La direction</p>`;
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
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur lors de l\'envoi de l\'email';
        console.error('Erreur email décision congé:', error);
        return { success: false, error: message };
    }
};
exports.sendTeacherLeaveDecisionEmail = sendTeacherLeaveDecisionEmail;
//# sourceMappingURL=email.util.js.map