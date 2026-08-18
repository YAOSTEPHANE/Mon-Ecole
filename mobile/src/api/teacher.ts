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

  getDashboardKpis: async () => {
    const { data } = await api.get('/teacher/dashboard/kpis');
    return data;
  },
};
