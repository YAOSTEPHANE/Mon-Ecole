import api from './client';

export type StudentGrade = {
  id?: string;
  courseId?: string | null;
  course?: { id?: string; name?: string | null } | null;
  date: string;
  score: number;
  maxScore: number;
  coefficient: number;
  evaluationType?: string | null;
  title?: string | null;
  teacher?: {
    user?: { firstName?: string | null; lastName?: string | null } | null;
  } | null;
};

export type StudentGradesResponse = {
  grades: StudentGrade[];
  tuitionBlock?: { active?: boolean; hiddenAcademicYears?: string[] };
};

export type StudentAbsence = {
  id: string;
  course?: { id?: string | null; name?: string | null } | null;
  date: string;
  excused?: boolean;
  status?: string | null;
  message?: string | null;
};

export type StudentDailyPresence = {
  id?: string;
  date: string;
  // Certains endpoints utilisent `status` ou `presence`; on reste permissif.
  status?: string;
  // Statistiques globales possibles
  presentCount?: number;
  absentCount?: number;
};

export type StudentPayment = {
  id?: string;
  amount?: number;
  status?: string | null;
  paymentMethod?: string | null;
  createdAt?: string;
};

export type StudentPaymentsResponse = StudentPayment[];

export const studentApi = {
  getGrades: async () => {
    const { data } = await api.get('/student/grades');
    const maybe = data as Partial<StudentGradesResponse> & Record<string, unknown>;
    const grades = Array.isArray(maybe?.grades) ? (maybe.grades as StudentGrade[]) : [];
    return { grades, tuitionBlock: maybe.tuitionBlock } as StudentGradesResponse;
  },

  getAbsences: async () => {
    const { data } = await api.get('/student/absences');
    return Array.isArray(data) ? (data as StudentAbsence[]) : [];
  },

  getDailyPresence: async (params?: { limit?: number }) => {
    const { data } = await api.get('/student/daily-presence', { params });
    return Array.isArray(data) ? (data as StudentDailyPresence[]) : [];
  },

  getPayments: async () => {
    const { data } = await api.get('/student/payments');
    return (Array.isArray(data) ? (data as StudentPayment[]) : []) as StudentPaymentsResponse;
  },
};

