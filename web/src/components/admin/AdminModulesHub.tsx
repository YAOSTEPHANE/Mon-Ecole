'use client';

import PortalModulesHub, { type PortalModuleTab } from '../dashboard/PortalModulesHub';
import { ADMIN_MODULE_CATEGORIES } from '@/lib/adminModules';

export type AdminModulesHubTab = PortalModuleTab;

type AdminModulesHubProps = {
  allTabs: AdminModulesHubTab[];
  onNavigate: (tabId: string) => void;
  embedded?: boolean;
};

const AdminModulesHub: React.FC<AdminModulesHubProps> = ({ allTabs, onNavigate, embedded = false }) => (
  <PortalModulesHub
    allTabs={allTabs}
    categories={ADMIN_MODULE_CATEGORIES}
    onNavigate={onNavigate}
    title="Modules"
    subtitle="Accès aux fonctions d’administration autorisées pour votre espace, groupées par domaine."
    excludeIds={['dashboard']}
    embedded={embedded}
  />
);

export default AdminModulesHub;
