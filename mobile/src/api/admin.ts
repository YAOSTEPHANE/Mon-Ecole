import api from './client';

export type AdminDashboard = {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  activeStudents: number;
  totalParents: number;
  totalEducators: number;
  classDistribution?: Array<{ name: string; value: number }>;
};

export type AdminDashboardKpis = {
  generatedAt?: string;
  cards?: {
    admissionsPending?: number;
    admissionsUnderReview?: number;
    tuitionUnpaidAmount?: number;
    tuitionUnpaidCount?: number;
    paymentsCompleted30dAmount?: number;
    attendancePresenceRate?: number | null;
    attendancePresentCount?: number;
    attendanceAbsentCount?: number;
    attendancePresentUnique?: number;
    attendancePresentUniqueDelta?: number;
    atRiskHigh?: number;
    atRiskMedium?: number;
  };
};

export type AdminStudent = {
  id: string;
  isActive?: boolean;
  enrollmentStatus?: string;
  studentNumber?: string | null;
  user?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    phone?: string | null;
  };
  class?: {
    id?: string;
    name?: string;
    level?: string | null;
  } | null;
};

export type AdminClass = {
  id: string;
  name: string;
  level?: string | null;
  _count?: { students: number };
};

export type AdminAbsence = {
  id: string;
  date: string;
  status: string;
  excused?: boolean;
  reason?: string | null;
  student?: {
    user?: { firstName?: string; lastName?: string };
    class?: { name?: string };
  };
  course?: { name?: string; code?: string };
};

export type AdminAttendanceStats = {
  total: number;
  present: number;
  late: number;
  absentUnexcused: number;
  excusedAbsent: number;
  punctualityRate: number;
  byClass?: Array<{
    classId: string;
    className: string;
    present: number;
    late: number;
    absentUnexcused: number;
    excusedAbsent: number;
    total: number;
    punctualityRate: number;
  }>;
};

export type AbsencePermissionStats = {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
};

export type AbsencePermissionRequest = {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  motif: string;
  reasonDetail?: string | null;
  startDate: string;
  endDate: string;
  createdAt: string;
  adminComment?: string | null;
  student?: {
    user?: { firstName?: string; lastName?: string };
    class?: { name?: string };
  };
  reviewedBy?: { firstName?: string; lastName?: string; role?: string } | null;
};

export type LoginLog = {
  id: string;
  success: boolean;
  email?: string;
  ipAddress?: string | null;
  reason?: string | null;
  createdAt: string;
  user?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    role?: string;
  };
};

export type SecurityEvent = {
  id: string;
  type: string;
  description?: string;
  severity?: string;
  ipAddress?: string | null;
  createdAt: string;
  user?: { firstName?: string; lastName?: string; email?: string; role?: string };
};

export const adminApi = {
  getDashboard: async () => {
    const { data } = await api.get('/admin/dashboard');
    return data as AdminDashboard;
  },

  getDashboardKpis: async () => {
    const { data } = await api.get('/admin/dashboard/kpis');
    return data as AdminDashboardKpis;
  },

  getStudents: async (params?: {
    classId?: string;
    enrollmentStatus?: string;
    isActive?: boolean;
    limit?: number;
    page?: number;
  }) => {
    const { data } = await api.get('/admin/students', {
      params: {
        enrollmentStatus: params?.enrollmentStatus ?? 'ACTIVE',
        limit: params?.limit ?? 200,
        page: params?.page ?? 1,
        ...(params?.classId ? { classId: params.classId } : {}),
        ...(params?.isActive !== undefined ? { isActive: String(params.isActive) } : {}),
      },
    });
    return (Array.isArray(data) ? data : []) as AdminStudent[];
  },

  getStudent: async (id: string) => {
    const { data } = await api.get(`/admin/students/${id}`);
    return data as AdminStudent & {
      parents?: Array<{
        parent?: {
          user?: { firstName?: string; lastName?: string; phone?: string; email?: string };
        };
      }>;
    };
  },

  getClasses: async () => {
    const { data } = await api.get('/admin/classes');
    return (Array.isArray(data) ? data : []) as AdminClass[];
  },

  getAbsences: async (params?: { date?: string; classId?: string; studentId?: string }) => {
    const { data } = await api.get('/admin/absences', { params });
    return (Array.isArray(data) ? data : []) as AdminAbsence[];
  },

  getAbsenceStats: async (params?: { from?: string; to?: string; classId?: string }) => {
    const { data } = await api.get('/admin/absences/stats', { params });
    return data as AdminAttendanceStats;
  },

  getAbsencePermissionStats: async () => {
    const { data } = await api.get('/admin/absence-permission-requests/stats');
    return data as AbsencePermissionStats;
  },

  getAbsencePermissionRequests: async (params?: { status?: string; studentId?: string }) => {
    const { data } = await api.get('/admin/absence-permission-requests', { params });
    return (Array.isArray(data) ? data : []) as AbsencePermissionRequest[];
  },

  reviewAbsencePermissionRequest: async (
    id: string,
    payload: { status: 'APPROVED' | 'REJECTED'; adminComment?: string },
  ) => {
    const { data } = await api.patch(`/admin/absence-permission-requests/${id}`, payload);
    return data;
  },

  getLoginLogs: async (limit = 50) => {
    const { data } = await api.get('/admin/security/login-logs', { params: { limit } });
    return (Array.isArray(data) ? data : []) as LoginLog[];
  },

  getSecurityEvents: async (limit = 50) => {
    const { data } = await api.get('/admin/security/events', { params: { limit } });
    return (Array.isArray(data) ? data : []) as SecurityEvent[];
  },
};
