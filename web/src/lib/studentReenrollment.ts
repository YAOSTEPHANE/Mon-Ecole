export const REENROLLMENT_STATUS_LABELS = {
  PENDING: 'En attente',
  APPROVED: 'Approuvée',
  REJECTED: 'Refusée',
  CANCELLED: 'Annulée',
} as const;

export type ReenrollmentStatus = keyof typeof REENROLLMENT_STATUS_LABELS;

export type ReenrollmentStats = {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
};

export function reenrollmentStatusVariant(
  status: ReenrollmentStatus,
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

export type ReenrollmentClassOption = {
  id: string;
  name: string;
  level: string;
  academicYear: string;
};

export type ReenrollmentRequest = {
  id: string;
  studentId: string;
  requestedByUserId: string;
  requestedByRole: 'STUDENT' | 'PARENT';
  targetAcademicYear: string;
  preferredClassId?: string | null;
  message?: string | null;
  status: ReenrollmentStatus;
  adminComment?: string | null;
  reviewedAt?: string | null;
  approvedClassId?: string | null;
  createdAt: string;
  reviewedBy?: {
    id: string;
    firstName?: string;
    lastName?: string;
    role?: string;
  } | null;
  preferredClass?: ReenrollmentClassOption | null;
  approvedClass?: ReenrollmentClassOption | null;
  student?: {
    user?: { firstName?: string; lastName?: string; email?: string };
    class?: { id?: string; name?: string; level?: string; academicYear?: string };
  };
};

export function reenrollmentReviewerLabel(
  reviewedBy?: ReenrollmentRequest['reviewedBy'],
): string {
  if (!reviewedBy) return 'Direction';
  const name = `${reviewedBy.firstName ?? ''} ${reviewedBy.lastName ?? ''}`.trim();
  if (!name) return 'Direction';
  if (reviewedBy.role === 'SUPER_ADMIN') return `${name} (super admin)`;
  if (reviewedBy.role === 'ADMIN') return `${name} (administration)`;
  return name;
}

export function reenrollmentRequesterLabel(role: 'STUDENT' | 'PARENT'): string {
  return role === 'PARENT' ? 'Parent' : 'Élève';
}
