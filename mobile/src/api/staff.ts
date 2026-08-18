import api from './client';

export type StaffWorkspace = {
  visibleModules: string[];
  supportKind: string | null;
  staffCategory: string;
  schoolId?: string;
  metierLabel?: string | null;
};

export type CounterStudent = {
  id: string;
  studentId: string;
  user?: { firstName?: string; lastName?: string; email?: string };
  class?: { name?: string; level?: string; academicYear?: string };
};

export type CounterTuitionFee = {
  id: string;
  period: string;
  academicYear: string;
  amount: number;
  isPaid: boolean;
  feeType?: string;
  remainingAmount: number;
  totalPaid: number;
};

export type StaffAdmission = {
  id: string;
  reference: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  status: string;
  desiredLevel: string;
  academicYear: string;
  adminNotes?: string | null;
  createdAt: string;
  proposedClass?: { name: string; level: string } | null;
};

export const staffApi = {
  getWorkspace: async () => {
    const { data } = await api.get('/staff/workspace');
    return data as StaffWorkspace;
  },

  searchStudentsForCounter: async (q: string) => {
    const { data } = await api.get('/staff/counter-tuition/students', { params: { q } });
    return (Array.isArray(data) ? data : []) as CounterStudent[];
  },

  getStudentTuitionFeesForCounter: async (studentId: string) => {
    const { data } = await api.get(`/staff/counter-tuition/students/${studentId}/tuition-fees`);
    return (Array.isArray(data) ? data : []) as CounterTuitionFee[];
  },

  recordCounterTuitionPayment: async (
    studentId: string,
    body: {
      tuitionFeeId: string;
      amount: number;
      paymentMethod: 'CASH' | 'BANK_TRANSFER';
      notes?: string;
    },
  ) => {
    const { data } = await api.post(`/staff/counter-tuition/students/${studentId}/payments`, body);
    return data;
  },

  getAdmissionsStats: async () => {
    const { data } = await api.get('/staff/admissions/stats');
    return data as { pending: number; underReview: number; accepted: number; total: number };
  },

  listAdmissions: async (params?: { status?: string; q?: string }) => {
    const { data } = await api.get('/staff/admissions', { params });
    return (Array.isArray(data) ? data : []) as StaffAdmission[];
  },

  updateAdmission: async (
    id: string,
    body: { status?: string; adminNotes?: string; proposedClassId?: string | null },
  ) => {
    const { data } = await api.patch(`/staff/admissions/${id}`, body);
    return data;
  },
};
