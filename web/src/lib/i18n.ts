/**
 * Langue de l’application : français uniquement.
 */

export type AppLocale = 'fr';

const DICT = {
  'app.name': 'École à jour',
  'nav.login': 'Connexion',
  'nav.home': 'Accueil',
  'payments.title': 'Paiements',
  'campus.canteen': 'Cantine',
  'campus.transport': 'Transport',
  'gamification.points': 'Points',
  'common.loading': 'Chargement…',
  'common.save': 'Enregistrer',
  'common.cancel': 'Annuler',
} as const;

export type I18nKey = keyof typeof DICT;

export function getStoredLocale(): AppLocale {
  return 'fr';
}

export function setStoredLocale(_locale?: AppLocale): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('ecole_locale', 'fr');
  document.documentElement.lang = 'fr';
}

export function t(key: I18nKey, _locale?: AppLocale): string {
  return DICT[key] ?? key;
}
