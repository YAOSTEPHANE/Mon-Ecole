import api from './client';

/** Formulaire public de pré-inscription et suivi de dossier (sans compte) */
export const publicApi = {
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
};
