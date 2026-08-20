/**
 * Timeline vidéo ↔ voix off (ordre + texte par plan).
 * Chaque bloc = un segment TTS ; la durée du plan suit la durée du segment.
 */
export const MARKETING_TIMELINE = [
  {
    id: 'intro-questions',
    vo: 'Dans un établissement, trois questions se posent chaque matin : mon enfant était-il absent hier ? Où en sont les frais de scolarité ? Quel devoir doit-il rendre demain ?',
    visuals: [{ slide: 't01.png' }],
  },
  {
    id: 'intro-probleme',
    vo: "Au secrétariat, le téléphone sonne déjà. Un parent cherche une note. Un enseignant demande si l'appel a bien été saisi. La comptable fouille un classeur. Sur les messageries, trois groupes parlent de la même circulaire. Personne n'est de mauvaise volonté — mais l'information court dans tous les sens, sauf au même endroit.",
    visuals: [{ slide: 't02.png' }, { slide: 't03.png' }],
  },
  {
    id: 'solution',
    vo: "Mon Ecole change cette réalité. Une seule plateforme pour toute l'école.",
    visuals: [{ slide: 't04.png' }],
  },
  {
    id: 'site-public',
    vo: "Sur le site public, les familles découvrent l'établissement et consultent le palmarès. Elles déposent une pré-inscription en ligne avec une référence de suivi. Elles peuvent poser une question, demander une orientation, ou ouvrir le chat anonyme — directement depuis le widget.",
    visuals: [
      { capture: '01-accueil-hero' },
      { capture: '02-accueil-palmares' },
      { capture: '03-pre-inscription' },
      { capture: '04-a-propos' },
      { capture: '05-widget-chat' },
      { capture: '06-widget-orientation' },
    ],
  },
  {
    id: 'espace-parent',
    vo: "Dans l'espace parent, elles suivent les notes, les bulletins, les absences, les paiements et les messages de l'école, sans rappeler dix fois.",
    visuals: [
      { capture: '08-parent-overview' },
      { capture: '09-parent-notes' },
      { capture: '10-parent-bulletins' },
      { capture: '11-parent-absences' },
      { capture: '12-parent-paiements' },
      { capture: '13-parent-messages' },
    ],
  },
  {
    id: 'espace-eleve',
    vo: "L'élève consulte son emploi du temps et ses devoirs depuis son portail.",
    visuals: [
      { capture: '14-student-overview' },
      { capture: '15-student-emploi-du-temps' },
      { capture: '16-student-devoirs' },
    ],
  },
  {
    id: 'espace-enseignant',
    vo: "L'enseignant note, fait l'appel et communique au même endroit.",
    visuals: [
      { capture: '17-teacher-overview' },
      { capture: '18-teacher-notation' },
      { capture: '19-teacher-appel' },
      { capture: '20-teacher-messagerie' },
    ],
  },
  {
    id: 'direction',
    vo: "La direction pilote les admissions, les présences, les frais, les paiements, et répond aux visiteurs du site depuis un seul outil de communication.",
    visuals: [
      { capture: '21-admin-dashboard' },
      { capture: '22-admin-admissions' },
      { capture: '23-admin-presences' },
      { capture: '24-admin-frais' },
      { capture: '25-admin-paiements' },
      { capture: '26-admin-visiteurs-chat' },
    ],
  },
  {
    id: 'pointage',
    vo: "Et surtout : dès que l'élève pointe — à l'entrée ou à la sortie — une notification part aux parents, par e-mail et par SMS. Plus besoin d'appeler pour savoir s'il est bien arrivé.",
    visuals: [{ slide: 't06.png' }, { slide: 't07.png' }],
  },
  {
    id: 'atouts',
    vo: 'Les atouts de Mon Ecole : le pointage qui prévient les familles, le suivi scolaire en temps réel, les frais centralisés, le site public, le chat, et un tableau de bord pour la direction. Tout au même endroit.',
    visuals: [{ slide: 't08.png' }],
  },
  {
    id: 'outro',
    vo: "Former aujourd'hui, c'est aussi s'organiser mieux. Mon Ecole.",
    visuals: [{ slide: 't05.png' }],
  },
];

/** Plans montés dans l’ordre ; durée de chaque plan = durée TTS du bloc. */
export function flattenTimeline(plansWithDuration) {
  const clips = [];
  for (const plan of plansWithDuration) {
    const n = plan.visuals.length;
    const perClip = plan.durationSec / n;
    for (const visual of plan.visuals) {
      clips.push({ ...visual, durationSec: perClip, planId: plan.id });
    }
  }
  return clips;
}

export function fullVoiceoverText() {
  return MARKETING_TIMELINE.map((b) => b.vo.trim()).join('\n\n');
}
