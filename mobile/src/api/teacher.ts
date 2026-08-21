import api from './client';

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE';

export type RollcallStudent = {
  id: string;
  isActive?: boolean;
  user?: { firstName?: string | null; lastName?: string | null };
};

export type RollcallCourse = {
  id: string;
  name: string;
  isSubstitute?: boolean;
  class?: {
    name?: string;
    students?: RollcallStudent[];
  };
  teacher?: { user?: { firstName?: string; lastName?: string } };
};

export type CourseAbsence = {
  id: string;
  studentId: string;
  status: string;
  excused?: boolean;
  student?: {
    user?: { firstName?: string; lastName?: string };
  };
};

export const teacherApi = {
  getCourses: async (params?: { scope?: 'mine' | 'substitute' | 'all' }) => {
    const { data } = await api.get('/teacher/courses', { params });
    return (Array.isArray(data) ? data : []) as RollcallCourse[];
  },

  getCourseAbsences: async (courseId: string, date?: string) => {
    const { data } = await api.get(`/teacher/courses/${courseId}/absences`, {
      params: date ? { date } : undefined,
    });
    return (Array.isArray(data) ? data : []) as CourseAbsence[];
  },

  initAttendance: async (payload: { courseId: string; date: string }) => {
    const { data } = await api.post('/teacher/absences/init-attendance', payload);
    return data as { message?: string; total?: number };
  },

  takeAttendance: async (payload: {
    courseId: string;
    date: string;
    attendance: Array<{
      studentId: string;
      status: AttendanceStatus;
      excused?: boolean;
      reason?: string;
    }>;
  }) => {
    const { data } = await api.post('/teacher/absences/take-attendance', payload);
    return data;
  },

  getCourseGrades: async (courseId: string) => {
    const { data } = await api.get(`/teacher/courses/${courseId}/grades`);
    return Array.isArray(data) ? data : [];
  },

  createGrade: async (payload: {
    studentId: string;
    courseId: string;
    evaluationType: string;
    title: string;
    score: number;
    maxScore?: number;
    coefficient?: number;
    comments?: string;
    date?: string;
  }) => {
    const { data } = await api.post('/teacher/grades', payload);
    return data;
  },

  getDashboardKpis: async () => {
    const { data } = await api.get('/teacher/dashboard/kpis');
    return data;
  },

  getLeaves: async () => {
    const { data } = await api.get('/teacher/leaves');
    return (Array.isArray(data) ? data : []) as TeacherLeaveRow[];
  },

  createLeave: async (payload: {
    type: string;
    startDate: string;
    endDate: string;
    reason?: string;
  }) => {
    const { data } = await api.post('/teacher/leaves', payload);
    return data as TeacherLeaveRow;
  },

  getMyPayrollLines: async () => {
    const { data } = await api.get('/teacher/payroll/my-lines');
    return (Array.isArray(data) ? data : []) as TeacherPayrollLine[];
  },

  getPayslipSummary: async (lineId: string) => {
    const { data } = await api.get(`/teacher/payroll/my-lines/${lineId}/payslip`, {
      params: { format: 'json' },
    });
    return data as {
      monthLabel: string;
      status: string;
      baseSalary: number;
      bonuses: number;
      deductions: number;
      netPay: number;
    };
  },
};

export type TeacherLeaveRow = {
  id: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
  reason?: string | null;
};

export type TeacherPayrollLine = {
  id: string;
  netAmount: number;
  baseSalary?: number;
  payrollRun: {
    year: number;
    month: number;
    status: string;
    paidAt?: string | null;
  };
};
