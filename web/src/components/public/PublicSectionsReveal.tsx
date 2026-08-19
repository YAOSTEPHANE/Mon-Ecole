'use client';

import { useEffect, useRef, type ReactNode } from 'react';

type PublicSectionsRevealProps = {
  children: ReactNode;
  className?: string;
  extraSelector?: string;
};

function isTopLevelBlock(el: HTMLElement): boolean {
  return !el.parentElement?.closest('section');
}

/**
 * Anime les blocs publics (sections, pied de page, cartes) à l’entrée dans le viewport.
 */
export default function PublicSectionsReveal({
  children,
  className = '',
  extraSelector = '',
}: PublicSectionsRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const attached = new WeakSet<Element>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('public-section-reveal--visible');
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );

    const attach = () => {
      const sections = [...root.querySelectorAll<HTMLElement>('section, footer')].filter(isTopLevelBlock);
      const extras = extraSelector
        ? [...root.querySelectorAll<HTMLElement>(extraSelector)]
        : [];

      sections.forEach((el, index) => {
        if (attached.has(el)) return;
        attached.add(el);
        el.classList.add('public-section-reveal');
        el.style.setProperty('--public-reveal-index', String(index));
        const isHero = el.classList.contains('home-hero-shell');
        if (isHero) {
          el.classList.add('public-section-reveal--hero', 'public-section-reveal--visible');
          return;
        }
        if (reduceMotion) {
          el.classList.add('public-section-reveal--visible');
          return;
        }
        observer.observe(el);
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.94 && rect.bottom > 48) {
          el.classList.add('public-section-reveal--visible');
          observer.unobserve(el);
        }
      });

      extras.forEach((el, index) => {
        if (attached.has(el)) return;
        attached.add(el);
        el.classList.add('public-stagger-item');
        el.style.setProperty('--public-stagger-delay', `${Math.min(index, 12) * 70}ms`);
        if (reduceMotion) {
          el.classList.add('public-section-reveal--visible');
          return;
        }
        observer.observe(el);
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.94 && rect.bottom > 48) {
          el.classList.add('public-section-reveal--visible');
          observer.unobserve(el);
        }
      });
    };

    attach();
    const mutations = new MutationObserver(attach);
    mutations.observe(root, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutations.disconnect();
    };
  }, [extraSelector]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
