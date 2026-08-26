import { notifyUsersImportant } from './notify-important.util';
import { resolveActiveAdminUserIds } from './staff-notify.util';

export type PersonnelLateNotifyPayload = {
  roleLabel: 'Enseignant' | 'Personnel';
  personName: string;
  minutesLate: number;
  contextLabel?: string | null;
  at: Date;
  link?: string;
};

/**
 * Notifie les ADMIN / SUPER_ADMIN (in-app + e-mail + push) d’un retard au pointage.
 */
export async function notifyAdminsOfPersonnelLate(
  payload: PersonnelLateNotifyPayload,
): Promise<void> {
  try {
    const adminIds = await resolveActiveAdminUserIds();
    if (adminIds.length === 0) return;

    const timeStr = payload.at.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const dateStr = payload.at.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    const mins = Math.max(0, Math.round(payload.minutesLate));
    const context = payload.contextLabel?.trim()
      ? ` — ${payload.contextLabel.trim()}`
      : '';

    const title = `Retard — ${payload.roleLabel}`;
    const content = `${payload.personName} a pointé en retard (${mins} min) le ${dateStr} à ${timeStr}${context}.`;

    await notifyUsersImportant(adminIds, {
      type: 'personnel_late',
      title,
      content,
      link: payload.link ?? '/admin?tab=hr',
    });
  } catch (error) {
    console.error('notifyAdminsOfPersonnelLate:', error);
  }
}
