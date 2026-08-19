/** Contenu public « À propos » — structure alignée sur une vitrine scolaire complète. */

export const ABOUT_NAV = [
  { href: '/a-propos', label: 'À propos' },
  { href: '/a-propos/personnel', label: 'Le personnel' },
  { href: '/a-propos/etablissements', label: 'Nos établissements' },
  { href: '/a-propos/reglement-interieur', label: 'Règlement intérieur' },
] as const;

export const ABOUT_TAGLINE = 'Former les citoyens de demain avec excellence et passion.';

export function founderParagraphs(schoolName: string): string[] {
  return [
    `Lorsque nous fondions ${schoolName}, notre ambition était simple mais profonde : offrir à chaque enfant un cadre éducatif où l’excellence académique se conjugue avec le développement personnel et humain.`,
    'Nous croyons que chaque élève possède un potentiel unique qui ne demande qu’à être révélé. C’est pourquoi l’établissement met un point d’honneur à accompagner chacun avec rigueur, bienveillance et ouverture d’esprit.',
    'Notre mission va au-delà des connaissances théoriques : nous formons des citoyens responsables, curieux et capables de s’épanouir dans un monde en constante évolution.',
    'Ensemble, construisons l’avenir de nos enfants.',
  ];
}

export const ABOUT_ATOUTS = [
  {
    title: 'Excellence académique',
    text: 'Des enseignants qualifiés, un suivi rigoureux et une progression lisible pour chaque élève.',
    icon: 'award' as const,
    image: '/home/experience-academique.jpg',
    imageAlt: 'Élèves concentrés en classe',
  },
  {
    title: 'Infrastructures modernes',
    text: 'Salles de classe équipées, espaces de sport, bibliothèque et un cadre pensé pour apprendre.',
    icon: 'home' as const,
    image: '/home/gallery-library.jpg',
    imageAlt: 'Bibliothèque et espaces d’apprentissage',
  },
  {
    title: 'Vie scolaire épanouissante',
    text: 'Activités sportives, culturelles et sociales au service du développement global de l’enfant.',
    icon: 'heart' as const,
    image: '/home/gallery-sport.jpg',
    imageAlt: 'Activités sportives et vie de campus',
  },
] as const;

export const ABOUT_PLATFORM_FEATURES = [
  {
    title: 'Notes et résultats',
    text: 'Consultez les évaluations et le suivi scolaire en temps réel.',
  },
  {
    title: 'Emploi du temps',
    text: 'Un planning personnalisé, accessible à tout moment.',
  },
  {
    title: 'Absences et retards',
    text: 'Un suivi clair des présences, pour réagir plus vite.',
  },
  {
    title: 'Paiements et versements',
    text: 'L’historique des frais et des règlements, centralisé.',
  },
  {
    title: 'Annonces de l’école',
    text: 'Les informations importantes, partagées avec les familles.',
  },
] as const;

export const ABOUT_PLATFORM_GOALS = [
  'Favoriser la transparence entre l’école et les familles.',
  'Offrir un suivi régulier et détaillé de la scolarité.',
  'Permettre aux parents de s’impliquer davantage dans le parcours de leurs enfants.',
] as const;

export const ABOUT_STAFF_CATEGORIES = [
  {
    title: 'Direction',
    text: 'Garante de la vision éducative, du bon fonctionnement et de la discipline de l’école.',
    image: '/home/role-admin.jpg',
    imageAlt: 'Direction de l’établissement',
    slot: 'homeRoleAdmin' as const,
  },
  {
    title: 'Enseignants',
    text: 'Passionnés et qualifiés, ils transmettent leurs savoirs avec rigueur et pédagogie, en respectant le rythme de chaque élève.',
    image: '/home/role-teacher.jpg',
    imageAlt: 'Enseignant en classe',
    slot: 'homeRoleTeacher' as const,
  },
  {
    title: 'Encadrement éducatif',
    text: 'Éducateurs, surveillants et conseillers veillent au bien-être, à la discipline et à l’épanouissement des élèves.',
    image: '/home/experience-vie-scolaire.jpg',
    imageAlt: 'Vie scolaire et encadrement des élèves',
  },
  {
    title: 'Personnel administratif et technique',
    text: 'Ils assurent l’organisation, l’accueil et l’entretien de l’établissement, pour un environnement de travail agréable et sécurisé.',
    image: '/home/pillar-administration.jpg',
    imageAlt: 'Administration et accueil des familles',
    slot: 'homePillarAdministration' as const,
  },
] as const;

export const ABOUT_STAFF_ROLES = [
  {
    title: 'Direction des études',
    text: 'Pilotage pédagogique, suivi des classes et exigence académique.',
    image: '/home/directrice-etudes.jpg',
    imageAlt: 'Direction des études',
  },
  {
    title: 'Administration & scolarité',
    text: 'Accueil des familles, dossiers, inscriptions et organisation quotidienne.',
    image: '/home/admissions-desk.jpg',
    imageAlt: 'Accueil et scolarité',
  },
  {
    title: 'Éducateurs',
    text: 'Vie scolaire, discipline, écoute et accompagnement des élèves.',
    image: '/home/role-student.jpg',
    imageAlt: 'Encadrement des élèves',
    slot: 'homeRoleStudent' as const,
  },
  {
    title: 'Corps enseignant',
    text: 'Cours, évaluations et suivi personnalisé dans chaque discipline.',
    image: '/home/role-teacher.jpg',
    imageAlt: 'Corps enseignant',
    slot: 'homeRoleTeacher' as const,
  },
] as const;

export const ABOUT_CYCLES = [
  {
    title: 'Maternelle et primaire',
    text: 'Accueil des tout-petits dès la petite section jusqu’à la fin du primaire, dans un cadre structuré et rassurant.',
    items: ['Petite, moyenne et grande section', 'CP1 à CM2', 'Suivi rapproché et éveil'],
    image: '/home/news-mission.jpg',
    imageAlt: 'Maternelle et primaire',
  },
  {
    title: 'Enseignement général',
    text: 'Un cursus complet du collège au lycée, pour une formation littéraire et scientifique solide.',
    items: ['De la 6ᵉ à la Terminale', 'Séries A1, A2, C et D', 'Préparation aux examens officiels'],
    image: '/home/experience-academique.jpg',
    imageAlt: 'Enseignement général',
  },
  {
    title: 'Enseignement technique',
    text: 'Des options professionnelles pour préparer concrètement l’insertion et les études supérieures.',
    items: ['De la Seconde à la Terminale', 'G1 — Secrétariat', 'G2 — Comptabilité', 'AB — Économie'],
    image: '/home/gallery-lab.jpg',
    imageAlt: 'Enseignement technique',
  },
  {
    title: 'Enseignement supérieur',
    text: 'Des formations diplômantes de type BTS dans des domaines clés de la gestion, du commerce et du numérique.',
    items: [
      'Assistanat de direction',
      'Finance-comptabilité et gestion',
      'Gestion commerciale',
      'Ressources humaines et communication',
      'Logistique',
      'Informatique — développeur d’applications',
    ],
    image: '/home/pillar-portals.jpg',
    imageAlt: 'Enseignement supérieur',
    slot: 'homePillarPortals' as const,
  },
] as const;

export const ABOUT_CAMPUS_PHOTOS = [
  { src: '/home/split-campus.jpg', alt: 'Campus', slot: 'homeSplitCampus' as const },
  { src: '/home/gallery-assembly.jpg', alt: 'Assemblée et vie de l’établissement' },
  { src: '/home/admissions-desk.jpg', alt: 'Accueil des familles' },
  { src: '/home/gallery-library.jpg', alt: 'Bibliothèque' },
] as const;

export type AboutReglementChapter = {
  title: string;
  intro?: string;
  articles: Array<{ heading: string; body: string }>;
};

export const ABOUT_REGLEMENT_META = {
  republic: 'République de Côte d’Ivoire',
  motto: 'Union — Discipline — Travail',
  ministry: 'Ministère de l’Éducation nationale et de l’Alphabétisation',
  year: '2025-2026',
} as const;

export const ABOUT_REGLEMENT_CHAPTERS: AboutReglementChapter[] = [
  {
    title: 'Chapitre I — Dispositions générales',
    articles: [
      {
        heading: 'Article 1er',
        body: 'Le présent règlement est le résultat d’un processus inclusif, participatif et consensuel de la communauté éducative de l’établissement.',
      },
      {
        heading: 'Article 2',
        body: 'Il régit l’environnement scolaire, les activités de l’école et les relations interpersonnelles.',
      },
      {
        heading: 'Article 3',
        body: 'Il s’applique à tous les acteurs de la communauté éducative : personnel enseignant et d’encadrement, personnel administratif, personnel technique et de service, parents d’élèves et élèves.',
      },
    ],
  },
  {
    title: 'Chapitre II — Fonctionnement de l’établissement',
    intro: 'Accueil, inscriptions et organisation des apprentissages.',
    articles: [
      {
        heading: 'Reprise de service',
        body: 'Le personnel administratif et le corps enseignant respectent la date de reprise communiquée par la Direction des études.',
      },
      {
        heading: 'Préparation de la rentrée',
        body: 'Éducateurs, secrétariat et conseils d’enseignement transmettent à la Direction les besoins nécessaires au bon déroulement de l’année. Les espaces de classe et les parties communes sont préparés pour offrir un cadre propice aux études.',
      },
      {
        heading: 'Inscriptions',
        body: 'Les inscriptions suivent le calendrier fixé par le Ministère de l’Éducation nationale. Elles se déroulent aux jours et heures indiqués par l’établissement. Les familles se renseignent auprès du secrétariat ou des éducateurs de niveau.',
      },
      {
        heading: 'Pré-inscription en ligne',
        body: 'Après une pré-inscription en ligne, un parent peut, si besoin, être autorisé à inscrire physiquement son enfant à titre provisoire afin de permettre le démarrage des cours dans les délais officiels.',
      },
      {
        heading: 'Ponctualité et assiduité',
        body: 'Les cours de la matinée débutent à 07h15 et s’achèvent à 12h15. L’après-midi, les cours reprennent à 15h00 et s’achèvent à 18h00. Les horaires d’évaluation peuvent être adaptés, notamment le soir à partir de 14h.',
      },
    ],
  },
  {
    title: 'Chapitre III — Application du règlement',
    articles: [
      {
        heading: 'Équité',
        body: 'Les dispositions s’appliquent de manière équitable à tous les acteurs impliqués dans la vie de l’école. En cas de non-respect, des sanctions et des voies de recours sont prévues.',
      },
      {
        heading: 'Sanctions',
        body: 'Pour le personnel, les comportements passibles de sanction s’inscrivent dans le code de conduite des personnels des structures publiques et privées. Pour les élèves, la discipline scolaire s’applique selon les textes en vigueur. Pour la communauté, le cadre du COGES, le code pénal et le code civil peuvent être invoqués.',
      },
      {
        heading: 'Voies de recours',
        body: 'En cas de sanction disciplinaire, l’intéressé peut écrire à l’auteur de la décision ou à son supérieur hiérarchique pour en demander l’annulation. S’il n’est pas satisfait, il peut saisir la juridiction compétente.',
      },
    ],
  },
  {
    title: 'Chapitre IV — Dispositions finales',
    articles: [
      {
        heading: 'Lecture annuelle',
        body: 'Le présent règlement intérieur est lu chaque année à la réunion de rentrée.',
      },
      {
        heading: 'Modification',
        body: 'Il peut être modifié en assemblée générale à la majorité des deux tiers des membres convoqués par le chef d’établissement. La modification ne peut porter sur le préambule, les articles liés à la protection de l’enfant et les dispositions finales.',
      },
      {
        heading: 'Cas non prévus',
        body: 'Les cas non prévus font l’objet d’une assemblée générale extraordinaire.',
      },
      {
        heading: 'Entrée en vigueur',
        body: 'Adopté en assemblée générale, le règlement entre en vigueur dès sa signature par les représentants des parties prenantes. Il fait l’objet d’une large diffusion auprès de la communauté éducative.',
      },
    ],
  },
];
