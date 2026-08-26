'use client';

import Link from 'next/link';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import NotificationCenter from './NotificationCenter';
import Avatar from './ui/Avatar';
import ProfileEditModal from './ProfileEditModal';
import { resolveStaffSupportKind, STAFF_KIND_LABELS } from '@/views/staff/staffSpaceConfig';
import {
  FiBell,
  FiBook,
  FiBookOpen,
  FiBriefcase,
  FiChevronDown,
  FiEdit3,
  FiLogOut,
  FiMail,
  FiPhone,
  FiSettings,
  FiShield,
  FiUser,
  FiPieChart,
} from 'react-icons/fi';

type AccountUser = {
  id?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  avatar?: string | null;
  isActive?: boolean;
  role?: string;
  teacherProfile?: { employeeId?: string | null; specialization?: string | null };
  studentProfile?: {
    enrollmentStatus?: 'ACTIVE' | 'SUSPENDED' | 'GRADUATED';
    class?: { name?: string };
    [key: string]: unknown;
  };
  staffProfile?: { employeeId?: string; jobTitle?: string | null; supportKind?: string | null };
  parentProfile?: { students?: unknown[] };
};

export const ROLE_ACCENTS: Record<
  string,
  { bar: string; badge: string; logo: string; label: string }
> = {
  ADMIN: {
    bar: 'from-[#0018A8] via-[#EBB02D] to-[#0018A8]',
    badge: 'bg-[#0018A8] text-white ring-1 ring-[#EBB02D]/45',
    logo: 'from-[#0018A8] to-[#07081a]',
    label: 'Administrateur',
  },
  SUPER_ADMIN: {
    bar: 'from-[#07081a] via-[#0018A8] to-[#EBB02D]',
    badge: 'bg-[#07081a] text-white ring-1 ring-[#EBB02D]/50 font-bold',
    logo: 'from-[#07081a] to-[#0018A8]',
    label: 'Super administrateur',
  },
  TEACHER: {
    bar: 'from-emerald-800 via-teal-700 to-cyan-800',
    badge: 'bg-emerald-950/80 text-emerald-100 ring-1 ring-emerald-500/30',
    logo: 'from-emerald-900 to-teal-900',
    label: 'Enseignant',
  },
  STUDENT: {
    bar: 'from-violet-800 via-indigo-700 to-slate-900',
    badge: 'bg-indigo-950/85 text-violet-100 ring-1 ring-violet-400/30',
    logo: 'from-indigo-900 to-violet-950',
    label: 'Élève',
  },
  PARENT: {
    bar: 'from-amber-800 via-orange-700 to-rose-900',
    badge: 'bg-orange-950/85 text-amber-50 ring-1 ring-amber-500/30',
    logo: 'from-amber-900 to-orange-950',
    label: 'Parent',
  },
  EDUCATOR: {
    bar: 'from-rose-900 via-pink-800 to-red-950',
    badge: 'bg-rose-950/85 text-rose-100 ring-1 ring-rose-400/30',
    logo: 'from-rose-900 to-pink-950',
    label: 'Éducateur',
  },
  STAFF: {
    bar: 'from-teal-900 via-emerald-800 to-stone-950',
    badge: 'bg-emerald-950/85 text-teal-50 ring-1 ring-teal-400/30',
    logo: 'from-teal-800 to-emerald-950',
    label: 'Personnel',
  },
};

type ProfileRow = { key: string; icon: typeof FiMail; label: string; value: string };

function buildProfileRows(user: AccountUser | null | undefined, role: string): ProfileRow[] {
  const rows: ProfileRow[] = [];
  if (user?.phone) {
    rows.push({ key: 'phone', icon: FiPhone, label: 'Téléphone', value: String(user.phone) });
  }
  const isActive = user?.isActive !== false;
  rows.push({
    key: 'status',
    icon: FiShield,
    label: 'Compte',
    value: isActive ? 'Actif' : 'Suspendu',
  });
  if (role === 'TEACHER' && user?.teacherProfile) {
    const t = user.teacherProfile;
    if (t.employeeId) {
      rows.push({ key: 'emp', icon: FiUser, label: 'Matricule', value: String(t.employeeId) });
    }
    if (t.specialization) {
      rows.push({ key: 'spec', icon: FiBookOpen, label: 'Spécialité', value: String(t.specialization) });
    }
  }
  if (role === 'STUDENT' && user?.studentProfile?.class?.name) {
    rows.push({
      key: 'class',
      icon: FiBook,
      label: 'Classe',
      value: String(user.studentProfile.class.name),
    });
  }
  if (role === 'STAFF' && user?.staffProfile) {
    const sp = user.staffProfile;
    if (sp.employeeId) {
      rows.push({ key: 'emp', icon: FiUser, label: 'Matricule', value: String(sp.employeeId) });
    }
    if (sp.supportKind) {
      const k = resolveStaffSupportKind(sp.supportKind);
      rows.push({
        key: 'kind',
        icon: FiBriefcase,
        label: 'Métier',
        value: STAFF_KIND_LABELS[k] ?? String(sp.supportKind),
      });
    }
    if (sp.jobTitle) {
      rows.push({ key: 'job', icon: FiBookOpen, label: 'Fonction', value: String(sp.jobTitle) });
    }
  }
  if (role === 'PARENT' && Array.isArray(user?.parentProfile?.students)) {
    const n = user.parentProfile.students.length;
    if (n > 0) {
      rows.push({
        key: 'children',
        icon: FiUser,
        label: 'Enfants liés',
        value: `${n} élève${n > 1 ? 's' : ''}`,
      });
    }
  }
  return rows;
}

type AccountHeaderControlsProps = {
  user: AccountUser | null | undefined;
  role: string;
  onLogout: () => void | Promise<void>;
  staffRoleBadgeLabel?: string;
  variant?: 'layout' | 'ops';
  showNotifications?: boolean;
  onOpenSettings?: () => void;
};

export default function AccountHeaderControls({
  user,
  role,
  onLogout,
  staffRoleBadgeLabel,
  variant = 'layout',
  showNotifications = true,
  onOpenSettings,
}: AccountHeaderControlsProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 16, maxHeight: 480 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const effectiveRole = user?.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : role;
  const accent = ROLE_ACCENTS[effectiveRole] ?? ROLE_ACCENTS.ADMIN;
  const roleBadgeText =
    role === 'STAFF' && staffRoleBadgeLabel?.trim() ? staffRoleBadgeLabel.trim() : accent.label;
  const profileRows = buildProfileRows(user, effectiveRole);
  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || 'Utilisateur';
  const isAdmin = effectiveRole === 'ADMIN' || effectiveRole === 'SUPER_ADMIN';
  const ops = variant === 'ops';
  const notificationRole = (isAdmin ? 'ADMIN' : role) as
    | 'ADMIN'
    | 'TEACHER'
    | 'STUDENT'
    | 'PARENT'
    | 'EDUCATOR'
    | 'STAFF';
  const showSettingsInMenu = Boolean(onOpenSettings) || isAdmin;

  useLayoutEffect(() => {
    if (!showUserMenu) return;

    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const top = Math.min(rect.bottom + 8, window.innerHeight - 120);
      setMenuPos({
        top,
        right: Math.max(12, window.innerWidth - rect.right),
        maxHeight: Math.max(280, window.innerHeight - top - 12),
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [showUserMenu]);

  useEffect(() => {
    if (!showUserMenu) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowUserMenu(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showUserMenu]);

  return (
    <>
      <div className={`flex shrink-0 items-center ${ops ? 'gap-2' : 'gap-1.5 sm:gap-3 md:gap-4'}`}>
        <div className="relative">
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setShowUserMenu((v) => !v)}
            className={
              ops
                ? 'flex items-center gap-2 rounded-full py-1 pl-1 pr-2.5 transition hover:bg-stone-50'
                : 'flex min-h-10 items-center gap-2 rounded-full border border-[#e4e8f2] bg-white py-1 pl-1 pr-2 shadow-sm transition hover:border-[#cfd7ea] hover:bg-[#f7f8fc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0018A8]/35 sm:min-h-11'
            }
            aria-expanded={showUserMenu}
            aria-haspopup="menu"
            aria-label="Menu du compte"
          >
            <span className="shrink-0 rounded-full shadow-sm ring-2 ring-white">
              <Avatar src={user?.avatar} name={displayName} size={ops ? 'sm' : 'md'} />
            </span>
            {ops ? (
              <span className="hidden text-left sm:block">
                <span className="block text-[13px] font-semibold leading-tight text-stone-900">
                  {displayName}
                </span>
                <span className="block text-[11px] text-stone-400">{roleBadgeText}</span>
              </span>
            ) : (
              <span className="hidden max-w-[140px] truncate text-left text-xs font-semibold leading-tight text-stone-800 sm:inline">
                {user?.firstName}
              </span>
            )}
            <FiChevronDown
              className={`h-3.5 w-3.5 shrink-0 text-stone-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`}
              aria-hidden
            />
          </button>
        </div>
      </div>

      {showNotifications ? (
        <NotificationCenter
          role={notificationRole}
          currentUserId={isAdmin ? user?.id : undefined}
          hideTrigger
          open={notificationsOpen}
          onOpenChange={setNotificationsOpen}
          anchorRef={triggerRef}
        />
      ) : null}

      {showUserMenu && typeof document !== 'undefined'
        ? createPortal(
            <div data-portal className="fixed inset-0 z-[200]">
              <button
                type="button"
                className="absolute inset-0 cursor-default bg-stone-900/35"
                aria-label="Fermer le menu"
                onClick={() => setShowUserMenu(false)}
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-label="Compte utilisateur"
                className="absolute z-10 flex w-[min(calc(100vw-1.5rem),20rem)] flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl sm:w-80"
                style={{
                  top: menuPos.top,
                  right: menuPos.right,
                  maxHeight: menuPos.maxHeight,
                }}
              >
                <div
                  className="relative shrink-0 border-b border-stone-200/60 bg-gradient-to-br from-white via-stone-50/80 to-amber-50/40 px-4 py-3"
                  role="group"
                  aria-label="Identité"
                >
                  <div className={`mb-2 h-1 w-full rounded-full bg-gradient-to-r opacity-90 ${accent.bar}`} role="presentation" />
                  <div className="flex gap-3">
                    <span className="shrink-0 rounded-full shadow-md ring-2 ring-white/90">
                      <Avatar src={user?.avatar} name={displayName} size="lg" />
                    </span>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <p className="truncate text-base font-bold leading-snug text-stone-900">{displayName}</p>
                      <p className="mt-0.5 break-all text-[11px] leading-snug text-stone-600">{user?.email}</p>
                      <p className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${accent.badge}`}>
                        {roleBadgeText}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto overscroll-contain px-2 py-1.5">
                  {profileRows.map((row) => {
                    const Icon = row.icon;
                    return (
                      <div
                        key={row.key}
                        className="flex items-start gap-2.5 rounded-xl px-2.5 py-1.5 text-left"
                      >
                        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-600">
                          <Icon className="h-3.5 w-3.5" aria-hidden />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[9px] font-semibold uppercase tracking-wide text-stone-500">
                            {row.label}
                          </p>
                          <p className="break-words text-xs font-medium text-stone-800">{row.value}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="shrink-0 border-t border-stone-200/80 bg-white p-1.5">
                  {showNotifications ? (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setShowUserMenu(false);
                        setNotificationsOpen(true);
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-stone-800 transition hover:bg-stone-100/90"
                    >
                      <FiBell className="h-4 w-4 shrink-0 text-amber-700" aria-hidden />
                      Notifications
                    </button>
                  ) : null}
                  {showSettingsInMenu ? (
                    onOpenSettings ? (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setShowUserMenu(false);
                          onOpenSettings();
                        }}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-stone-800 transition hover:bg-stone-100"
                      >
                        <FiSettings className="h-4 w-4 shrink-0 text-[#0018A8]" aria-hidden />
                        Paramètres
                      </button>
                    ) : (
                      <Link
                        href="/admin?tab=settings"
                        role="menuitem"
                        onClick={() => setShowUserMenu(false)}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-stone-800 transition hover:bg-stone-100"
                      >
                        <FiSettings className="h-4 w-4 shrink-0 text-[#0018A8]" aria-hidden />
                        Paramètres
                      </Link>
                    )
                  ) : null}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setShowUserMenu(false);
                      setProfileModalOpen(true);
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-stone-800 transition hover:bg-stone-100/90"
                  >
                    <FiEdit3 className="h-4 w-4 shrink-0 text-amber-800" aria-hidden />
                    Modifier mon profil
                  </button>
                  {isAdmin ? (
                    <Link
                      href="/directeur"
                      role="menuitem"
                      onClick={() => setShowUserMenu(false)}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-stone-800 transition hover:bg-amber-50/90"
                    >
                      <FiPieChart className="h-4 w-4 shrink-0 text-cptb-blue" aria-hidden />
                      Vue direction (KPI)
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setShowUserMenu(false);
                      void onLogout();
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                  >
                    <FiLogOut className="h-4 w-4 shrink-0" aria-hidden />
                    Déconnexion
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}

      <ProfileEditModal isOpen={profileModalOpen} onClose={() => setProfileModalOpen(false)} />
    </>
  );
}
