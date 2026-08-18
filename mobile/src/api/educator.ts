import api from './client';
import type { AttendanceStatus, CourseAbsence, RollcallCourse } from './teacher';

export const educatorApi = {
  getAttendanceCourses: async () => {
    const { data } = await api.get('/educator/attendance/courses');
    return (Array.isArray(data) ? data : []) as RollcallCourse[];
  },

  getCourseAbsences: async (courseId: string, date?: string) => {
    const { data } = await api.get(`/educator/courses/${courseId}/absences`, {
      params: date ? { date } : undefined,
    });
    return (Array.isArray(data) ? data : []) as CourseAbsence[];
  },

  initAttendance: async (payload: { courseId: string; date: string }) => {
    const { data } = await api.post('/educator/absences/init-attendance', payload);
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
    const { data } = await api.post('/educator/absences/take-attendance', payload);
    return data;
  },

  getStats: async () => {
    const { data } = await api.get('/educator/stats');
    return data;
  },
};
