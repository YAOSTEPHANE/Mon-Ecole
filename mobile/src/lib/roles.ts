export type AppRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'TEACHER'
  | 'STUDENT'
  | 'PARENT'
  | 'EDUCATOR'
  | 'STAFF';

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super administrateur',
  ADMIN: 'Administrateur',
  TEACHER: 'Enseignant',
  STUDENT: 'Élève',
  PARENT: 'Parent',
  EDUCATOR: 'Éducateur',
  STAFF: 'Personnel',
};

export function normalizeRole(role: string): string {
  return (role || '').toUpperCase();
}

export function notificationsPath(role: string): string {
  switch (normalizeRole(role)) {
    case 'SUPER_ADMIN':
    case 'ADMIN':
      return '/admin/notifications';
    case 'TEACHER':
      return '/teacher/notifications';
    case 'STUDENT':
      return '/student/notifications';
    case 'PARENT':
      return '/parent/notifications';
    case 'EDUCATOR':
      return '/educator/notifications';
    case 'STAFF':
      return '/staff/notifications';
    default:
      return '/admin/notifications';
  }
}

export function canUseAssistant(role: string): boolean {
  return ['ADMIN', 'SUPER_ADMIN', 'TEACHER', 'EDUCATOR', 'STAFF'].includes(
    normalizeRole(role),
  );
}

export function canTakeAttendance(role: string): boolean {
  return ['TEACHER', 'EDUCATOR'].includes(normalizeRole(role));
}

export function canViewAcademics(role: string): boolean {
  return ['STUDENT', 'PARENT'].includes(normalizeRole(role));
}

export function canViewAdminOps(role: string): boolean {
  return ['ADMIN', 'SUPER_ADMIN'].includes(normalizeRole(role));
}

export function canViewStaffOps(role: string): boolean {
  return normalizeRole(role) === 'STAFF';
}

export function canViewParentOps(role: string): boolean {
  return normalizeRole(role) === 'PARENT';
}
