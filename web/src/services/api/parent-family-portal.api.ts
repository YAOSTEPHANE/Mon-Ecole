import api from './client';

/** Profil familial portail parent (fichier séparé pour l’inférence TypeScript). */
export const parentFamilyPortalApi = {
  getMyProfile: async () => {
    const response = await api.get('/parent/my-profile');
    return response.data;
  },
  updateMyProfile: async (data: {
    profession?: string | null;
    preferredLocale?: string | null;
    notifyEmail?: boolean;
    notifySms?: boolean;
    notifyWhatsApp?: boolean;
    portalShowFees?: boolean;
    portalShowGrades?: boolean;
    portalShowAttendance?: boolean;
  }) => {
    const response = await api.put('/parent/my-profile', data);
    return response.data;
  },
  addMyContact: async (data: {
    label: string;
    phone?: string | null;
    email?: string | null;
    sortOrder?: number;
  }) => {
    const response = await api.post('/parent/my-contacts', data);
    return response.data;
  },
  deleteMyContact: async (contactId: string) => {
    const response = await api.delete(`/parent/my-contacts/${contactId}`);
    return response.data;
  },
  upsertMyConsent: async (data: {
    studentId?: string | null;
    consentType: string;
    granted: boolean;
    policyVersion?: string | null;
    notes?: string | null;
  }) => {
    const response = await api.post('/parent/my-consents/upsert', data);
    return response.data;
  },
  addChildPickupAuthorization: async (
    studentId: string,
    data: {
      authorizedName: string;
      relationship?: string | null;
      phone?: string | null;
      identityNote?: string | null;
      validFrom?: string | null;
      validUntil?: string | null;
    }
  ) => {
    const response = await api.post(`/parent/children/${studentId}/pickup-authorizations`, data);
    return response.data;
  },
  deleteChildPickupAuthorization: async (studentId: string, pickupId: string) => {
    const response = await api.delete(`/parent/children/${studentId}/pickup-authorizations/${pickupId}`);
    return response.data;
  },
};
