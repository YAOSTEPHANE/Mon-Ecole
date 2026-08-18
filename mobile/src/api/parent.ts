import api from './client';

export function asList<T>(data: unknown, keys: string[] = ['items', 'data', 'results']): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object') {
    const rec = data as Record<string, unknown>;
    for (const key of keys) {
      if (Array.isArray(rec[key])) return rec[key] as T[];
    }
  }
  return [];
}

export type ParentChild = {
  id: string;
  studentId?: string | null;
  studentNumber?: string | null;
  relation?: string | null;
  class?: { id?: string; name?: string | null; level?: string | null } | null;
  user?: {
    firstName?: string | null;
    lastName?: string | null;
    avatar?: string | null;
    email?: string | null;
  };
};

export type ParentGradesResponse = {
  grades: StudentGradeLike[];
  tuitionBlock?: { hiddenAcademicYears?: string[]; active?: boolean };
};

type StudentGradeLike = {
  id?: string;
  course?: { id?: string | null; name?: string | null } | null;
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

export type ParentAbsence = {
  id: string;
  course?: { id?: string | null; name?: string | null } | null;
  date: string;
  excused?: boolean;
  status?: string | null;
  message?: string | null;
};

export type ParentPayment = {
  id?: string;
  amount?: number;
  status?: string | null;
  paymentMethod?: string | null;
  createdAt?: string;
  tuitionFee?: { period?: string | null; academicYear?: string | null } | null;
};

export type ParentDailyPresence = {
  id?: string;
  date: string;
  status?: string;
  presentCount?: number;
  absentCount?: number;
};

export type ParentTuitionFee = {
  id: string;
  amount: number;
  dueDate?: string | null;
  period?: string | null;
  academicYear?: string | null;
  isPaid?: boolean;
  totalPaid?: number;
  remainingAmount?: number;
  paymentProgress?: number;
};

export type AbsencePermissionRequest = {
  id: string;
  startDate: string;
  endDate: string;
  motif: string;
  reasonDetail?: string | null;
  status: string;
  adminComment?: string | null;
  createdAt?: string;
};

export type ParentAppointment = {
  id: string;
  status: string;
  scheduledStart: string;
  durationMinutes: number;
  topic?: string | null;
  notesParent?: string | null;
  declineReason?: string | null;
  teacher?: { user?: { firstName?: string | null; lastName?: string | null } | null };
  student?: {
    user?: { firstName?: string | null; lastName?: string | null } | null;
    class?: { name?: string | null } | null;
  };
};

export type MessageThread = {
  threadKey: string;
  lastAt: string;
  lastPreview: string;
  peerId: string;
  peerName: string;
  peerRole: string;
  unread: number;
};

export type SchoolMessage = {
  id: string;
  subject?: string | null;
  content: string;
  category?: string | null;
  createdAt: string;
  senderId?: string;
  receiverId?: string;
  read?: boolean;
  sender?: { firstName?: string | null; lastName?: string | null; role?: string | null };
};

export type PortalFeedItem = {
  id?: string;
  type?: string;
  title?: string;
  content?: string | null;
  body?: string | null;
  date?: string;
  startAt?: string;
  publishedAt?: string;
  createdAt?: string;
};

export const parentApi = {
  getChildren: async () => {
    const { data } = await api.get('/parent/children');
    return asList<ParentChild>(data);
  },

  getDashboardKpis: async () => {
    const { data } = await api.get('/parent/dashboard/kpis');
    return data as {
      cards?: {
        childrenCount?: number;
        tuitionUnpaidAmount?: number;
        tuitionUnpaidCount?: number;
        pendingAppointments?: number;
        unreadNotifications?: number;
      };
      charts?: { averageByChild?: Array<{ studentId: string; name?: string; average?: number }> };
    };
  },

  getPortalFeed: async () => {
    const { data } = await api.get('/parent/portal-feed');
    return asList<PortalFeedItem>(data, ['items', 'announcements', 'events', 'news']);
  },

  getAnnouncements: async () => {
    const { data } = await api.get('/parent/announcements');
    return asList<PortalFeedItem>(data);
  },

  getSchoolCalendarEvents: async () => {
    const { data } = await api.get('/parent/school-calendar-events');
    return asList<PortalFeedItem>(data);
  },

  getChildGrades: async (studentId: string) => {
    const { data } = await api.get(`/parent/children/${studentId}/grades`);
    const maybe = data as Record<string, unknown>;
    const grades = asList<StudentGradeLike>(maybe?.grades ?? data);
    const tuitionBlock = maybe?.tuitionBlock as ParentGradesResponse['tuitionBlock'] | undefined;
    return { grades, tuitionBlock } as ParentGradesResponse;
  },

  getChildAbsences: async (studentId: string) => {
    const { data } = await api.get(`/parent/children/${studentId}/absences`);
    return asList<ParentAbsence>(data);
  },

  getChildDailyPresence: async (studentId: string, params?: { limit?: number }) => {
    const { data } = await api.get(`/parent/children/${studentId}/daily-presence`, { params });
    return asList<ParentDailyPresence>(data);
  },

  getChildAbsencePermissionRequests: async (studentId: string) => {
    const { data } = await api.get(`/parent/children/${studentId}/absence-permission-requests`);
    return asList<AbsencePermissionRequest>(data);
  },

  createChildAbsencePermissionRequest: async (
    studentId: string,
    payload: {
      startDate: string;
      endDate: string;
      motif: 'MEDICAL' | 'FAMILIAL' | 'OTHER';
      reasonDetail: string;
      justificationDocuments?: string[];
    },
  ) => {
    const { data } = await api.post(`/parent/children/${studentId}/absence-permission-requests`, payload);
    return data;
  },

  getChildPayments: async (studentId: string) => {
    const { data } = await api.get(`/parent/children/${studentId}/payments`);
    return asList<ParentPayment>(data);
  },

  getChildPayment: async (studentId: string, paymentId: string) => {
    const { data } = await api.get(`/parent/children/${studentId}/payments/${paymentId}`);
    return data as ParentPayment & { checkoutUrl?: string | null; receiptUrl?: string | null };
  },

  getChildTuitionFees: async (studentId: string) => {
    const { data } = await api.get(`/parent/children/${studentId}/tuition-fees`);
    return asList<ParentTuitionFee>(data);
  },

  getPaymentSettings: async () => {
    const { data } = await api.get('/parent/payment-settings');
    return data as { defaultCountryCode?: string };
  },

  createPayment: async (
    studentId: string,
    payload: {
      tuitionFeeId: string;
      paymentMethod: string;
      amount: number;
      phoneNumber?: string;
      operator?: string;
      transactionCode?: string;
      accountNumber?: string;
      reference?: string;
    },
  ) => {
    const { data } = await api.post(`/parent/children/${studentId}/payments`, payload);
    return data as {
      payment?: { id?: string; paymentMethod?: string; status?: string };
      checkoutUrl?: string | null;
      provider?: string | null;
      mode?: 'live' | 'sandbox' | null;
      ussdHint?: string | null;
      message?: string;
    };
  },

  getChildAssignments: async (studentId: string) => {
    const { data } = await api.get(`/parent/children/${studentId}/assignments`);
    return asList<Record<string, unknown>>(data);
  },

  getChildLessonLogs: async (studentId: string) => {
    const { data } = await api.get(`/parent/children/${studentId}/lesson-logs`);
    return asList<Record<string, unknown>>(data);
  },

  getChildSchedule: async (studentId: string) => {
    const { data } = await api.get(`/parent/children/${studentId}/schedule`);
    return asList<Record<string, unknown>>(data);
  },

  getChildReportCards: async (studentId: string) => {
    const { data } = await api.get(`/parent/children/${studentId}/report-cards`);
    const rec = data as Record<string, unknown>;
    const reportCards = asList<Record<string, unknown>>(rec?.reportCards ?? data);
    return {
      reportCards,
      tuitionBlock: rec?.tuitionBlock as { hiddenAcademicYears?: string[]; active?: boolean } | undefined,
    };
  },

  getChildOfficialReportCard: async (studentId: string, reportCardId: string) => {
    const { data } = await api.get(
      `/parent/children/${studentId}/report-cards/${reportCardId}/official`,
    );
    return data as {
      periodKey?: string;
      periodLabel?: string;
      academicYear?: string;
      comments?: string | null;
      student?: {
        average?: number;
        rank?: number;
        absences?: { total?: number; late?: number; excused?: number; unexcused?: number };
        allCourses?: Array<{ id: string; name: string; teacherName?: string }>;
        courseAverages?: Record<string, { average?: number }>;
      };
    };
  },

  acknowledgeReportCard: async (studentId: string, reportCardId: string, signature: string) => {
    const { data } = await api.post(
      `/parent/children/${studentId}/report-cards/${reportCardId}/acknowledge`,
      { signature },
    );
    return data;
  },

  getChildConduct: async (studentId: string) => {
    const { data } = await api.get(`/parent/children/${studentId}/conduct`);
    return asList<Record<string, unknown>>(data);
  },

  getDisciplineRulebook: async () => {
    const { data } = await api.get('/parent/discipline/rulebook');
    return data as Record<string, unknown> | Record<string, unknown>[];
  },

  getChildDisciplineRecords: async (studentId: string) => {
    const { data } = await api.get(`/parent/children/${studentId}/discipline-records`);
    return asList<Record<string, unknown>>(data);
  },

  getChildReenrollmentOptions: async (studentId: string) => {
    const { data } = await api.get(`/parent/children/${studentId}/reenrollment-options`);
    return data as {
      targetAcademicYear?: string;
      classes?: Array<{ id: string; name: string; level?: string }>;
    };
  },

  getChildReenrollmentRequests: async (studentId: string) => {
    const { data } = await api.get(`/parent/children/${studentId}/reenrollment-requests`);
    return asList<Record<string, unknown>>(data);
  },

  createChildReenrollmentRequest: async (
    studentId: string,
    payload: { targetAcademicYear: string; preferredClassId?: string; message?: string },
  ) => {
    const { data } = await api.post(`/parent/children/${studentId}/reenrollment-requests`, payload);
    return data;
  },

  cancelChildReenrollmentRequest: async (studentId: string, id: string) => {
    const { data } = await api.patch(`/parent/children/${studentId}/reenrollment-requests/${id}/cancel`);
    return data;
  },

  getAppointments: async () => {
    const { data } = await api.get('/parent/appointments');
    return asList<ParentAppointment>(data);
  },

  getAppointmentTeachers: async (studentId: string) => {
    const { data } = await api.get(`/parent/appointment-teachers/${studentId}`);
    return asList<{
      teacherId: string;
      label?: string;
      firstName?: string;
      lastName?: string;
      email?: string | null;
    }>(data);
  },

  createAppointment: async (payload: {
    studentId: string;
    teacherId: string;
    scheduledStart: string;
    durationMinutes?: number;
    topic?: string;
    notesParent?: string;
  }) => {
    const { data } = await api.post('/parent/appointments', payload);
    return data;
  },

  cancelParentAppointment: async (appointmentId: string) => {
    const { data } = await api.put(`/parent/appointments/${appointmentId}/cancel`);
    return data;
  },

  rescheduleParentAppointment: async (
    appointmentId: string,
    payload: { scheduledStart: string; durationMinutes?: number },
  ) => {
    const { data } = await api.put(`/parent/appointments/${appointmentId}/reschedule`, payload);
    return data;
  },

  getMessageThreads: async () => {
    const { data } = await api.get('/parent/messages/threads');
    return asList<MessageThread>(data, ['threads', 'items', 'data']);
  },

  getMessageThread: async (threadKey: string) => {
    const { data } = await api.get('/parent/messages/thread', { params: { threadKey } });
    return asList<SchoolMessage>(data, ['messages', 'items', 'data']);
  },

  getMessageContacts: async () => {
    const { data } = await api.get('/parent/messages/contacts');
    return data as unknown;
  },

  sendSchoolMessage: async (payload: {
    subject?: string;
    content: string;
    category?: string;
    studentId?: string;
    receiverId?: string;
    threadKey?: string;
  }) => {
    const { data } = await api.post('/parent/messages', payload);
    return data;
  },

  markMessageAsRead: async (messageId: string) => {
    const { data } = await api.put(`/parent/messages/${messageId}/read`);
    return data;
  },

  getChildExtracurricularOfferings: async (studentId: string) => {
    const { data } = await api.get(`/parent/children/${studentId}/extracurricular-offerings`);
    return asList<Record<string, unknown>>(data);
  },

  getChildExtracurricularRegistrations: async (studentId: string) => {
    const { data } = await api.get(`/parent/children/${studentId}/extracurricular-registrations`);
    return asList<Record<string, unknown>>(data);
  },

  createChildExtracurricularRegistration: async (studentId: string, offeringId: string) => {
    const { data } = await api.post(`/parent/children/${studentId}/extracurricular-registrations`, {
      offeringId,
    });
    return data;
  },

  deleteChildExtracurricularRegistration: async (studentId: string, regId: string) => {
    const { data } = await api.delete(
      `/parent/children/${studentId}/extracurricular-registrations/${regId}`,
    );
    return data;
  },

  getCanteenPlans: async (studentId: string) => {
    const { data } = await api.get(`/parent/children/${studentId}/campus/canteen-plans`);
    return asList<Record<string, unknown>>(data);
  },

  getCanteenSubscriptions: async (studentId: string) => {
    const { data } = await api.get(`/parent/children/${studentId}/campus/canteen-subscriptions`);
    return asList<Record<string, unknown>>(data);
  },

  subscribeCanteen: async (studentId: string, planId: string) => {
    const { data } = await api.post(`/parent/children/${studentId}/campus/canteen-subscriptions`, {
      planId,
    });
    return data;
  },

  getTransportRoutes: async (studentId: string) => {
    const { data } = await api.get(`/parent/children/${studentId}/campus/transport-routes`);
    return asList<Record<string, unknown>>(data);
  },

  getTransportSubscriptions: async (studentId: string) => {
    const { data } = await api.get(`/parent/children/${studentId}/campus/transport-subscriptions`);
    return asList<Record<string, unknown>>(data);
  },

  subscribeTransport: async (studentId: string, payload: { routeId: string; stopLabel?: string }) => {
    const { data } = await api.post(
      `/parent/children/${studentId}/campus/transport-subscriptions`,
      payload,
    );
    return data;
  },

  getTransportTracking: async (studentId: string, routeId: string) => {
    const { data } = await api.get(
      `/parent/children/${studentId}/campus/transport-routes/${routeId}/tracking`,
    );
    return data as Record<string, unknown>;
  },

  getOrientationCatalog: async () => {
    const { data } = await api.get('/parent/orientation/catalog');
    return (data ?? {
      filieres: [],
      partnerships: [],
      aptitudeTests: [],
      advice: [],
    }) as {
      filieres?: Record<string, unknown>[];
      partnerships?: Record<string, unknown>[];
      aptitudeTests?: Record<string, unknown>[];
      advice?: Record<string, unknown>[];
    };
  },

  getChildOrientationFollowUps: async (studentId: string) => {
    const { data } = await api.get(`/parent/children/${studentId}/orientation/follow-ups`);
    return asList<Record<string, unknown>>(data);
  },

  getChildOrientationPlacements: async (studentId: string) => {
    const { data } = await api.get(`/parent/children/${studentId}/orientation/placements`);
    return asList<Record<string, unknown>>(data);
  },

  getMyProfile: async () => {
    const { data } = await api.get('/parent/my-profile');
    return data as Record<string, unknown>;
  },

  updateMyProfile: async (payload: {
    profession?: string | null;
    preferredLocale?: string | null;
    notifyEmail?: boolean;
    notifySms?: boolean;
    portalShowFees?: boolean;
    portalShowGrades?: boolean;
    portalShowAttendance?: boolean;
  }) => {
    const { data } = await api.put('/parent/my-profile', payload);
    return data;
  },

  addMyContact: async (payload: { label: string; phone?: string | null; email?: string | null }) => {
    const { data } = await api.post('/parent/my-contacts', payload);
    return data;
  },

  deleteMyContact: async (contactId: string) => {
    const { data } = await api.delete(`/parent/my-contacts/${contactId}`);
    return data;
  },

  upsertMyConsent: async (payload: {
    studentId?: string | null;
    consentType: string;
    granted: boolean;
    notes?: string | null;
  }) => {
    const { data } = await api.post('/parent/my-consents/upsert', payload);
    return data;
  },

  addChildPickupAuthorization: async (
    studentId: string,
    payload: {
      authorizedName: string;
      relationship?: string | null;
      phone?: string | null;
    },
  ) => {
    const { data } = await api.post(`/parent/children/${studentId}/pickup-authorizations`, payload);
    return data;
  },

  deleteChildPickupAuthorization: async (studentId: string, pickupId: string) => {
    const { data } = await api.delete(
      `/parent/children/${studentId}/pickup-authorizations/${pickupId}`,
    );
    return data;
  },
};
