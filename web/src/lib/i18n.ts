/**
 * i18n minimal FR / EN — dictionnaire + helper.
 * Langue stockée dans localStorage (`ecole_locale`).
 */

export type AppLocale = 'fr' | 'en';

const DICT = {
  fr: {
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
  },
  en: {
    'app.name': 'School Up to Date',
    'nav.login': 'Sign in',
    'nav.home': 'Home',
    'payments.title': 'Payments',
    'campus.canteen': 'Cafeteria',
    'campus.transport': 'Transport',
    'gamification.points': 'Points',
    'common.loading': 'Loading…',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
  },
} as const;

export type I18nKey = keyof (typeof DICT)['fr'];

export function getStoredLocale(): AppLocale {
  if (typeof window === 'undefined') return 'fr';
  const v = window.localStorage.getItem('ecole_locale');
  return v === 'en' ? 'en' : 'fr';
}

export function setStoredLocale(locale: AppLocale): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('ecole_locale', locale);
  document.documentElement.lang = locale;
}

export function t(key: I18nKey, locale?: AppLocale): string {
  const loc = locale ?? (typeof window !== 'undefined' ? getStoredLocale() : 'fr');
  return DICT[loc][key] ?? DICT.fr[key] ?? key;
}
