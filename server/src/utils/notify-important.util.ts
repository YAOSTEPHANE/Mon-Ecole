import prisma from './prisma';
import { sendTransactionalHtmlEmail, getPublicFrontendBase } from './email.util';
import { sendWebPushToUsers } from './push-send.util';
import { isSyntheticStudentEmail } from './student-login-identifier.util';
import { notifyParentWhatsApp } from './whatsapp.util';

export type ImportantEmailTemplate = {
  subject: string;
  text: string;
  html: string;
};

export type NotifyImportantOptions = {
  type: string;
  title: string;
  content: string;
  /** Lien relatif (ex. /student). Si absent, déduit du rôle utilisateur. */
  link?: string | null;
  /**
   * E-mails : `undefined` = message générique pour chaque destinataire ;
   * objet = même modèle envoyé à tous ;
   * `null` = aucun e-mail (ex. congé : modèle déjà envoyé à part).
   */
  email?: ImportantEmailTemplate | null;
};

function isDeliverableEmail(email: string | null | undefined): boolean {
  if (!email?.trim()) return false;
  const e = email.trim().toLowerCase();
  if (isSyntheticStudentEmail(e)) return false;
  if (e.endsWith('.local')) return false;
  return e.includes('@');
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildBulletinEmail(params: {
  firstName: string;
  studentName: string;
  periodLabel: string;
  academicYear: string;
  linkPath: string;
}): ImportantEmailTemplate {
  const base = getPublicFrontendBase().replace(/\/+$/, '');
  const url = `${base}${params.linkPath.startsWith('/') ? params.linkPath : `/${params.linkPath}`}`;
  const subject = `Bulletin ${params.periodLabel} — ${params.studentName}`;
  const text = `Bonjour ${params.firstName},\n\nLe bulletin de ${params.studentName} pour ${params.periodLabel} (${params.academicYear}) est maintenant disponible.\n\nConsulter le bulletin : ${url}\n\nCordialement,\nL’établissement`;
  const html = `<p>Bonjour ${escapeHtml(params.firstName)},</p>
<p>Le bulletin de <strong>${escapeHtml(params.studentName)}</strong> pour <strong>${escapeHtml(params.periodLabel)}</strong> (${escapeHtml(params.academicYear)}) est maintenant disponible.</p>
<p><a href="${escapeHtml(url)}" style="display:inline-block;padding:10px 16px;background:#0018A8;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">Voir le bulletin</a></p>
<p style="color:#78716c;font-size:13px">Ou ouvrez votre espace parent / élève sur Mon Ecole.</p>`;
  return { subject, text, html };
}

async function resolveDashboardLinkForUser(userId: string): Promise<string> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  switch (u?.role) {
    case 'STUDENT':
      return '/student?tab=report-cards';
    case 'PARENT':
      return '/parent?tab=report-cards';
    case 'TEACHER':
      return '/teacher';
    case 'EDUCATOR':
      return '/educator';
    case 'STAFF':
      return '/staff';
    case 'ADMIN':
      return '/admin';
    default:
      return '/';
  }
}

function buildGenericEmail(
  firstName: string,
  title: string,
  content: string,
  linkPath: string,
): ImportantEmailTemplate {
  const base = getPublicFrontendBase().replace(/\/+$/, '');
  const url = `${base}${linkPath.startsWith('/') ? linkPath : `/${linkPath}`}`;
  const subject = `${title} — Gestion Scolaire`;
  const text = `Bonjour ${firstName},\n\n${title}\n\n${content}\n\nConsulter : ${url}\n`;
  const html = `<p>Bonjour ${escapeHtml(firstName)},</p><p><strong>${escapeHtml(title)}</strong></p><p>${escapeHtml(content).replace(/\n/g, '<br/>')}</p><p><a href="${url}">Ouvrir l’application</a></p>`;
  return { subject, text, html };
}

/**
 * Après publication des bulletins : in-app + push + e-mail Gmail (parents / élèves avec vraie adresse).
 */
export async function notifyBulletinsPublished(
  rows: { studentId: string }[],
  periodLabel: string,
  academicYear: string,
): Promise<void> {
  for (const row of rows) {
    const student = await prisma.student.findUnique({
      where: { id: row.studentId },
      select: {
        userId: true,
        user: { select: { firstName: true, lastName: true, email: true } },
        parents: {
          include: {
            parent: {
              select: {
                userId: true,
                notifyEmail: true,
                notifyWhatsApp: true,
                user: { select: { firstName: true, email: true, phone: true } },
              },
            },
          },
        },
      },
    });
    if (!student) continue;

    const studentName = `${student.user.firstName} ${student.user.lastName}`.trim();
    const title = 'Bulletin publié';
    const content = `Le bulletin ${periodLabel} (${academicYear}) de ${studentName} est disponible.`;

    await notifyUsersImportant([student.userId], {
      type: 'bulletin',
      title,
      content: `Votre bulletin ${periodLabel} (${academicYear}) est disponible.`,
      link: '/student?tab=report-cards',
      email: isDeliverableEmail(student.user.email)
        ? buildBulletinEmail({
            firstName: student.user.firstName,
            studentName,
            periodLabel,
            academicYear,
            linkPath: '/student?tab=report-cards',
          })
        : null,
    });

    for (const link of student.parents) {
      const parent = link.parent;
      const parentLink = '/parent?tab=report-cards';
      const canEmail = parent.notifyEmail !== false && isDeliverableEmail(parent.user.email);

      await notifyUsersImportant([parent.userId], {
        type: 'bulletin',
        title,
        content,
        link: parentLink,
        email: canEmail
          ? buildBulletinEmail({
              firstName: parent.user.firstName,
              studentName,
              periodLabel,
              academicYear,
              linkPath: parentLink,
            })
          : null,
      });

      if (parent.notifyWhatsApp !== false && parent.user.phone?.trim()) {
        void notifyParentWhatsApp(parent.user.phone, title, content).catch((e) =>
          console.error('whatsapp bulletin:', e),
        );
      }
    }
  }
}

/**
 * Notifications in-app + e-mail + Web Push pour les destinataires indiqués.
 * Les erreurs réseau sont journalisées sans faire échouer l’appelant.
 */
export async function notifyUsersImportant(
  userIds: string[],
  options: NotifyImportantOptions,
): Promise<void> {
  const unique = [...new Set(userIds)].filter(Boolean);
  if (unique.length === 0) return;

  const baseUrl = getPublicFrontendBase().replace(/\/+$/, '');

  for (const uid of unique) {
    const linkPath =
      options.link !== undefined && options.link !== null
        ? options.link
        : await resolveDashboardLinkForUser(uid);

    await prisma.notification.create({
      data: {
        userId: uid,
        type: options.type,
        title: options.title,
        content: options.content,
        link: linkPath || null,
      },
    });

    try {
      const { emitNotificationToUser } = await import('./realtime.util');
      emitNotificationToUser(uid, {
        type: options.type,
        title: options.title,
        content: options.content,
        link: linkPath || null,
        createdAt: new Date().toISOString(),
      });
    } catch {
      /* realtime optionnel */
    }

    const fullUrl = `${baseUrl}${linkPath.startsWith('/') ? linkPath : `/${linkPath}`}`;

    if (options.email !== null) {
      const user = await prisma.user.findUnique({
        where: { id: uid },
        select: { email: true, firstName: true },
      });
      if (user?.email && isDeliverableEmail(user.email)) {
        const tpl =
          options.email === undefined
            ? buildGenericEmail(user.firstName, options.title, options.content, linkPath)
            : options.email;
        await sendTransactionalHtmlEmail(user.email, tpl.subject, tpl.text, tpl.html);
      }
    }

    await sendWebPushToUsers([uid], {
      title: options.title,
      body: options.content,
      url: fullUrl,
    });
  }
}
