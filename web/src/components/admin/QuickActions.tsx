'use client';

import { FiUserPlus, FiBook, FiUsers, FiFileText, FiSettings, FiDownload, FiShield } from 'react-icons/fi';
import PremiumGlassCard from '../dashboard/premium/PremiumGlassCard';

interface QuickActionsProps {
  onAddStudent?: () => void;
  onCreateClass?: () => void;
  onAddTeacher?: () => void;
  onAddEducator?: () => void;
  onGenerateReport?: () => void;
  onExportData?: () => void;
  onSettings?: () => void;
}

const ACTIONS = [
  {
    icon: FiUserPlus,
    label: 'Ajouter un élève',
    description: 'Inscrire un nouvel élève',
    gradient: 'from-blue-600 via-indigo-600 to-violet-700',
    ring: 'ring-blue-500/20',
    onKey: 'onAddStudent' as const,
  },
  {
    icon: FiBook,
    label: 'Créer une classe',
    description: 'Nouveau groupe pédagogique',
    gradient: 'from-emerald-600 via-teal-600 to-cyan-700',
    ring: 'ring-emerald-500/20',
    onKey: 'onCreateClass' as const,
  },
  {
    icon: FiUsers,
    label: 'Ajouter un enseignant',
    description: 'Recruter du personnel',
    gradient: 'from-indigo-600 via-blue-600 to-sky-700',
    ring: 'ring-indigo-500/20',
    onKey: 'onAddTeacher' as const,
  },
  {
    icon: FiShield,
    label: 'Ajouter un éducateur',
    description: 'Encadrement & vie scolaire',
    gradient: 'from-violet-600 via-purple-600 to-fuchsia-700',
    ring: 'ring-violet-500/20',
    onKey: 'onAddEducator' as const,
  },
  {
    icon: FiFileText,
    label: 'Générer un rapport',
    description: 'Exports et synthèses',
    gradient: 'from-amber-500 via-orange-600 to-red-600',
    ring: 'ring-amber-500/20',
    onKey: 'onGenerateReport' as const,
  },
  {
    icon: FiDownload,
    label: 'Exporter les données',
    description: 'CSV, Excel, archives',
    gradient: 'from-slate-700 via-stone-800 to-slate-900',
    ring: 'ring-slate-500/20',
    onKey: 'onExportData' as const,
  },
  {
    icon: FiSettings,
    label: 'Paramètres',
    description: 'Configuration établissement',
    gradient: 'from-stone-600 via-zinc-700 to-stone-800',
    ring: 'ring-stone-500/20',
    onKey: 'onSettings' as const,
  },
] as const;

const QuickActions: React.FC<QuickActionsProps> = ({
  onAddStudent,
  onCreateClass,
  onAddTeacher,
  onAddEducator,
  onGenerateReport,
  onExportData,
  onSettings,
}) => {
  const handlerMap = {
    onAddStudent,
    onCreateClass,
    onAddTeacher,
    onAddEducator,
    onGenerateReport,
    onExportData,
    onSettings,
  };

  return (
    <PremiumGlassCard padding="sm" className="!p-0 overflow-hidden ring-stone-200/60">
      <div className="grid grid-cols-1 gap-px bg-stone-200/70 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          const onClick = handlerMap[action.onKey];
          return (
            <button
              key={action.label}
              type="button"
              onClick={() => onClick?.()}
              className={`dash-action-tile group relative flex items-start gap-3 bg-white/[0.98] p-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40 focus-visible:ring-offset-2 ${action.ring}`}
            >
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${action.gradient} text-white shadow-[0_10px_24px_-10px_rgba(0,0,0,0.35)] ring-1 ring-white/30 transition-transform duration-300 ease-premium group-hover:scale-105`}
              >
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0 pt-0.5">
                <span className="block text-sm font-bold text-stone-900 group-hover:text-stone-950">
                  {action.label}
                </span>
                <span className="mt-0.5 block text-[11px] font-medium text-stone-500">
                  {action.description}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </PremiumGlassCard>
  );
};

export default QuickActions;
