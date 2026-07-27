import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  /** `premium` : verre dépoli · `luxe` : pierre + or tamisé (défaut) · `default` : blanc classique */
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
        : 'bg-white/95 rounded-2xl shadow-dash-card p-6 ring-1 ring-stone-200/60';

  const motion =
    hover && variant === 'premium'
      ? 'transition-all duration-300 ease-premium hover:shadow-premium hover:-translate-y-0.5'
      : hover && variant === 'luxe'
        ? 'transition-all duration-500 ease-premium hover:shadow-dash-card-hover hover:-translate-y-0.5'
        : hover
          ? 'transition-all duration-300 ease-premium hover:shadow-dash-card-hover hover:-translate-y-0.5'
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
