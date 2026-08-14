/**
 * Catalogue des modules / onglets du tableau de bord administrateur.
 */
export const ADMIN_MODULE_IDS = [
  'dashboard',
  'workspaces',
  'activities',
  'notifications',
  'students',
  'alumni',
  'academic',
  'grading',
  'exams',
  'classes',
  'teachers',
  'educators',
  'staff-personnel',
  'parent-guardians',
  'management',
  'roles',
  'schools',
  'pedagogical',
  'discipline',
  'extracurricular',
  'campus',
  'orientation',
  'calendar',
  'communication',
  'library',
  'health',
  'elearning',
  'material',
  'reports',
  'analytics',
  'schedule',
  'pointage',
  'attendance',
  'hr',
  'training',
  'administrative',
  'certificates',
  'admissions',
  'fees',
  'tuition-fees',
  'scholarships',
  'payments',
  'accounting',
  'nfc-scanner',
  'security',
  'performance',
  'settings',
  'integrations',
] as const;

export type AdminModuleId = (typeof ADMIN_MODULE_IDS)[number];

export const ADMIN_VALID_TAB_IDS = ADMIN_MODULE_IDS;

export const ADMIN_MODULE_LABELS: Record<AdminModuleId, string> = {
  dashboard: 'Tableau de bord',
  workspaces: 'Espaces & modules',
  activities: 'Activités',
  notifications: 'Notifications',
  students: 'Élèves',
  alumni: 'Anciens élèves',
  academic: 'Gestion académique',
  grading: 'Notation & évaluation',
  exams: 'Examens blancs & officiels',
  classes: 'Classes',
  teachers: 'Enseignants',
  educators: 'Éducateurs (voir Personnel)',
  'staff-personnel': 'Personnel',
  'parent-guardians': 'Parents & tuteurs',
  management: 'Gestion complète',
  roles: 'Multi-rôles',
  schools: 'Établissements',
  pedagogical: 'Suivi pédagogique',
  discipline: 'Discipline & règlement',
  extracurricular: 'Activités parascolaires',
  campus: 'Cantine & transport',
  orientation: 'Orientation',
  calendar: 'Calendrier scolaire',
  communication: 'Communication',
  library: 'Bibliothèque',
  health: 'Infirmerie & santé',
  elearning: 'E-learning',
  material: 'Gestion matérielle',
  reports: 'Rapports & statistiques',
  analytics: 'Analytique avancée',
  schedule: 'Emploi du temps',
  pointage: 'Pointage des élèves',
  attendance: 'Gestion des présences',
  hr: 'Ressources humaines',
  training: 'Formation continue',
  administrative: 'Gestion administrative',
  certificates: 'Certificats & attestations',
  admissions: 'Inscriptions & admissions',
  fees: 'Gestion des frais',
  'tuition-fees': 'Frais de scolarité',
  scholarships: 'Bourses & aides',
  payments: 'Paiements',
  accounting: 'Comptabilité',
  'nfc-scanner': "Contrôle d'accès",
  security: 'Sécurité & confidentialité',
  performance: 'Performance & rapidité',
  settings: 'Paramètres',
  integrations: 'Intégrations',
};

export const ADMIN_MODULE_DESCRIPTIONS: Partial<Record<AdminModuleId, string>> = {
  workspaces: 'Créer des espaces et attribuer modules et fonctionnalités aux administrateurs',
  students: 'Dossiers élèves, inscriptions et suivi',
  alumni: 'Élèves archivés, diplômés et réintégration',
  exams: 'Examens blancs BEPC/BAC, questionnaires et sessions',
  calendar: 'Jours fériés, vacances et périodes d’examens',
  certificates: 'Attestations de scolarité, fréquentation et radiation',
  scholarships: 'Bourses, remises et aides à la scolarité',
  training: 'Formations continues des enseignants',
  fees: 'Facturation, encaissements, reçus et relances',
  accounting: 'Grand livre, budget, dépenses et exports',
  security: 'Audit, confidentialité et accès',
  settings: 'Charte graphique et paramètres établissement',
  integrations: 'MENA, NFC, paiements, WhatsApp et e-mail — sans toucher au serveur',
};

export const ADMIN_MODULE_CATEGORIES: {
  title: string;
  hint?: string;
  moduleIds: AdminModuleId[];
}[] = [
  {
    title: 'Pilotage & indicateurs',
    hint: 'Synthèses, alertes et rapports consolidés',
    moduleIds: ['activities', 'notifications', 'analytics', 'reports'],
  },
  {
    title: 'Pédagogique & vie de classe',
    moduleIds: [
      'students',
      'alumni',
      'classes',
      'academic',
      'grading',
      'exams',
      'management',
      'pedagogical',
      'discipline',
      'extracurricular',
      'campus',
      'orientation',
      'calendar',
      'schedule',
      'pointage',
      'attendance',
      'library',
      'certificates',
    ],
  },
  {
    title: 'Personnel & accès',
    moduleIds: ['teachers', 'staff-personnel', 'parent-guardians', 'hr', 'training', 'roles'],
  },
  {
    title: 'Finances, inscriptions & admin',
    moduleIds: [
      'fees',
      'tuition-fees',
      'scholarships',
      'payments',
      'accounting',
      'admissions',
      'administrative',
    ],
  },
  {
    title: 'Communication & matériel',
    moduleIds: ['communication', 'material', 'nfc-scanner', 'health', 'elearning'],
  },
  {
    title: 'Système & conformité',
    moduleIds: ['security', 'performance', 'settings', 'integrations', 'workspaces', 'schools'],
  },
];

export function getAllConfigurableAdminModules(): AdminModuleId[] {
  return ADMIN_MODULE_IDS.filter(
    (id) => id !== 'dashboard' && id !== 'workspaces' && id !== 'schools',
  );
}

export function isAdminModuleId(id: string): id is AdminModuleId {
  return (ADMIN_MODULE_IDS as readonly string[]).includes(id);
}

export function filterTabsByVisibleModules<T extends { id: string }>(
  tabs: T[],
  visibleModules: string[] | undefined,
  options?: { alwaysInclude?: string[] },
): T[] {
  if (!visibleModules || visibleModules.length === 0) return tabs;
  const allowed = new Set(visibleModules);
  const force = new Set(options?.alwaysInclude ?? []);
  return tabs.filter((t) => allowed.has(t.id) || force.has(t.id));
}
