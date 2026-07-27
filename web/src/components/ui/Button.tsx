import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'default';
  isLoading?: boolean;
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size: sizeProp = 'md',
  isLoading = false,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const size = sizeProp === 'default' ? 'md' : sizeProp;
  const baseStyles =
    'font-semibold rounded-xl tracking-wide transition-all duration-300 ease-premium hover:-translate-y-px active:translate-y-0 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:active:scale-100 disabled:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cptb-gold/50 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-50';

  const variants = {
    primary:
      'bg-gradient-to-br from-cptb-blue via-brand-700 to-cptb-blue-dark text-white border border-cptb-gold/30 shadow-lux-soft hover:shadow-lux hover:border-cptb-gold/55',
    secondary:
      'bg-white/95 text-stone-800 border border-stone-300/90 shadow-sm hover:border-cptb-gold/50 hover:shadow-md hover:bg-amber-50/40',
    danger:
      'bg-gradient-to-br from-cptb-red to-rose-900 text-white border border-white/10 shadow-md hover:shadow-lg',
    success:
      'bg-gradient-to-br from-cptb-green to-emerald-900 text-emerald-50 border border-cptb-green-light/25 shadow-md hover:shadow-lg',
    outline:
      'bg-transparent text-stone-700 border border-stone-400/80 hover:bg-stone-100/80 hover:border-cptb-blue/40 shadow-sm',
  };

  const sizes = {
    sm: 'px-3.5 py-2 text-sm',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-7 py-3.5 text-base',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center justify-center">
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Chargement...
        </span>
      ) : (
        children
      )}
    </button>
  );
};

export default Button;
