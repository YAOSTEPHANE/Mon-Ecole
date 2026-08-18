import Link from 'next/link';
import { useAppBranding } from '@/contexts/AppBrandingContext';
import AccountHeaderControls, { ROLE_ACCENTS } from './AccountHeaderControls';

interface LayoutProps {
  children: React.ReactNode;
  user: {
    id?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    phone?: string | null;
    avatar?: string | null;
    isActive?: boolean;
    role?: string;
    teacherProfile?: { employeeId?: string | null; specialization?: string | null };
    staffProfile?: { employeeId?: string; jobTitle?: string | null; supportKind?: string | null };
    parentProfile?: { students?: unknown[] };
  } | null;
  onLogout: () => void | Promise<void>;
  role: string;
  /** Pour le personnel (STAFF) : libellé précis du métier affiché sur le badge à la place de « Personnel » */
  staffRoleBadgeLabel?: string;
  /** Masque cloche et menu profil (quand ils sont déjà dans un autre en-tête, ex. tableau de bord ops). */
  hideAccountControls?: boolean;
  /** Masque tout le bandeau Layout pour coller le contenu en haut de page. */
  hideHeader?: boolean;
  onOpenSettings?: () => void;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  user,
  onLogout,
  role,
  staffRoleBadgeLabel,
  hideAccountControls = false,
  hideHeader = false,
  onOpenSettings,
}) => {
  const accent = ROLE_ACCENTS[role] ?? ROLE_ACCENTS.ADMIN;
  const { navigationLogoAbsolute, branding } = useAppBranding();
  const headerTitle = (branding.appTitle && branding.appTitle.trim()) || 'Gestion scolaire';
  const headerTagline =
    (branding.appTagline && branding.appTagline.trim()) || 'Espace sécurisé';

  const getRolePath = () => {
    switch (role) {
      case 'ADMIN':
      case 'SUPER_ADMIN':
        return '/admin';
      case 'TEACHER':
        return '/teacher';
      case 'STUDENT':
        return '/student';
      case 'PARENT':
        return '/parent';
      case 'EDUCATOR':
        return '/educator';
      case 'STAFF':
        return '/staff';
      default:
        return '/';
    }
  };

  return (
    <div className={`min-h-screen ${hideHeader ? 'dash-header-hidden' : ''}`}>
      {hideHeader ? null : (
      <header className="sticky top-0 z-40 pt-[env(safe-area-inset-top)]">
        <div
          className={`h-0.5 w-full bg-gradient-to-r opacity-90 ${accent.bar}`}
          aria-hidden
        />
        <nav className="glass-nav glass-nav-v2">
          <div className="max-w-[1600px] mx-auto px-3 sm:px-6 lg:px-10">
            <div className="flex min-h-14 h-14 sm:min-h-16 sm:h-16 items-center justify-between gap-1.5 sm:gap-3 min-w-0">
              <Link
                href={getRolePath()}
                className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1 group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0018A8]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-white -m-1 p-1"
              >
                <div
                  className={`relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br ${navigationLogoAbsolute ? 'bg-white ring-1 ring-[#e4e8f2]' : `${accent.logo} text-white`} shadow-[0_8px_16px_-10px_rgba(0,24,168,0.45)] ring-1 ring-[#e4e8f2] transition duration-200 group-hover:scale-[1.03]`}
                >
                  {navigationLogoAbsolute ? (
                    <img
                      src={navigationLogoAbsolute}
                      alt=""
                      className="h-full w-full object-contain p-0.5"
                    />
                  ) : (
                    <span className="font-display text-base font-semibold tracking-[0.12em]">É</span>
                  )}
                  <span
                    className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-white/15"
                    aria-hidden
                  />
                </div>
                <div className="min-w-0">
                  <p className="font-display text-base sm:text-lg font-semibold tracking-[0.06em] text-stone-900 truncate">
                    {headerTitle}
                  </p>
                  <p className="text-[9px] sm:text-[10px] font-medium uppercase tracking-[0.2em] text-stone-500 truncate">
                    {headerTagline}
                  </p>
                </div>
              </Link>

              {hideAccountControls ? null : (
                <AccountHeaderControls
                  user={user}
                  role={role}
                  onLogout={onLogout}
                  staffRoleBadgeLabel={staffRoleBadgeLabel}
                  onOpenSettings={onOpenSettings}
                />
              )}
            </div>
          </div>
        </nav>
      </header>
      )}

      <main className="animate-dash-enter dash-workspace">{children}</main>
    </div>
  );
};

export default Layout;
