import api from './client';

/** Formulaire public de pré-inscription et suivi de dossier (sans compte) */
export const publicApi = {
  /** Enregistre une page vue (visiteur anonyme via cookie). */
  trackPublicPageView: async (data: {
    pageUrl: string;
    referrerUrl?: string | null;
    language?: string | null;
    timezone?: string | null;
    screen?: string | null;
    userAgent?: string | null;
  }) => {
    const response = await api.post("/public/visitors/page-view", data);
    return response.data;
  },
  /** Soumission du formulaire Contact (lead anonyme). */
  submitContactLead: async (data: {
    name: string;
    email: string;
    subject: string;
    message: string;
    phone?: string | null;
  }) => {
    const response = await api.post("/public/leads/contact", data);
    return response.data;
  },
  submitAdmission: async (data: FormData | Record<string, unknown>, schoolSlug?: string) => {
    const response = await api.post('/public/admissions', data, {
      params: schoolSlug?.trim() ? { school: schoolSlug.trim() } : undefined,
    });
    return response.data;
  },
  trackAdmission: async (reference: string) => {
    const response = await api.get(
      `/public/admissions/track/${encodeURIComponent(reference.trim())}`
    );
    return response.data;
  },
  /** Carte étudiant affichée via lien / QR (sans authentification, identifiant opaque). */
  getStudentCardByPublicId: async (publicId: string) => {
    const response = await api.get(
      `/public/student-card/${encodeURIComponent(publicId.trim())}`
    );
    return response.data;
  },
  /** Logos et titres d’application (lecture publique pour la page de connexion et le layout). */
  getAppBranding: async (params?: { school?: string }) => {
    const response = await api.get('/public/app-branding', { params });
    return response.data;
  },
  listSchools: async () => {
    const response = await api.get('/public/schools');
    return response.data;
  },
  getFneOptions: async (params?: { cycle?: 'secondary' | 'primary'; school?: string }) => {
    const response = await api.get('/public/fne-options', { params });
    return response.data;
  },
  lookupFneMatricule: async (data: {
    cycle?: 'secondary' | 'primary';
    annee: string;
    nom: string;
    prenoms?: string;
    datenaiss?: string;
    etablissement?: string;
  }) => {
    const response = await api.post('/public/fne-lookup', data);
    return response.data;
  },
  createPublicChatThread: async () => {
    const response = await api.post<{ threadId: string }>('/public/chat/threads');
    return response.data;
  },
  getPublicChatMessages: async (threadId: string, limit = 50) => {
    const response = await api.get<{ messages: Array<{
      id: string;
      senderType: string;
      senderVisitorId: string | null;
      content: string;
      createdAt: string;
    }> }>(
      `/public/chat/threads/${encodeURIComponent(threadId)}/messages`,
      { params: { limit } },
    );
    return response.data;
  },
  sendPublicChatMessage: async (threadId: string, content: string) => {
    const response = await api.post<{
      message: { id: string; content: string; createdAt: string; senderType: string };
    }>(`/public/chat/threads/${encodeURIComponent(threadId)}/messages`, { content });
    return response.data;
  },
  submitPublicRecommendationRequest: async (data: {
    criteria: Record<string, unknown>;
    result?: Record<string, unknown> | null;
  }) => {
    const response = await api.post<{ requestId: string; threadId: string }>(
      '/public/recommendations/requests',
      data,
    );
    return response.data;
  },
  getAcademicResults: async (params?: { school?: string }) => {
    const response = await api.get('/public/academic-results', { params });
    return response.data as {
      academicYear: string;
      examStats: Array<{
        id: string;
        examKind: string;
        examLabel: string;
        academicYear: string;
        candidates: number | null;
        admitted: number | null;
        passRate: number;
      }>;
      honorRoll: {
        academicYear: string;
        period: string;
        periodLabel: string;
        students: Array<{
          classId: string;
          className: string;
          classLevel: string;
          firstName: string;
          lastName: string;
          average: number;
          photoUrl: string | null;
          isPlaceholder?: boolean;
        }>;
      } | null;
    };
  },
  /** Liste publique des examens blancs (sans questions). */
  getMockExams: async (params?: { school?: string; academicYear?: string }) => {
    const response = await api.get('/public/mock-exams', { params });
    return response.data as {
      academicYear: string;
      exams: Array<{
        id: string;
        title: string;
        description: string | null;
        subject: string | null;
        examKind: string;
        academicYear: string;
        targetLevels: string[];
        durationMinutes: number | null;
        startsAt: string | null;
        endsAt: string | null;
        class: { name: string; level: string } | null;
      }>;
    };
  },
  /** Recherche publique des notes d’examens blancs (bulletin). */
  lookupMockExamResults: async (data: {
    firstName: string;
    lastName: string;
    matricule: string;
    academicYear?: string;
    school?: string;
  }) => {
    const response = await api.post('/public/mock-exam-results-lookup', data, {
      params: data.school?.trim() ? { school: data.school.trim() } : undefined,
    });
    return response.data as {
      student: {
        firstName: string;
        lastName: string;
        studentId: string;
        className: string | null;
        classLevel: string | null;
      };
      academicYear: string;
      averageOn20: number | null;
      lines: Array<{
        examId: string;
        title: string;
        subject: string | null;
        examKind: string;
        scoreOn20: number;
        passed: boolean | null;
        submittedAt: string | null;
        attemptsCount: number;
      }>;
    };
  },
};
