'use client';

import UltraPremiumPageShell from './UltraPremiumPageShell';
import AboutSubnav from './AboutSubnav';
import type { HomePageImageSlot } from '@/lib/homePageImages.types';

type AboutPageFrameProps = {
  navLabel: string;
  title: string;
  description: string;
  children: React.ReactNode;
  heroSlot?: HomePageImageSlot;
  heroDefaultPath: string;
  heroImageAlt: string;
  heroSize?: 'md' | 'lg';
  heroCutout?: boolean;
  heroKicker?: string;
};

export default function AboutPageFrame({
  navLabel,
  title,
  description,
  children,
  heroSlot,
  heroDefaultPath,
  heroImageAlt,
  heroSize = 'md',
  heroCutout = false,
  heroKicker,
}: AboutPageFrameProps) {
  return (
    <UltraPremiumPageShell
      navLabel={navLabel}
      title={title}
      description={description}
      heroVariant="cinematic"
      heroSlot={heroSlot}
      heroDefaultPath={heroDefaultPath}
      heroImageAlt={heroImageAlt}
      heroSize={heroSize}
      heroCutout={heroCutout}
      heroKicker={heroKicker}
      bodyClassName="about-canvas"
    >
      <AboutSubnav overlapping />
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6 sm:pb-24 sm:pt-8 lg:px-8">{children}</div>
    </UltraPremiumPageShell>
  );
}
