/** Portail officiel SIGFNE — recherche / vérification du matricule élève DSPS–MENA. */
export const FNE_MATRICULE_SEARCH_URL =
  'http://agfne.sigfne.net/vas/recherche-matricule-eleve-dsps/';

/** Portail DESPS (inscriptions, reçus, cursus). */
export const MENA_DESPS_PORTAL_URL = 'https://mena-desps.org/';

/** Ouvre la page officielle de recherche de matricule FNE dans un nouvel onglet. */
export function openFneMatriculeSearch(): void {
  window.open(FNE_MATRICULE_SEARCH_URL, '_blank', 'noopener,noreferrer');
}
