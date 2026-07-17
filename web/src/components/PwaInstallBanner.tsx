'use client';

import { useEffect, useState } from 'react';
import { FiDownload, FiX } from 'react-icons/fi';

/**
 * Bannière d’installation PWA (Chrome / Edge / Android).
 * iOS : instructions manuelles (Ajouter à l’écran d’accueil).
 */
export default function PwaInstallBanner() {
  const [deferred, setDeferred] = useState<{ prompt: () => Promise<void> } | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const ua = window.navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIos(ios);
    setStandalone(
      window.matchMedia('(display-mode: standalone)').matches ||
        // @ts-expect-error iOS Safari
        Boolean(window.navigator.standalone)
    );
    const key = 'pwa-install-dismissed';
    if (sessionStorage.getItem(key) === '1') setDismissed(true);

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      const ev = e as Event & { prompt: () => Promise<void> };
      setDeferred({ prompt: () => ev.prompt() });
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  }, []);

  if (standalone || dismissed) return null;
  if (!deferred && !isIos) return null;

  const dismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('pwa-install-dismissed', '1');
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[80] mx-auto max-w-lg rounded-2xl border border-stone-200 bg-white/95 p-4 shadow-lg backdrop-blur sm:left-auto">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <p className="text-sm font-semibold text-stone-900">Installer l’application</p>
          <p className="mt-1 text-xs text-stone-600">
            {isIos && !deferred
              ? 'Sur iPhone : Partager → « Sur l’écran d’accueil » pour un accès rapide hors navigateur.'
              : 'Ajoutez l’école sur votre écran d’accueil pour un accès rapide (mode application).'}
          </p>
          {deferred && (
            <button
              type="button"
              onClick={async () => {
                await deferred.prompt();
                setDeferred(null);
              }}
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-amber-800 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-900"
            >
              <FiDownload className="h-3.5 w-3.5" />
              Installer
            </button>
          )}
        </div>
        <button type="button" onClick={dismiss} className="rounded-lg p-1 text-stone-400 hover:bg-stone-100" aria-label="Fermer">
          <FiX className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
