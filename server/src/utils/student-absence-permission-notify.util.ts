import type { StudentAbsencePermissionMotif, StudentAbsencePermissionRequestedBy } from '@prisma/client';
import prisma from './prisma';
import { getPublicFrontendBase, sendTransactionalHtmlEmail } from './email.util';
import { notifyUsersImportant, type ImportantEmailTemplate } from './notify-important.util';
import { getParentUserIdsForStudent, notifyParentsForStudent } from './parent-notify.util';
import { permissionRequestInclude } from './student-absence-permission.util';

const MOTIF_LABELS: Record<StudentAbsencePermissionMotif, string> = {
  MEDICAL: 'Médical',
  FAMILIAL: 'Familial',
  OTHER: 'Autre',
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDateFr(d: Date): string {
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function studentDisplayName(firstName?: string | null, lastName?: string | null): string {
  const name = `${firstName ?? ''} ${lastName ?? ''}`.trim();
  return name || 'Élève';
}

async function loadRequest(requestId: string) {
  return prisma.studentAbsencePermissionRequest.findUnique({
    where: { id: requestId },
    include: permissionRequestInclude,
  });
}

async function resolveAdminNotificationTargets(): Promise<{ userIds: string[]; emails: Set<string> }> {
  const emails = new Set<string>();
  const raw =
    process.env.ADMIN_NOTIFY_EMAIL?.trim() || process.env.ADMISSION_ADMIN_EMAIL?.trim();
  if (raw) {
    for (const part of raw.split(/[,;]/)) {
      const v = part.trim().toLowerCase();
      if (v) emails.add(v);
    }
  }

  const admins = await prisma.user.findMany({
    where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] }, isActive: true },
    select: { id: true, email: true },
  });

  const userIds = admins.map((a) => a.id);
  for (const admin of admins) {
    const v = admin.email?.trim().toLowerCase();
    if (v) emails.add(v);
  }

  return { userIds: [...new Set(userIds)], emails };
}

function buildAdminNewRequestMail(params: {
  studentName: string;
  className?: string | null;
  motifLabel: string;
  startDateStr: string;
  endDateStr: string;
  reasonDetail: string;
  submittedByLabel: string;
  consultUrl: string;
}): { subject: string; text: string; html: string } {
  const subject = `Nouvelle demande de permission d'absence — ${params.studentName}`;
  const detailLines = [
    `Élève : ${params.studentName}`,
    params.className ? `Classe : ${params.className}` : null,
    `Période : du ${params.startDateStr} au ${params.endDateStr}`,
    `Motif : ${params.motifLabel}`,
    `Déposée par : ${params.submittedByLabel}`,
    `Justification : ${params.reasonDetail}`,
  ].filter((line): line is string => Boolean(line));

  const text = [
    'Une nouvelle demande de permission d\'absence vient d\'être déposée.',
    '',
    ...detailLines,
    '',
    `Traiter la demande : ${params.consultUrl}`,
  ].join('\n');

  const html = [
    '<p>Une nouvelle <strong>demande de permission d\'absence</strong> vient d\'être déposée.</p>',
    '<ul>',
    ...detailLines.map((line) => `<li>${escapeHtml(line)}</li>`),
    '</ul>',
    `<p><a href="${params.consultUrl}">Ouvrir le module assiduité</a></p>`,
  ].join('');

  return { subject, text, html };
}

function buildFamilyDecisionEmail(params: {
  firstName: string;
  studentName: string;
  decision: 'APPROVED' | 'REJECTED';
  motifLabel: string;
  startDateStr: string;
  endDateStr: string;
  adminComment?: string | null;
  absencesUpdated?: number;
  linkPath: string;
}): ImportantEmailTemplate {
  const decided = params.decision === 'APPROVED' ? 'approuvée' : 'refusée';
  const subject =
    params.decision === 'APPROVED'
      ? `Permission d'absence approuvée — ${params.studentName}`
      : `Permission d'absence refusée — ${params.studentName}`;

  const lines = [
    `Bonjour ${params.firstName},`,
    '',
    `La demande de permission d'absence de ${params.studentName} (${params.motifLabel}, du ${params.startDateStr} au ${params.endDateStr}) a été ${decided} par la direction.`,
  ];
  if (params.decision === 'APPROVED' && params.absencesUpdated && params.absencesUpdated > 0) {
    lines.push(
      '',
      `${params.absencesUpdated} absence(s) déjà enregistrée(s) sur cette période ont été marquée(s) comme excusée(s).`
    );
  }
  if (params.adminComment) {
    lines.push('', 'Message de la direction :', params.adminComment);
  }
  lines.push('', 'Cordialement,', 'La direction');
  const text = lines.join('\n');

  const base = getPublicFrontendBase().replace(/\/+$/, '');
  const url = `${base}${params.linkPath.startsWith('/') ? params.linkPath : `/${params.linkPath}`}`;

  const htmlParts = [
    `<p>Bonjour ${escapeHtml(params.firstName)},</p>`,
    `<p>La demande de permission d'absence de <strong>${escapeHtml(params.studentName)}</strong> (<strong>${escapeHtml(params.motifLabel)}</strong>, du <strong>${params.startDateStr}</strong> au <strong>${params.endDateStr}</strong>) a été <strong>${decided}</strong> par la direction.</p>`,
  ];
  if (params.decision === 'APPROVED' && params.absencesUpdated && params.absencesUpdated > 0) {
    htmlParts.push(
      `<p>${params.absencesUpdated} absence(s) déjà enregistrée(s) sur cette période ont été marquée(s) comme excusée(s).</p>`
    );
  }
  if (params.adminComment) {
    htmlParts.push(
      `<p><strong>Message de la direction :</strong><br/>${escapeHtml(params.adminComment).replace(/\n/g, '<br/>')}</p>`
    );
  }
  htmlParts.push(`<p><a href="${url}">Consulter dans l'application</a></p>`, '<p>Cordialement,<br/>La direction</p>');

  return { subject, text, html: htmlParts.join('') };
}

/** Notifie la direction (e-mail + in-app) lors d'une nouvelle demande. */
export async function notifyAdminsOfNewAbsencePermissionRequest(requestId: string): Promise<void> {
  const request = await loadRequest(requestId);
  if (!request) return;

  const studentName = studentDisplayName(
    request.student.user.firstName,
    request.student.user.lastName
  );
  const motifLabel = MOTIF_LABELS[request.motif];
  const startDateStr = formatDateFr(request.startDate);
  const endDateStr = formatDateFr(request.endDate);
  const submittedByLabel =
    request.requestedByRole === 'PARENT' ? 'un parent' : "l'élève";
  const base = getPublicFrontendBase().replace(/\/+$/, '');
  const consultUrl = `${base}/admin?tab=attendance`;

  const { userIds, emails } = await resolveAdminNotificationTargets();
  const mail = buildAdminNewRequestMail({
    studentName,
    className: request.student.class?.name,
    motifLabel,
    startDateStr,
    endDateStr,
    reasonDetail: request.reasonDetail,
    submittedByLabel,
    consultUrl,
  });

  for (const to of emails) {
    await sendTransactionalHtmlEmail(to, mail.subject, mail.text, mail.html);
  }

  if (userIds.length > 0) {
    await notifyUsersImportant(userIds, {
      type: 'absence_permission',
      title: 'Nouvelle permission d\'absence',
      content: `${studentName} — ${motifLabel}, du ${startDateStr} au ${endDateStr} (${submittedByLabel})`,
      link: '/admin?tab=attendance',
      email: null,
    });
  }
}

/** Informe l'autre partie (parent ou élève) qu'une demande a été déposée. */
export async function notifyFamilyAbsencePermissionSubmitted(
  requestId: string,
  submittedByRole: StudentAbsencePermissionRequestedBy
): Promise<void> {
  const request = await loadRequest(requestId);
  if (!request) return;

  const studentName = studentDisplayName(
    request.student.user.firstName,
    request.student.user.lastName
  );
  const motifLabel = MOTIF_LABELS[request.motif];
  const startDateStr = formatDateFr(request.startDate);
  const endDateStr = formatDateFr(request.endDate);
  const period = `du ${startDateStr} au ${endDateStr}`;

  if (submittedByRole === 'STUDENT') {
    await notifyParentsForStudent(request.studentId, {
      type: 'absence_permission',
      title: 'Demande de permission déposée',
      content: `${studentName} a déposé une demande de permission d'absence (${motifLabel}, ${period}). Elle est en attente de validation par la direction.`,
      link: '/parent?tab=absences',
    });
    return;
  }

  const studentUserId = request.student.user.id;
  await notifyUsersImportant([studentUserId], {
    type: 'absence_permission',
    title: 'Demande de permission déposée',
    content: `Un parent a déposé une demande de permission d'absence pour vous (${motifLabel}, ${period}). Elle est en attente de validation par la direction.`,
    link: '/student?tab=absences',
  });
}
/** Notifie élève et parents après décision de la direction. */
export async function notifyFamilyOfAbsencePermissionDecision(
  requestId: string,
  decision: 'APPROVED' | 'REJECTED',
  adminComment?: string | null,
  absencesUpdated?: number
): Promise<void> {
  const request = await loadRequest(requestId);
  if (!request) return;

  const studentName = studentDisplayName(
    request.student.user.firstName,
    request.student.user.lastName
  );
  const motifLabel = MOTIF_LABELS[request.motif];
  const startDateStr = formatDateFr(request.startDate);
  const endDateStr = formatDateFr(request.endDate);
  const decided = decision === 'APPROVED' ? 'approuvée' : 'refusée';

  const title =
    decision === 'APPROVED'
      ? 'Permission d\'absence approuvée'
      : 'Permission d\'absence refusée';

  let content = `La demande de ${studentName} (${motifLabel}, du ${startDateStr} au ${endDateStr}) a été ${decided}.`;
  if (decision === 'APPROVED' && absencesUpdated && absencesUpdated > 0) {
    content += ` ${absencesUpdated} absence(s) sur la période ont été marquée(s) excusée(s).`;
  }
  if (adminComment && decision === 'REJECTED') {
    content += ` Motif : ${adminComment}`;
  }

  const recipientIds = new Set<string>([request.student.user.id]);
  const parentIds = await getParentUserIdsForStudent(request.studentId);
  parentIds.forEach((id) => recipientIds.add(id));

  for (const userId of recipientIds) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, role: true },
    });
    if (!user) continue;

    const linkPath =
      user.role === 'PARENT' ? '/parent?tab=absences' : '/student?tab=absences';

    const email = buildFamilyDecisionEmail({
      firstName: user.firstName,
      studentName,
      decision,
      motifLabel,
      startDateStr,
      endDateStr,
      adminComment,
      absencesUpdated,
      linkPath,
    });

    await notifyUsersImportant([userId], {
      type: 'absence_permission',
      title,
      content,
      link: linkPath,
      email,
    });
  }
}
