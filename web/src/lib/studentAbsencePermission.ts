export const ABSENCE_PERMISSION_MOTIF_LABELS = {
  MEDICAL: 'Médical',
  FAMILIAL: 'Familial',
  OTHER: 'Autre',
} as const;

export const ABSENCE_PERMISSION_STATUS_LABELS = {
  PENDING: 'En attente',
  APPROVED: 'Approuvée',
  REJECTED: 'Refusée',
  CANCELLED: 'Annulée',
} as const;

export type AbsencePermissionMotif = keyof typeof ABSENCE_PERMISSION_MOTIF_LABELS;
export type AbsencePermissionStatus = keyof typeof ABSENCE_PERMISSION_STATUS_LABELS;

export type AbsencePermissionStats = {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
};

export function absencePermissionStatusVariant(
  status: AbsencePermissionStatus
): 'warning' | 'success' | 'danger' | 'secondary' {
  switch (status) {
    case 'PENDING':
      return 'warning';
    case 'APPROVED':
      return 'success';
    case 'REJECTED':
      return 'danger';
    case 'CANCELLED':
      return 'secondary';
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export type AbsencePermissionRequest = {
  id: string;
  studentId: string;
  requestedByUserId: string;
  requestedByRole: 'STUDENT' | 'PARENT';
  motif: AbsencePermissionMotif;
  startDate: string;
  endDate: string;
  reasonDetail: string;
  justificationDocuments: string[];
  status: AbsencePermissionStatus;
  adminComment?: string | null;
  reviewedAt?: string | null;
  reviewedBy?: {
    id: string;
    firstName?: string;
    lastName?: string;
    role?: string;
  } | null;
  createdAt: string;
  student?: {
    user?: { firstName?: string; lastName?: string };
    class?: { name?: string };
  };
  absencesUpdated?: number;
};

export function absencePermissionReviewerLabel(
  reviewedBy?: AbsencePermissionRequest['reviewedBy']
): string {
  if (!reviewedBy) return 'Direction';
  const name = `${reviewedBy.firstName ?? ''} ${reviewedBy.lastName ?? ''}`.trim();
  if (!name) return 'Direction';
  if (reviewedBy.role === 'SUPER_ADMIN') return `${name} (super admin)`;
  if (reviewedBy.role === 'ADMIN') return `${name} (administration)`;
  return name;
}

/** Les permissions approuvées sont conservées (absences excusées, traçabilité). */
export function canDeleteAbsencePermission(status: AbsencePermissionStatus): boolean {
  return status !== 'APPROVED';
}

export const ABSENCE_PERMISSION_DELETE_BLOCKED_MESSAGE =
  'La suppression est interdite pour une permission approuvée.';
