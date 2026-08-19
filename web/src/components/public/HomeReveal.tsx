'use client';

import { useRef, useEffect, useState, type ReactNode, type CSSProperties } from 'react';

type HomeRevealProps = {
  children: ReactNode;
  className?: string;
  /** Décalage avant le début de l'animation (ms), une fois visible */
  delayMs?: number;
};

/**
 * Révélation au scroll (Intersection Observer), une seule fois.
 * Le délai d'animation n'est appliqué qu'après hydratation (évite les écarts SSR/client).
 */
export default function HomeReveal({ children, className = '', delayMs = 0 }: HomeRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const markVisibleIfStaggered = () => {
      if (el.classList.contains('public-stagger-item')) {
        setVisible(true);
        return true;
      }
      return false;
    };

    const selfMo = new MutationObserver(() => {
      if (markVisibleIfStaggered()) selfMo.disconnect();
    });
    selfMo.observe(el, { attributes: true, attributeFilter: ['class'] });
    if (markVisibleIfStaggered()) {
      return () => selfMo.disconnect();
    }

    const parentSection = el.closest('.public-section-reveal');
    if (parentSection) {
      const revealFromParent = () => {
        if (parentSection.classList.contains('public-section-reveal--visible')) {
          setVisible(true);
          return true;
        }
        return false;
      };
      if (revealFromParent()) {
        return () => selfMo.disconnect();
      }
      const mo = new MutationObserver(() => {
        if (revealFromParent()) mo.disconnect();
      });
      mo.observe(parentSection, { attributes: true, attributeFilter: ['class'] });
      return () => {
        mo.disconnect();
        selfMo.disconnect();
      };
    }

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.06 }
    );
    obs.observe(el);
    return () => {
      obs.disconnect();
      selfMo.disconnect();
    };
  }, []);

  const revealStyle: CSSProperties | undefined =
    hydrated && visible && delayMs > 0 ? { transitionDelay: `${delayMs}ms` } : undefined;

  return (
    <div
      ref={ref}
      className={`home-scroll-reveal ${visible ? 'home-scroll-reveal--visible' : ''} ${className}`.trim()}
      style={revealStyle}
    >
      {children}
    </div>
  );
}
