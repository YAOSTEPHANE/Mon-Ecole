import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  /** `premium` / `luxe` : carte Insights blanche · `default` : blanc classique */
  variant?: 'default' | 'premium' | 'luxe';
  onClick?: () => void;
  style?: React.CSSProperties;
  id?: string;
}

/** Si aucune classe de padding explicite, on conserve le confort d’avant (p-6) sans conflit Tailwind */
function hasExplicitPadding(className: string): boolean {
  return /(?:^|\s)!?p(?:x|y|t|b|l|r)?-/.test(className);
}

const Card: React.FC<CardProps> = ({
  children,
  className = '',
  hover = true,
  variant = 'luxe',
  onClick,
  style,
  id,
}) => {
  const luxePad = !hasExplicitPadding(className) ? 'p-6' : '';
  const base =
    variant === 'premium'
      ? 'premium-card-surface p-6 sm:p-8'
      : variant === 'luxe'
        ? `lux-card-surface ${luxePad}`.trim()
        : 'premium-surface p-6';

  const motion = hover
    ? 'transition-all duration-200 ease-premium hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-18px_rgba(28,39,76,0.28)] hover:border-[#cfd7ea]'
    : '';

  return (
    <div
      id={id}
      style={style}
      className={`${base} ${motion} ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export default Card;
