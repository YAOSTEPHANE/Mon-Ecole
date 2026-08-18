import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export type TabMeta = {
  label: string;
  icon: IoniconName;
  iconActive: IoniconName;
};

export const TAB_META: Record<string, TabMeta> = {
  Accueil: { label: 'Accueil', icon: 'home-outline', iconActive: 'home' },
  Notifications: { label: 'Alertes', icon: 'notifications-outline', iconActive: 'notifications' },
  Notes: { label: 'Notes', icon: 'ribbon-outline', iconActive: 'ribbon' },
  Absences: { label: 'Absences', icon: 'calendar-outline', iconActive: 'calendar' },
  Paiements: { label: 'Paiements', icon: 'card-outline', iconActive: 'card' },
  Appel: { label: 'Présence', icon: 'checkbox-outline', iconActive: 'checkbox' },
  Élèves: { label: 'Élèves', icon: 'people-outline', iconActive: 'people' },
  Assiduité: { label: 'Assiduité', icon: 'stats-chart-outline', iconActive: 'stats-chart' },
  Demandes: { label: 'Demandes', icon: 'document-text-outline', iconActive: 'document-text' },
  Activité: { label: 'Activité', icon: 'pulse-outline', iconActive: 'pulse' },
  Guichet: { label: 'Guichet', icon: 'cash-outline', iconActive: 'cash' },
  Admissions: { label: 'Admissions', icon: 'person-add-outline', iconActive: 'person-add' },
  Assistant: { label: 'Assistant', icon: 'sparkles-outline', iconActive: 'sparkles' },
  Profil: { label: 'Profil', icon: 'person-outline', iconActive: 'person' },
  Messages: { label: 'Messages', icon: 'chatbubbles-outline', iconActive: 'chatbubbles' },
  RDV: { label: 'RDV', icon: 'people-outline', iconActive: 'people' },
  Devoirs: { label: 'Devoirs', icon: 'book-outline', iconActive: 'book' },
  Cahier: { label: 'Cahier', icon: 'journal-outline', iconActive: 'journal' },
  Emploi: { label: 'EDT', icon: 'time-outline', iconActive: 'time' },
  Bulletins: { label: 'Bulletins', icon: 'document-text-outline', iconActive: 'document-text' },
  Conduite: { label: 'Conduite', icon: 'shield-checkmark-outline', iconActive: 'shield-checkmark' },
  Parascolaire: { label: 'Clubs', icon: 'football-outline', iconActive: 'football' },
  Campus: { label: 'Campus', icon: 'bus-outline', iconActive: 'bus' },
  Orientation: { label: 'Orientation', icon: 'compass-outline', iconActive: 'compass' },
  Réinscription: { label: 'Réinscr.', icon: 'refresh-outline', iconActive: 'refresh' },
  Bibliothèque: { label: 'Livres', icon: 'library-outline', iconActive: 'library' },
  Famille: { label: 'Famille', icon: 'heart-outline', iconActive: 'heart' },
};

const PRIMARY_ORDER = [
  'Accueil',
  'Notes',
  'Absences',
  'Paiements',
  'Appel',
  'Élèves',
  'Assiduité',
  'Guichet',
  'Admissions',
  'Demandes',
];

const MAX_DOCK_ITEMS = 4;

export function getTabMeta(name: string): TabMeta {
  return TAB_META[name] ?? { label: name, icon: 'ellipse-outline', iconActive: 'ellipse' };
}

export function splitDockRoutes<T extends { name: string }>(routes: T[]): {
  visible: T[];
  overflow: T[];
} {
  if (routes.length <= 5) {
    return { visible: routes, overflow: [] };
  }

  const byName = new Map(routes.map((route) => [route.name, route]));
  const visible: T[] = [];

  for (const name of PRIMARY_ORDER) {
    if (visible.length >= MAX_DOCK_ITEMS) break;
    const route = byName.get(name);
    if (route) visible.push(route);
  }

  for (const route of routes) {
    if (visible.length >= MAX_DOCK_ITEMS) break;
    if (!visible.includes(route)) visible.push(route);
  }

  const overflow = routes.filter((route) => !visible.includes(route));
  return { visible, overflow };
}
