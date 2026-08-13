import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** `wide` = max-w-3xl (formulaires élève, etc.), `xl` = max-w-4xl */
  size?: 'sm' | 'md' | 'lg' | 'wide' | 'xl';
  /** En-tête et corps plus compacts (formulaires élève, etc.) */
  compact?: boolean;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md', compact = false }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    wide: 'max-w-3xl',
    xl: 'max-w-4xl',
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center px-4 pb-20 pt-4 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 z-[9998] bg-[#07081a]/70 backdrop-blur-md transition-opacity"
          onClick={onClose}
        />

        <div
          className={`relative z-[9999] w-full transform overflow-hidden rounded-3xl border border-stone-200/70 bg-gradient-to-b from-stone-50 to-white text-left shadow-lux ring-1 ring-amber-900/10 transition-all sm:my-8 sm:align-middle ${sizes[size]} ${
            compact
              ? 'inline-flex max-h-[min(88vh,820px)] flex-col'
              : 'inline-block align-bottom'
          }`}
        >
          {title && (
            <div
              className={`flex shrink-0 items-center justify-between border-b border-cptb-gold/25 bg-gradient-to-r from-[#0a0f2e] via-[#001270] to-stone-950 ${
                compact ? 'px-4 py-2.5' : 'px-6 py-4'
              }`}
            >
              <h3
                className={`font-display font-semibold tracking-[0.04em] text-amber-50 ${
                  compact ? 'text-lg' : 'text-xl md:text-2xl'
                }`}
              >
                {title}
              </h3>
              <button
                type="button"
                title="Fermer"
                aria-label="Fermer la fenêtre"
                onClick={onClose}
                className={`rounded-lg text-amber-100/90 transition-all duration-200 hover:bg-amber-500/15 hover:text-white ${
                  compact ? 'p-1.5' : 'p-2'
                }`}
              >
                <svg
                  className={compact ? 'h-5 w-5' : 'h-6 w-6'}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          <div
            className={`bg-gradient-to-b from-white to-stone-50/50 ${
              compact
                ? 'min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-3'
                : 'px-6 py-6'
            }`}
          >
            {children}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default Modal;

