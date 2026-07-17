import prisma from './prisma';
import { sendTransactionalHtmlEmail, getPublicFrontendBase } from './email.util';
import { sendWebPushToUsers } from './push-send.util';

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

async function resolveDashboardLinkForUser(userId: string): Promise<string> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  switch (u?.role) {
    case 'STUDENT':
      return '/student';
    case 'PARENT':
      return '/parent';
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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildGenericEmail(firstName: string, title: string, content: string, linkPath: string): ImportantEmailTemplate {
  const base = getPublicFrontendBase().replace(/\/+$/, '');
  const url = `${base}${linkPath.startsWith('/') ? linkPath : `/${linkPath}`}`;
  const subject = `${title} — Gestion Scolaire`;
  const text = `Bonjour ${firstName},\n\n${title}\n\n${content}\n\nConsulter : ${url}\n`;
  const html = `<p>Bonjour ${escapeHtml(firstName)},</p><p><strong>${escapeHtml(title)}</strong></p><p>${escapeHtml(content).replace(/\n/g, '<br/>')}</p><p><a href="${url}">Ouvrir l’application</a></p>`;
  return { subject, text, html };
}

/**
 * Notifications in-app + e-mail + Web Push pour les destinataires indiqués.
 * Les erreurs réseau sont journalisées sans faire échouer l’appelant.
 */
/** Après publication des bulletins d’une classe : élèves + parents (sans doublon). */
export async function notifyBulletinsPublished(
  rows: { studentId: string }[],
  periodLabel: string,
  academicYear: string
): Promise<void> {
  const allUserIds = new Set<string>();
  for (const row of rows) {
    const student = await prisma.student.findUnique({
      where: { id: row.studentId },
      select: { userId: true },
    });
    if (!student) continue;
    allUserIds.add(student.userId);
    const parents = await prisma.studentParent.findMany({
      where: { studentId: row.studentId },
      include: { parent: { select: { userId: true } } },
    });
    parents.forEach((p) => allUserIds.add(p.parent.userId));
  }
  await notifyUsersImportant([...allUserIds], {
    type: 'bulletin',
    title: 'Bulletin publié',
    content: `Le bulletin ${periodLabel} (${academicYear}) est disponible dans votre espace.`,
    email: undefined,
  });
}

export async function notifyUsersImportant(
  userIds: string[],
  options: NotifyImportantOptions
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
      if (user?.email) {
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
