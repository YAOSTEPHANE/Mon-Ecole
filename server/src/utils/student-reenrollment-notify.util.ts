import type { StudentReenrollmentRequestedBy } from '@prisma/client';
import prisma from './prisma';
import { getPublicFrontendBase, sendTransactionalHtmlEmail } from './email.util';
import { notifyUsersImportant, type ImportantEmailTemplate } from './notify-important.util';
import { notifyParentsForStudent } from './parent-notify.util';
import { reenrollmentRequestInclude } from './student-reenrollment.util';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function studentDisplayName(firstName?: string | null, lastName?: string | null): string {
  const name = `${firstName ?? ''} ${lastName ?? ''}`.trim();
  return name || 'Élève';
}

async function loadRequest(requestId: string) {
  return prisma.studentReenrollmentRequest.findUnique({
    where: { id: requestId },
    include: reenrollmentRequestInclude,
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

/** Notifie la direction lors d'une nouvelle demande de réinscription. */
export async function notifyAdminsOfNewReenrollmentRequest(requestId: string): Promise<void> {
  const request = await loadRequest(requestId);
  if (!request) return;

  const studentName = studentDisplayName(
    request.student.user.firstName,
    request.student.user.lastName,
  );
  const submittedByLabel = request.requestedByRole === 'PARENT' ? 'un parent' : "l'élève";
  const base = getPublicFrontendBase().replace(/\/+$/, '');
  const consultUrl = `${base}/admin?tab=admissions&admissionsTab=reenrollments`;

  const detailLines = [
    `Élève : ${studentName}`,
    request.student.class?.name ? `Classe actuelle : ${request.student.class.name}` : null,
    `Année scolaire cible : ${request.targetAcademicYear}`,
    `Déposée par : ${submittedByLabel}`,
    request.message ? `Message : ${request.message}` : null,
  ].filter((line): line is string => Boolean(line));

  const subject = `Nouvelle demande de réinscription — ${studentName}`;
  const text = [
    'Une nouvelle demande de réinscription vient d’être déposée.',
    '',
    ...detailLines,
    '',
    `Traiter la demande : ${consultUrl}`,
  ].join('\n');
  const html = [
    '<p>Une nouvelle <strong>demande de réinscription</strong> vient d’être déposée.</p>',
    '<ul>',
    ...detailLines.map((line) => `<li>${escapeHtml(line)}</li>`),
    '</ul>',
    `<p><a href="${consultUrl}">Ouvrir les inscriptions & admissions</a></p>`,
  ].join('');

  const { userIds, emails } = await resolveAdminNotificationTargets();
  for (const to of emails) {
    await sendTransactionalHtmlEmail(to, subject, text, html);
  }

  if (userIds.length > 0) {
    await notifyUsersImportant(userIds, {
      type: 'reenrollment',
      title: 'Nouvelle demande de réinscription',
      content: `${studentName} — ${request.targetAcademicYear} (${submittedByLabel})`,
      link: '/admin?tab=admissions&admissionsTab=reenrollments',
      email: null,
    });
  }
}

/** Informe l'autre partie (parent ou élève) qu'une demande a été déposée. */
export async function notifyFamilyReenrollmentSubmitted(
  requestId: string,
  submittedByRole: StudentReenrollmentRequestedBy,
): Promise<void> {
  const request = await loadRequest(requestId);
  if (!request) return;

  const studentName = studentDisplayName(
    request.student.user.firstName,
    request.student.user.lastName,
  );
  const year = request.targetAcademicYear;

  if (submittedByRole === 'STUDENT') {
    await notifyParentsForStudent(request.studentId, {
      type: 'reenrollment',
      title: 'Demande de réinscription déposée',
      content: `${studentName} a demandé une réinscription pour ${year}. En attente de validation.`,
      link: '/parent?tab=reenrollment',
    });
    return;
  }

  const studentUserId = request.student.user.id;
  await notifyUsersImportant([studentUserId], {
    type: 'reenrollment',
    title: 'Demande de réinscription déposée',
    content: `Votre parent a demandé votre réinscription pour ${year}. En attente de validation.`,
    link: '/student?tab=profile',
    email: null,
  });
}

function buildFamilyDecisionEmail(params: {
  firstName: string;
  studentName: string;
  decision: 'APPROVED' | 'REJECTED';
  academicYear: string;
  className?: string | null;
  adminComment?: string | null;
  linkPath: string;
}): ImportantEmailTemplate {
  const decided = params.decision === 'APPROVED' ? 'approuvée' : 'refusée';
  const subject =
    params.decision === 'APPROVED'
      ? `Réinscription approuvée — ${params.studentName}`
      : `Réinscription refusée — ${params.studentName}`;

  const lines = [
    `Bonjour ${params.firstName},`,
    '',
    `La demande de réinscription de ${params.studentName} pour l'année ${params.academicYear} a été ${decided} par la direction.`,
  ];
  if (params.decision === 'APPROVED' && params.className) {
    lines.push('', `Classe affectée : ${params.className}`);
  }
  if (params.adminComment) {
    lines.push('', 'Message de la direction :', params.adminComment);
  }
  lines.push('', 'Cordialement,', 'La direction');

  const base = getPublicFrontendBase().replace(/\/+$/, '');
  const url = `${base}${params.linkPath.startsWith('/') ? params.linkPath : `/${params.linkPath}`}`;

  const htmlParts = [
    `<p>Bonjour ${escapeHtml(params.firstName)},</p>`,
    `<p>La demande de réinscription de <strong>${escapeHtml(params.studentName)}</strong> pour l'année <strong>${escapeHtml(params.academicYear)}</strong> a été <strong>${decided}</strong> par la direction.</p>`,
  ];
  if (params.decision === 'APPROVED' && params.className) {
    htmlParts.push(`<p>Classe affectée : <strong>${escapeHtml(params.className)}</strong></p>`);
  }
  if (params.adminComment) {
    htmlParts.push(
      `<p><strong>Message de la direction :</strong><br/>${escapeHtml(params.adminComment).replace(/\n/g, '<br/>')}</p>`,
    );
  }
  htmlParts.push(`<p><a href="${url}">Consulter dans l'application</a></p>`, '<p>Cordialement,<br/>La direction</p>');

  return { subject, text: lines.join('\n'), html: htmlParts.join('') };
}

/** Notifie la famille après décision admin. */
export async function notifyFamilyOfReenrollmentDecision(
  requestId: string,
  decision: 'APPROVED' | 'REJECTED',
  approvedClassName?: string | null,
): Promise<void> {
  const request = await loadRequest(requestId);
  if (!request) return;

  const studentName = studentDisplayName(
    request.student.user.firstName,
    request.student.user.lastName,
  );

  const title =
    decision === 'APPROVED' ? 'Réinscription approuvée' : 'Réinscription refusée';
  let content =
    decision === 'APPROVED'
      ? `La réinscription de ${studentName} pour ${request.targetAcademicYear} a été approuvée${approvedClassName ? ` (${approvedClassName})` : ''}.`
      : `La réinscription de ${studentName} pour ${request.targetAcademicYear} a été refusée.`;
  if (request.adminComment && decision === 'REJECTED') {
    content += ` Motif : ${request.adminComment}`;
  }

  await notifyParentsForStudent(request.studentId, {
    type: 'reenrollment',
    title,
    content,
    link: '/parent?tab=reenrollment',
    email: buildFamilyDecisionEmail({
      firstName: 'Parent',
      studentName,
      decision,
      academicYear: request.targetAcademicYear,
      className: approvedClassName,
      adminComment: request.adminComment,
      linkPath: '/parent?tab=reenrollment',
    }),
  });

  await notifyUsersImportant([request.student.user.id], {
    type: 'reenrollment',
    title,
    content,
    link: '/student?tab=profile',
    email: buildFamilyDecisionEmail({
      firstName: request.student.user.firstName,
      studentName,
      decision,
      academicYear: request.targetAcademicYear,
      className: approvedClassName,
      adminComment: request.adminComment,
      linkPath: '/student?tab=profile',
    }),
  });
}
