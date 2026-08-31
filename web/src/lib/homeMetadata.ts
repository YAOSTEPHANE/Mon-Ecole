import type { Metadata } from 'next';
import {
  resolveSchoolDisplayName,
  resolveSchoolTagline,
} from '@/lib/resolveSchoolBranding';

export type BrandingPayload = {
  appTitle?: string | null;
  appTagline?: string | null;
  schoolDisplayName?: string | null;
  faviconUrl?: string | null;
  navigationLogoUrl?: string | null;
  loginLogoUrl?: string | null;
};

function getServerApiBaseUrl(): string {
  const n = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '').trim();
  if (n?.startsWith('http')) {
    const u = new URL(n);
    const path = (u.pathname || '/').replace(/\/+$/, '') || '/';
    if (path === '/' || path === '') {
      return `${u.origin}/api`;
    }
    return n;
  }
  if (process.env.VERCEL_URL) {
    const path = n?.startsWith('/') ? n : '/api';
    return `https://${process.env.VERCEL_URL}${path}`;
  }
  if (n?.startsWith('/')) {
    return `http://localhost:5000${n}`;
  }
  return 'http://localhost:5000/api';
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchPublicAppBrandingForMetadata(): Promise<BrandingPayload | null> {
  const base = getServerApiBaseUrl().replace(/\/+$/, '');
  const url = `${base}/public/app-branding`;
  const isDev = process.env.NODE_ENV === 'development';
  const attempts = isDev ? 8 : 2;
  const delayMs = 400;

  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, {
        next: { revalidate: isDev ? 0 : 120 },
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) return null;
      return (await res.json()) as BrandingPayload;
    } catch {
      if (i < attempts - 1) await sleep(delayMs);
    }
  }
  return null;
}

export async function buildHomePageMetadata(): Promise<Metadata> {
  const b = await fetchPublicAppBrandingForMetadata();
  const name = resolveSchoolDisplayName(b);
  const desc =
    resolveSchoolTagline(b) ||
    `${name} : excellence éducative, innovation et formation de qualité.`;
  return {
    title: `${name} · Accueil`,
    description: desc,
    openGraph: {
      title: `${name} · Accueil`,
      description: desc,
    },
  };
}

export async function buildAboutPageMetadata(): Promise<Metadata> {
  const b = await fetchPublicAppBrandingForMetadata();
  const name = resolveSchoolDisplayName(b);
  const description = `Découvrez ${name} : identité, atouts, plateforme, personnel, établissements et règlement intérieur.`;
  return {
    title: `À propos · ${name}`,
    description,
    openGraph: {
      title: `À propos · ${name}`,
      description,
    },
  };
}
