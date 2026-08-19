import type { PortalModuleCategory } from '@/components/dashboard/PortalModulesHub';

export const TEACHER_MODULE_CATEGORIES: PortalModuleCategory[] = [
  {
    title: 'Profil & organisation',
    moduleIds: ['profile', 'schedule', 'subjects', 'evaluation', 'leaves'],
  },
  {
    title: 'Pédagogie & classes',
    moduleIds: ['courses', 'grades', 'assignments', 'attendance', 'lesson-logs', 'conduct', 'validations'],
  },
  {
    title: 'Communication',
    moduleIds: ['appointments', 'messaging'],
  },
  {
    title: 'Ressources numériques',
    moduleIds: ['digital-library', 'elearning', 'mock-exams'],
  },
];

export const STUDENT_MODULE_CATEGORIES: PortalModuleCategory[] = [
  {
    title: 'Mon dossier',
    moduleIds: ['profile', 'academic-history', 'identity-documents'],
  },
  {
    title: 'Scolarité',
    moduleIds: ['grades', 'report-cards', 'schedule', 'absences', 'assignments', 'lesson-logs', 'conduct'],
  },
  {
    title: 'Parcours & orientation',
    moduleIds: ['extracurricular', 'orientation', 'reenrollment'],
  },
  {
    title: 'Services & ressources',
    moduleIds: ['payments', 'campus', 'messages', 'digital-library', 'elearning', 'mock-exams'],
  },
];

export const PARENT_MODULE_CATEGORIES: PortalModuleCategory[] = [
  {
    title: 'Compte & école',
    moduleIds: ['notifications', 'communication', 'appointments', 'family', 'children'],
  },
  {
    title: 'Suivi de l’enfant',
    hint: 'Sélectionnez un enfant si nécessaire',
    moduleIds: [
      'grades',
      'absences',
      'reenrollment',
      'assignments',
      'lesson-logs',
      'schedule',
      'report-cards',
      'conduct',
      'health',
    ],
  },
  {
    title: 'Parcours & finances',
    moduleIds: ['extracurricular', 'campus', 'orientation', 'payments'],
  },
  {
    title: 'Ressources numériques',
    hint: 'Consultation (lecture)',
    moduleIds: ['digital-library', 'elearning', 'mock-exams'],
  },
];

export const EDUCATOR_MODULE_CATEGORIES: PortalModuleCategory[] = [
  {
    title: 'Communauté scolaire',
    moduleIds: ['students', 'teachers', 'parents', 'messaging'],
  },
  {
    title: 'Vie scolaire',
    moduleIds: ['schedule', 'attendance', 'conduct', 'discipline', 'validations'],
  },
];

/** Modules prioritaires pour la direction (hors système). */
export const DIRECTOR_MODULE_CATEGORIES: PortalModuleCategory[] = [
  {
    title: 'Pilotage & indicateurs',
    moduleIds: ['activities', 'notifications', 'analytics', 'reports', 'administrative'],
  },
  {
    title: 'Pédagogie & élèves',
    moduleIds: [
      'students',
      'alumni',
      'classes',
      'academic',
      'grading',
      'exams',
      'pedagogical',
      'discipline',
      'extracurricular',
      'campus',
      'orientation',
      'calendar',
      'schedule',
      'attendance',
      'certificates',
    ],
  },
  {
    title: 'Finances & inscriptions',
    moduleIds: ['admissions', 'fees', 'tuition-fees', 'scholarships', 'payments', 'accounting'],
  },
  {
    title: 'Personnel & communication',
    moduleIds: ['teachers', 'staff-personnel', 'parent-guardians', 'hr', 'training', 'communication'],
  },
];
