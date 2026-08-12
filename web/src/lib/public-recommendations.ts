import { ADMISSION_SECONDARY_LEVELS } from '@/utils/admissionGrades';

export const PUBLIC_RECO_INTERESTS = [
  { id: 'sciences', label: 'Sciences & maths' },
  { id: 'literary', label: 'Littéraire & langues' },
  { id: 'arts', label: 'Arts & créativité' },
  { id: 'sport', label: 'Sport & vie scolaire' },
  { id: 'digital', label: 'Numérique & technologie' },
] as const;

export type PublicRecoInterestId = (typeof PUBLIC_RECO_INTERESTS)[number]['id'];

export type PublicRecoIntent = 'info' | 'pre_inscription' | 'orientation';

export type PublicRecoCriteria = {
  currentLevel: string;
  interests: PublicRecoInterestId[];
  intent: PublicRecoIntent;
};

export type PublicRecoNextStep = {
  label: string;
  href: string;
};

export type PublicRecoResult = {
  summary: string;
  suggestions: string[];
  nextSteps: PublicRecoNextStep[];
};

function normLevel(level: string): string {
  return level
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function isCollege(level: string): boolean {
  const n = normLevel(level);
  return ['6eme', '5eme', '4eme', '3eme'].some((l) => n.includes(l.replace('e', '')) || n === l);
}

function isLycee(level: string): boolean {
  const n = normLevel(level);
  return n.includes('2nde') || n.includes('1ere') || n.includes('terminale');
}

/** Recommandations pédagogiques simples (règles métier, sans IA). */
export function buildPublicRecommendations(criteria: PublicRecoCriteria): PublicRecoResult {
  const level = criteria.currentLevel.trim();
  const interests = criteria.interests;
  const suggestions: string[] = [];
  const nextSteps: PublicRecoNextStep[] = [];

  if (criteria.intent === 'pre_inscription') {
    nextSteps.push({ label: 'Ouvrir la pré-inscription en ligne', href: '/pre-inscription' });
  }
  if (criteria.intent === 'info' || criteria.intent === 'orientation') {
    nextSteps.push({ label: 'Nous contacter', href: '/contact' });
    nextSteps.push({ label: 'Consulter la FAQ', href: '/faq' });
  }

  if (!level) {
    return {
      summary: 'Indiquez un niveau pour personnaliser les conseils.',
      suggestions: [
        'Notre établissement accueille les candidatures de la 6ème à la Terminale.',
        'La pré-inscription en ligne permet d’obtenir une référence de suivi.',
      ],
      nextSteps,
    };
  }

  if (isCollege(level)) {
    suggestions.push(
      'En collège, l’accent est mis sur les fondamentaux, la discipline et l’accompagnement personnalisé.',
    );
    if (normLevel(level).includes('3')) {
      suggestions.push(
        'En classe de 3ème, préparez le diplôme national du BEPC et anticipez l’orientation vers le lycée.',
      );
    } else {
      suggestions.push(
        'Un suivi régulier des moyennes et de l’assiduité facilite une transition sereine vers le cycle suivant.',
      );
    }
  } else if (isLycee(level)) {
    suggestions.push(
      'Au lycée, le choix des séries et l’objectif du baccalauréat structurent le parcours de l’élève.',
    );
    if (normLevel(level).includes('terminale')) {
      suggestions.push(
        'En Terminale, consolidez les matières du baccalauréat et les épreuves anticipées si applicable.',
      );
    } else if (normLevel(level).includes('1ere')) {
      suggestions.push(
        'En 1ère, vérifiez que la série choisie correspond à vos ambitions post-bac.',
      );
    } else {
      suggestions.push(
        'En 2nde, explorez les spécialités avant de confirmer la série en 1ère.',
      );
    }
  } else {
    suggestions.push(
      `Pour le niveau « ${level} », l’équipe pédagogique peut vous orienter vers la classe adaptée.`,
    );
  }

  if (interests.includes('sciences')) {
    suggestions.push(
      'Profil sciences : privilégiez les séries générales scientifiques ou technologiques (STMG, STI2D selon l’établissement).',
    );
  }
  if (interests.includes('literary')) {
    suggestions.push(
      'Profil littéraire : les séries générales avec langues et humanités renforcent l’orientation vers les filières lettres.',
    );
  }
  if (interests.includes('arts')) {
    suggestions.push(
      'Arts et créativité : informez-vous sur les options artistiques et les activités parascolaires proposées.',
    );
  }
  if (interests.includes('sport')) {
    suggestions.push(
      'Sport et vie scolaire : le cadre disciplinaire et les activités extra-scolaires favorisent l’équilibre.',
    );
  }
  if (interests.includes('digital')) {
    suggestions.push(
      'Numérique : les portails famille/élève centralisent notes, absences et communications.',
    );
  }

  const intentLabel =
    criteria.intent === 'pre_inscription'
      ? 'pré-inscription'
      : criteria.intent === 'orientation'
        ? 'orientation'
        : 'informations générales';

  return {
    summary: `Conseils pour ${level} (demande : ${intentLabel}).`,
    suggestions: suggestions.slice(0, 6),
    nextSteps,
  };
}

export const PUBLIC_RECO_LEVEL_OPTIONS = [...ADMISSION_SECONDARY_LEVELS];
