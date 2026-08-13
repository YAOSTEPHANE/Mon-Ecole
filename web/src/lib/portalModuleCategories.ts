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
    moduleIds: ['grades', 'schedule', 'absences', 'assignments', 'lesson-logs', 'conduct'],
  },
  {
    title: 'Parcours & orientation',
    moduleIds: ['extracurricular', 'orientation'],
  },
  {
    title: 'Services & ressources',
    moduleIds: ['payments', 'messages', 'digital-library', 'elearning', 'mock-exams'],
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
      'classes',
      'academic',
      'grading',
      'pedagogical',
      'discipline',
      'extracurricular',
      'campus',
      'orientation',
      'schedule',
      'attendance',
    ],
  },
  {
    title: 'Finances & inscriptions',
    moduleIds: ['admissions', 'fees', 'tuition-fees', 'payments', 'accounting'],
  },
  {
    title: 'Personnel & communication',
    moduleIds: ['teachers', 'staff-personnel', 'parent-guardians', 'hr', 'communication'],
  },
];
