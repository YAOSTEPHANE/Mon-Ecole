'use client';

import type { ComponentType } from 'react';
import Link from 'next/link';
import { useAppBranding } from '@/contexts/AppBrandingContext';
import { resolveSchoolDisplayName, resolveSchoolTagline } from '@/lib/resolveSchoolBranding';
import {
  FiBook,
  FiMail,
  FiMessageSquare,
  FiHelpCircle,
  FiFileText,
  FiSettings,
  FiFacebook,
  FiInstagram,
  FiLinkedin,
  FiYoutube,
} from 'react-icons/fi';
import { FaTiktok } from 'react-icons/fa';

const DEFAULT_TAGLINE =
  'Centralisez administration, pédagogie et lien avec les familles — une base unique, sécurisée et pensée pour le terrain.';

type SocialNetwork = {
  name: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  buttonClass: string;
  iconClass?: string;
};

const SOCIAL_NETWORKS: SocialNetwork[] = [
  {
    name: 'Facebook',
    href: 'https://www.facebook.com/',
    icon: FiFacebook,
    buttonClass:
      'bg-[#1877F2] hover:bg-[#1464d8] text-white shadow-[0_4px_14px_rgba(24,119,242,0.35)] hover:shadow-[0_6px_20px_rgba(24,119,242,0.45)]',
  },
  {
    name: 'Instagram',
    href: 'https://www.instagram.com/',
    icon: FiInstagram,
    buttonClass:
      'bg-gradient-to-br from-[#833AB4] via-[#E1306C] to-[#F77737] text-white shadow-[0_4px_14px_rgba(225,48,108,0.35)] hover:shadow-[0_6px_20px_rgba(225,48,108,0.45)] hover:brightness-110',
  },
  {
    name: 'LinkedIn',
    href: 'https://www.linkedin.com/',
    icon: FiLinkedin,
    buttonClass:
      'bg-[#0A66C2] hover:bg-[#095196] text-white shadow-[0_4px_14px_rgba(10,102,194,0.35)] hover:shadow-[0_6px_20px_rgba(10,102,194,0.45)]',
  },
  {
    name: 'TikTok',
    href: 'https://www.tiktok.com/',
    icon: FaTiktok,
    buttonClass:
      'bg-[#010101] hover:bg-black text-white ring-1 ring-white/10 shadow-[0_4px_14px_rgba(0,0,0,0.5)] hover:shadow-[0_6px_20px_rgba(254,44,85,0.25)]',
    iconClass: 'drop-shadow-[0_0_6px_rgba(37,244,238,0.45)]',
  },
  {
    name: 'YouTube',
    href: 'https://www.youtube.com/',
    icon: FiYoutube,
    buttonClass:
      'bg-[#FF0000] hover:bg-[#e60000] text-white shadow-[0_4px_14px_rgba(255,0,0,0.35)] hover:shadow-[0_6px_20px_rgba(255,0,0,0.45)]',
  },
];

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const { branding, navigationLogoAbsolute } = useAppBranding();
  const displayTitle = resolveSchoolDisplayName(branding);
  const tagline =
    (branding.appTagline && branding.appTagline.trim()) || DEFAULT_TAGLINE;

  return (
    <footer className="relative overflow-hidden bg-gradient-to-b from-[#0a0f2e] via-stone-950 to-zinc-950 text-stone-400 ring-1 ring-cptb-gold/15">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cptb-gold/40 to-transparent" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0 opacity-45"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(235, 176, 45, 0.14), transparent 55%), radial-gradient(ellipse 40% 30% at 90% 80%, rgba(0, 24, 168, 0.18), transparent 50%)',
        }}
        aria-hidden
      />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* À propos */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div
                className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center shadow-lg ring-2 ring-amber-500/25 overflow-hidden ${
                  navigationLogoAbsolute
                    ? 'bg-white'
                    : 'bg-gradient-to-br from-stone-800 to-stone-900 text-amber-100'
                }`}
              >
                {navigationLogoAbsolute ? (
                  <img
                    src={navigationLogoAbsolute}
                    alt=""
                    className="h-full w-full object-contain p-1"
                  />
                ) : (
                  <FiBook className="w-5 h-5" aria-hidden />
                )}
              </div>
              <span className="text-xl font-bold text-stone-100 font-display tracking-tight">
                {displayTitle}
              </span>
            </div>
            <p className="text-sm text-stone-500 mb-3 leading-relaxed">{tagline}</p>
            <Link
              href="/a-propos"
              className="mb-4 inline-flex text-sm font-semibold text-amber-200/90 transition-colors hover:text-amber-100"
            >
              À propos de nous
            </Link>
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-3">
              Suivez-nous
            </p>
            <div className="flex flex-wrap gap-2.5">
              {SOCIAL_NETWORKS.map(({ name, href, icon: Icon, buttonClass, iconClass }) => (
                <a
                  key={name}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`group w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-950 hover:-translate-y-0.5 ${buttonClass}`}
                  aria-label={name}
                  title={name}
                >
                  <Icon className={`w-5 h-5 ${iconClass ?? ''}`} aria-hidden />
                </a>
              ))}
            </div>
          </div>

          {/* Ressources */}
          <div>
            <h3 className="text-stone-100 font-bold text-lg mb-4 flex items-center gap-2">
              <FiFileText className="w-5 h-5 text-amber-400/90 shrink-0" aria-hidden />
              Ressources
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/a-propos"
                  className="text-sm text-stone-400 hover:text-amber-100 transition-colors flex items-center rounded-lg py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/45"
                >
                  <FiBook className="w-4 h-4 mr-2" />
                  À propos
                </Link>
              </li>
              <li>
                <Link
                  href="/a-propos/personnel"
                  className="text-sm text-stone-400 hover:text-amber-100 transition-colors flex items-center rounded-lg py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/45"
                >
                  <FiBook className="w-4 h-4 mr-2" />
                  Le personnel
                </Link>
              </li>
              <li>
                <Link
                  href="/a-propos/etablissements"
                  className="text-sm text-stone-400 hover:text-amber-100 transition-colors flex items-center rounded-lg py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/45"
                >
                  <FiBook className="w-4 h-4 mr-2" />
                  Nos établissements
                </Link>
              </li>
              <li>
                <Link
                  href="/a-propos/reglement-interieur"
                  className="text-sm text-stone-400 hover:text-amber-100 transition-colors flex items-center rounded-lg py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/45"
                >
                  <FiFileText className="w-4 h-4 mr-2" />
                  Règlement intérieur
                </Link>
              </li>
              <li>
                <Link
                  href="/help"
                  className="text-sm text-stone-400 hover:text-amber-100 transition-colors flex items-center rounded-lg py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/45"
                >
                  <FiHelpCircle className="w-4 h-4 mr-2" />
                  Aide
                </Link>
              </li>
              <li>
                <Link
                  href="/examens-blancs"
                  className="text-sm text-stone-400 hover:text-amber-100 transition-colors flex items-center rounded-lg py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/45"
                >
                  <FiBook className="w-4 h-4 mr-2" />
                  Examens blancs
                </Link>
              </li>
              <li>
                <Link
                  href="/faq"
                  className="text-sm text-stone-400 hover:text-amber-100 transition-colors flex items-center rounded-lg py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/45"
                >
                  <FiMessageSquare className="w-4 h-4 mr-2" />
                  FAQ
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-sm text-stone-400 hover:text-amber-100 transition-colors flex items-center rounded-lg py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/45"
                >
                  <FiMail className="w-4 h-4 mr-2" />
                  Contact
                </Link>
              </li>
              <li>
                <Link
                  href="/blog"
                  className="text-sm text-stone-400 hover:text-amber-100 transition-colors flex items-center rounded-lg py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/45"
                >
                  <FiBook className="w-4 h-4 mr-2" />
                  Blog
                </Link>
              </li>
              <li>
                <Link
                  href="/changelog"
                  className="text-sm text-stone-400 hover:text-amber-100 transition-colors flex items-center rounded-lg py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/45"
                >
                  <FiSettings className="w-4 h-4 mr-2" />
                  Notes de version
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-stone-700/80 mt-8 pt-8">
          <p className="text-sm text-stone-500 text-center">
            © {currentYear} {displayTitle}. Tous droits réservés.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

