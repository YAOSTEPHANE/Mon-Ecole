import api from './client';

export const parentApi = {
  getChildren: async () => {
    const response = await api.get('/parent/children');
    return response.data;
  },
  getDashboardKpis: async () => {
    const response = await api.get('/parent/dashboard/kpis');
    return response.data;
  },
  getChildTuitionFees: async (studentId: string) => {
    const response = await api.get(`/parent/children/${studentId}/tuition-fees`);
    return response.data;
  },
  createPayment: async (
    studentId: string,
    tuitionFeeId: string,
    paymentMethod: string,
    amount: number,
    phoneNumber?: string,
    operator?: string,
    transactionCode?: string,
    accountNumber?: string,
    reference?: string,
  ) => {
    const response = await api.post(`/parent/children/${studentId}/payments`, {
      tuitionFeeId,
      paymentMethod,
      amount,
      phoneNumber,
      operator,
      transactionCode,
      accountNumber,
      reference,
    });
    return response.data as {
      payment?: { id?: string; paymentMethod?: string; status?: string };
      checkoutUrl?: string | null;
      provider?: string | null;
      mode?: 'live' | 'sandbox' | null;
      ussdHint?: string | null;
      message?: string;
    };
  },
  getChildPayment: async (studentId: string, paymentId: string) => {
    const response = await api.get(`/parent/children/${studentId}/payments/${paymentId}`);
    return response.data as {
      id: string;
      status: string;
      amount: number;
      paymentMethod?: string | null;
      checkoutUrl?: string | null;
      receiptUrl?: string | null;
      receiptNumber?: string | null;
      paymentReference?: string | null;
      paidAt?: string | null;
    };
  },
  getPaymentSettings: async () => {
    const response = await api.get('/parent/payment-settings');
    return response.data as { defaultCountryCode: string };
  },
  getChildPayments: async (studentId: string) => {
    const response = await api.get(`/parent/children/${studentId}/payments`);
    return response.data;
  },
  getChildGrades: async (studentId: string) => {
    const response = await api.get(`/parent/children/${studentId}/grades`);
    return response.data;
  },
  getChildAbsences: async (studentId: string) => {
    const response = await api.get(`/parent/children/${studentId}/absences`);
    return response.data;
  },
  getChildDailyPresence: async (studentId: string, params?: { limit?: number }) => {
    const response = await api.get(`/parent/children/${studentId}/daily-presence`, { params });
    return response.data;
  },
  getChildAbsencePermissionRequests: async (studentId: string) => {
    const response = await api.get(`/parent/children/${studentId}/absence-permission-requests`);
    return response.data;
  },
  createChildAbsencePermissionRequest: async (
    studentId: string,
    data: {
      startDate: string;
      endDate: string;
      motif: 'MEDICAL' | 'FAMILIAL' | 'OTHER';
      reasonDetail: string;
      justificationDocuments?: string[];
    }
  ) => {
    const response = await api.post(`/parent/children/${studentId}/absence-permission-requests`, data);
    return response.data;
  },
  getChildReenrollmentOptions: async (studentId: string) => {
    const response = await api.get(`/parent/children/${studentId}/reenrollment-options`);
    return response.data;
  },
  getChildReenrollmentRequests: async (studentId: string) => {
    const response = await api.get(`/parent/children/${studentId}/reenrollment-requests`);
    return response.data;
  },
  createChildReenrollmentRequest: async (
    studentId: string,
    data: {
      targetAcademicYear: string;
      preferredClassId?: string;
      message?: string;
    }
  ) => {
    const response = await api.post(`/parent/children/${studentId}/reenrollment-requests`, data);
    return response.data;
  },
  cancelChildReenrollmentRequest: async (studentId: string, id: string) => {
    const response = await api.patch(
      `/parent/children/${studentId}/reenrollment-requests/${id}/cancel`
    );
    return response.data;
  },
  getChildSchedule: async (studentId: string) => {
    const response = await api.get(`/parent/children/${studentId}/schedule`);
    return response.data;
  },
  getChildAssignments: async (studentId: string) => {
    const response = await api.get(`/parent/children/${studentId}/assignments`);
    return response.data;
  },
  getChildReportCards: async (studentId: string) => {
    const response = await api.get(`/parent/children/${studentId}/report-cards`);
    return response.data;
  },
  getChildOfficialReportCard: async (studentId: string, reportCardId: string) => {
    const response = await api.get(
      `/parent/children/${studentId}/report-cards/${reportCardId}/official`,
    );
    return response.data;
  },
  acknowledgeReportCard: async (
    studentId: string,
    reportCardId: string,
    signature: string
  ) => {
    const response = await api.post(
      `/parent/children/${studentId}/report-cards/${reportCardId}/acknowledge`,
      { signature }
    );
    return response.data;
  },
  getChildConduct: async (studentId: string, params?: { period?: string; academicYear?: string }) => {
    const response = await api.get(`/parent/children/${studentId}/conduct`, { params });
    return response.data;
  },
  getMessages: async (params?: { unread?: boolean }) => {
    const response = await api.get('/parent/messages', { params });
    return response.data;
  },
  getMessageThreads: async () => {
    const response = await api.get('/parent/messages/threads');
    return response.data;
  },
  getMessageThread: async (threadKey: string) => {
    const response = await api.get('/parent/messages/thread', { params: { threadKey } });
    return response.data;
  },
  getMessageContacts: async () => {
    const response = await api.get('/parent/messages/contacts');
    return response.data;
  },
  sendSchoolMessage: async (data: {
    subject?: string;
    content: string;
    category?: string;
    studentId?: string;
    receiverId?: string;
    threadKey?: string;
    attachmentUrls?: string[];
  }) => {
    const response = await api.post('/parent/messages', data);
    return response.data;
  },
  markMessageAsRead: async (messageId: string) => {
    const response = await api.put(`/parent/messages/${messageId}/read`);
    return response.data;
  },
  getNotifications: async () => {
    const response = await api.get('/parent/notifications');
    return response.data;
  },
  markNotificationAsRead: async (notificationId: string) => {
    const response = await api.put(`/parent/notifications/${notificationId}/read`);
    return response.data;
  },
  markAllNotificationsAsRead: async () => {
    const response = await api.put('/parent/notifications/read-all');
    return response.data;
  },
  deleteNotification: async (notificationId: string) => {
    const response = await api.delete(`/parent/notifications/${notificationId}`);
    return response.data;
  },
  getAnnouncements: async () => {
    const response = await api.get('/parent/announcements');
    return response.data;
  },
  getSchoolCalendarEvents: async (params?: { academicYear?: string }) => {
    const response = await api.get('/parent/school-calendar-events', { params });
    return response.data;
  },
  getPortalFeed: async (params?: { academicYear?: string }) => {
    const response = await api.get('/parent/portal-feed', { params });
    return response.data;
  },
  getAppointments: async () => {
    const response = await api.get('/parent/appointments');
    return response.data;
  },
  getAppointmentTeachers: async (studentId: string) => {
    const response = await api.get(`/parent/appointment-teachers/${studentId}`);
    return response.data;
  },
  createAppointment: async (data: {
    studentId: string;
    teacherId: string;
    scheduledStart: string;
    durationMinutes?: number;
    topic?: string;
    notesParent?: string;
  }) => {
    const response = await api.post('/parent/appointments', data);
    return response.data;
  },
  cancelParentAppointment: async (appointmentId: string) => {
    const response = await api.put(`/parent/appointments/${appointmentId}/cancel`);
    return response.data;
  },
  rescheduleParentAppointment: async (
    appointmentId: string,
    data: { scheduledStart: string; durationMinutes?: number }
  ) => {
    const response = await api.put(`/parent/appointments/${appointmentId}/reschedule`, data);
    return response.data;
  },
  getDisciplineRulebook: async () => {
    const response = await api.get("/parent/discipline/rulebook");
    return response.data;
  },
  getChildDisciplineRecords: async (studentId: string, params?: { academicYear?: string }) => {
    const response = await api.get(`/parent/children/${studentId}/discipline-records`, { params });
    return response.data;
  },
  getChildExtracurricularOfferings: async (studentId: string, params?: { academicYear?: string }) => {
    const response = await api.get(`/parent/children/${studentId}/extracurricular-offerings`, { params });
    return response.data;
  },
  getChildExtracurricularRegistrations: async (studentId: string, params?: { academicYear?: string }) => {
    const response = await api.get(`/parent/children/${studentId}/extracurricular-registrations`, { params });
    return response.data;
  },
  createChildExtracurricularRegistration: async (studentId: string, offeringId: string) => {
    const response = await api.post(`/parent/children/${studentId}/extracurricular-registrations`, {
      offeringId,
    });
    return response.data;
  },
  deleteChildExtracurricularRegistration: async (studentId: string, regId: string) => {
    const response = await api.delete(
      `/parent/children/${studentId}/extracurricular-registrations/${regId}`
    );
    return response.data;
  },
  getCanteenPlans: async (studentId: string, params?: { academicYear?: string }) => {
    const response = await api.get(`/parent/children/${studentId}/campus/canteen-plans`, { params });
    return response.data;
  },
  getCanteenSubscriptions: async (studentId: string) => {
    const response = await api.get(`/parent/children/${studentId}/campus/canteen-subscriptions`);
    return response.data;
  },
  subscribeCanteen: async (studentId: string, planId: string) => {
    const response = await api.post(`/parent/children/${studentId}/campus/canteen-subscriptions`, {
      planId,
    });
    return response.data;
  },
  getTransportRoutes: async (studentId: string, params?: { academicYear?: string }) => {
    const response = await api.get(`/parent/children/${studentId}/campus/transport-routes`, {
      params,
    });
    return response.data;
  },
  getTransportSubscriptions: async (studentId: string) => {
    const response = await api.get(`/parent/children/${studentId}/campus/transport-subscriptions`);
    return response.data;
  },
  subscribeTransport: async (
    studentId: string,
    data: { routeId: string; stopLabel?: string }
  ) => {
    const response = await api.post(
      `/parent/children/${studentId}/campus/transport-subscriptions`,
      data
    );
    return response.data;
  },
  getTransportTracking: async (studentId: string, routeId: string) => {
    const response = await api.get(
      `/parent/children/${studentId}/campus/transport-routes/${routeId}/tracking`
    );
    return response.data;
  },
  getOrientationCatalog: async (params?: { academicYear?: string }) => {
    const response = await api.get('/parent/orientation/catalog', { params });
    return response.data;
  },
  getChildOrientationFollowUps: async (studentId: string, params?: { academicYear?: string }) => {
    const response = await api.get(`/parent/children/${studentId}/orientation/follow-ups`, { params });
    return response.data;
  },
  getChildOrientationPlacements: async (studentId: string) => {
    const response = await api.get(`/parent/children/${studentId}/orientation/placements`);
    return response.data;
  },
  getChildLessonLogs: async (studentId: string) => {
    const response = await api.get(`/parent/children/${studentId}/lesson-logs`);
    return response.data;
  },
};
