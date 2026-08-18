/** Contenu public par défaut de l’établissement (Mon Ecole). */
export const SCHOOL_DEFAULTS = {
  shortName: 'Mon Ecole',
  fullName: 'Mon Ecole',
  city: '',
  region: '',
  country: "Côte d'Ivoire",
  phone: '',
  phoneTel: '',
  phoneDisplay: '',
  motto: "Former l'homme aujourd'hui, c'est bâtir la société de demain.",
  mottoShort: "Former aujourd'hui, c'est bâtir la société de demain.",
  valuesLine: 'Science · Humanisme · Excellence',
  tagline: 'Excellence éducative et innovation',
  /** Code officiel MENA (bulletins, documents administratifs) */
  establishmentCode: '',
  intro:
    'Mon Ecole incarne l’excellence éducative et l’innovation. Engagé à offrir une formation de qualité, l’établissement favorise l’épanouissement intellectuel et personnel des élèves, les préparant à devenir des leaders compétents et responsables de demain.',
  mission:
    'Offrir une éducation de qualité, dans un cadre structuré, moderne et orienté vers la réussite.',
} as const;

export function getGoogleMapsSearchUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function getSchoolMapsQuery(address?: string | null): string {
  const custom = address?.trim();
  if (custom) return custom;
  const parts = [SCHOOL_DEFAULTS.fullName, SCHOOL_DEFAULTS.city, SCHOOL_DEFAULTS.country].filter(
    Boolean
  );
  return parts.join(', ');
}

export const SCHOOL_OPENING_HOURS = [
  { day: 'Lundi', hours: '07:00 – 17:00' },
  { day: 'Mardi', hours: '07:00 – 17:00' },
  { day: 'Mercredi', hours: '07:00 – 12:00' },
  { day: 'Jeudi', hours: '07:00 – 17:00' },
  { day: 'Vendredi', hours: '07:00 – 17:00' },
] as const;

export const SCHOOL_MARQUEE = [
  'Excellence éducative',
  'Cadre structuré & moderne',
  'Vie scolaire exigeante',
  'Partenariat avec les familles',
  'Discipline & accompagnement',
  'Orientation réussite',
] as const;

export const SCHOOL_VALUES = [
  {
    title: 'Excellence & innovation',
    text: 'Une pédagogie exigeante et moderne pour révéler le plein potentiel de chaque élève.',
    icon: 'award' as const,
  },
  {
    title: 'Épanouissement global',
    text: 'Intellectuel et personnel : former des citoyens compétents, responsables et confiants.',
    icon: 'heart' as const,
  },
  {
    title: 'Vie scolaire',
    text: 'Discipline, accompagnement et écoute au quotidien pour un climat de travail serein.',
    icon: 'shield' as const,
  },
  {
    title: 'Parents partenaires',
    text: 'Votre suivi et votre collaboration sont essentiels à la réussite de vos enfants.',
    icon: 'users' as const,
  },
] as const;

export const SCHOOL_NEWS = [
  {
    date: '19 janv. 2026',
    title: 'En route pour une nouvelle semaine',
    excerpt:
      'Une nouvelle semaine porteuse de défis à relever, de savoirs à acquérir et de réussites à construire. Chaque effort compte.',
    image: '/home/news-semaine.jpg',
    imageAlt: 'Élèves arrivant dans la cour pour une nouvelle semaine',
  },
  {
    date: '1 janv. 2026',
    title: 'Vœux du Nouvel An',
    excerpt:
      'Meilleurs vœux aux parents, élèves, enseignants et partenaires. Poursuivons notre engagement pour une éducation de qualité.',
    image: '/home/news-voeux.jpg',
    imageAlt: 'Communauté scolaire réunie pour les vœux de l’année',
  },
  {
    date: '18 déc. 2025',
    title: 'Journée portes ouvertes',
    excerpt:
      'Dialogue parents–enseignants et distribution des bulletins. Ensemble, préparons l’avenir de nos élèves.',
    image: '/home/news-portes-ouvertes.jpg',
    imageAlt: 'Parents et enseignants réunis lors des portes ouvertes',
  },
  {
    date: '29 nov. 2025',
    title: 'Notre mission',
    excerpt:
      "Former aujourd'hui, c'est bâtir la société de demain : un cadre structuré, moderne et orienté vers la réussite scolaire.",
    image: '/home/news-mission.jpg',
    imageAlt: 'Élèves et enseignant sur les marches de l’établissement',
  },
] as const;

export const SCHOOL_STATS = [
  { n: '07h–17h', l: 'accueil', d: 'lun. – ven. (sauf mer.)' },
  { n: '1', l: 'établissement', d: 'Mon Ecole' },
  { n: '∞', l: 'ambition', d: 'réussite & valeurs' },
] as const;
