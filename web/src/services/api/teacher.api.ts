import api from './client';

export const teacherApi = {
  getProfile: async () => {
    const response = await api.get('/teacher/profile');
    return response.data;
  },
  getSchedule: async () => {
    const response = await api.get('/teacher/schedule');
    return response.data;
  },
  getPerformanceReviews: async () => {
    const response = await api.get('/teacher/performance-reviews');
    return response.data;
  },
  getLeaves: async () => {
    const response = await api.get('/teacher/leaves');
    return response.data;
  },
  createLeave: async (data: {
    type: 'ANNUAL' | 'SICK' | 'PERSONAL' | 'TRAINING' | 'OTHER';
    startDate: string;
    endDate: string;
    reason?: string;
  }) => {
    const response = await api.post('/teacher/leaves', data);
    return response.data;
  },
  cancelLeave: async (leaveId: string) => {
    const response = await api.patch(`/teacher/leaves/${leaveId}/cancel`);
    return response.data;
  },
  getCourses: async () => {
    const response = await api.get('/teacher/courses');
    return response.data;
  },
  getDashboardKpis: async () => {
    const response = await api.get('/teacher/dashboard/kpis');
    return response.data;
  },
  getMyAttendance: async (params?: { date?: string }) => {
    const response = await api.get('/teacher/my-attendance', { params });
    return response.data;
  },
  markMyAttendancePresent: async (data?: { date?: string }) => {
    const response = await api.post('/teacher/my-attendance/mark-present', data ?? {});
    return response.data;
  },
  getStudentByNFC: async (nfcId: string) => {
    const response = await api.get(`/teacher/students/nfc/${nfcId}`);
    return response.data;
  },
  getCourseGrades: async (courseId: string) => {
    const response = await api.get(`/teacher/courses/${courseId}/grades`);
    return response.data;
  },
  createGrade: async (data: any) => {
    const response = await api.post('/teacher/grades', data);
    return response.data;
  },
  updateGrade: async (id: string, data: any) => {
    const response = await api.put(`/teacher/grades/${id}`, data);
    return response.data;
  },
  deleteGrade: async (id: string) => {
    const response = await api.delete(`/teacher/grades/${id}`);
    return response.data;
  },
  takeAttendance: async (data: any) => {
    const response = await api.post('/teacher/absences/take-attendance', data);
    return response.data;
  },
  initAttendance: async (data: { courseId: string; date: string }) => {
    const response = await api.post('/teacher/absences/init-attendance', data);
    return response.data;
  },
  recordNFCAttendance: async (data: { courseId: string; studentId: string; date: string; status: 'PRESENT' | 'ABSENT' | 'LATE' }) => {
    const response = await api.post('/teacher/absences/nfc-attendance', data);
    return response.data;
  },
  getCourseAbsences: async (courseId: string, date?: string) => {
    const response = await api.get(`/teacher/courses/${courseId}/absences`, {
      params: { date },
    });
    return response.data;
  },
  createAssignment: async (data: any) => {
    const response = await api.post('/teacher/assignments', data);
    return response.data;
  },
  getCourseAssignments: async (courseId: string) => {
    const response = await api.get(`/teacher/courses/${courseId}/assignments`);
    return response.data;
  },
  // Conduite (Professeur Principal)
  getConduct: async (params?: { period?: string; academicYear?: string }) => {
    const response = await api.get('/teacher/conduct', { params });
    return response.data;
  },
  createConduct: async (data: any) => {
    const response = await api.post('/teacher/conduct', data);
    return response.data;
  },
  updateConduct: async (id: string, data: any) => {
    const response = await api.put(`/teacher/conduct/${id}`, data);
    return response.data;
  },
  getNotifications: async () => {
    const response = await api.get('/teacher/notifications');
    return response.data;
  },
  markNotificationAsRead: async (notificationId: string) => {
    const response = await api.put(`/teacher/notifications/${notificationId}/read`);
    return response.data;
  },
  markAllNotificationsAsRead: async () => {
    const response = await api.put('/teacher/notifications/read-all');
    return response.data;
  },
  getAppointments: async () => {
    const response = await api.get('/teacher/appointments');
    return response.data;
  },
  confirmAppointment: async (appointmentId: string, notesTeacher?: string | null) => {
    const response = await api.put(`/teacher/appointments/${appointmentId}/confirm`, {
      notesTeacher: notesTeacher ?? undefined,
    });
    return response.data;
  },
  declineAppointment: async (appointmentId: string, reason?: string | null) => {
    const response = await api.put(`/teacher/appointments/${appointmentId}/decline`, {
      reason: reason ?? undefined,
    });
    return response.data;
  },
  cancelTeacherAppointment: async (appointmentId: string) => {
    const response = await api.put(`/teacher/appointments/${appointmentId}/cancel`);
    return response.data;
  },
  getMessagingThreads: async () => {
    const response = await api.get('/teacher/messaging/threads');
    return response.data;
  },
  getMessagingThread: async (threadKey: string) => {
    const response = await api.get('/teacher/messaging/thread', { params: { threadKey } });
    return response.data;
  },
  getMessagingContacts: async () => {
    const response = await api.get('/teacher/messaging/contacts');
    return response.data;
  },
  sendMessagingMessage: async (data: {
    receiverId?: string;
    subject?: string;
    content: string;
    category?: string;
    threadKey?: string;
    attachmentUrls?: string[];
    broadcastClassId?: string;
  }) => {
    const response = await api.post('/teacher/messaging/send', data);
    return response.data;
  },
  markMessagingMessageRead: async (messageId: string) => {
    const response = await api.put(`/teacher/messaging/${messageId}/read`);
    return response.data;
  },
  getMockExams: async () => {
    const response = await api.get('/teacher/mock-exams');
    return response.data;
  },
  getMockExamClasses: async () => {
    const response = await api.get('/teacher/mock-exams/exam-classes');
    return response.data;
  },
  createMockExam: async (data: Record<string, unknown>) => {
    const response = await api.post('/teacher/mock-exams', data);
    return response.data;
  },
  publishMockExam: async (id: string, isPublished = true) => {
    const response = await api.patch(`/teacher/mock-exams/${id}/publish`, { isPublished });
    return response.data;
  },
};
