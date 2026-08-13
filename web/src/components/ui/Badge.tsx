import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'default' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  style?: React.CSSProperties;
}

const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  style,
}) => {
  const variants = {
    success: 'bg-emerald-50 text-emerald-800 ring-emerald-200/80',
    warning: 'bg-amber-50 text-amber-950 ring-amber-300/80',
    danger: 'bg-rose-50 text-rose-800 ring-rose-200/80',
    info: 'bg-blue-50 text-cptb-blue ring-blue-200/80',
    default: 'bg-stone-100 text-stone-800 ring-stone-200/80',
    secondary: 'bg-gradient-to-r from-stone-50 to-amber-50/60 text-stone-800 ring-amber-200/50',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3.5 py-1.5 text-sm',
  };

  return (
    <span
      style={style}
      className={`inline-flex items-center rounded-full font-semibold tracking-wide ring-1 ring-inset ${variants[variant]} ${sizes[size]} ${className}`.trim()}
    >
      {children}
    </span>
  );
};

export default Badge;
