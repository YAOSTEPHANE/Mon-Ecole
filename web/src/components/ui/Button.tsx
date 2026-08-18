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
    'relative isolate inline-flex items-center justify-center font-semibold rounded-full tracking-wide transition-all duration-200 ease-premium active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 disabled:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0018A8]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-white';

  const variants = {
    primary:
      'bg-[#0018A8] text-white shadow-[0_10px_24px_-12px_rgba(0,24,168,0.55)] hover:bg-[#001066] hover:shadow-[0_14px_28px_-12px_rgba(0,24,168,0.5)] before:pointer-events-none before:absolute before:inset-x-5 before:top-0 before:h-px before:bg-white/30',
    secondary:
      'bg-white text-stone-800 ring-1 ring-[#e4e8f2] shadow-sm hover:bg-[#f7f8fc] hover:ring-[#cfd7ea]',
    danger:
      'bg-rose-600 text-white shadow-[0_8px_18px_-12px_rgba(225,29,72,0.55)] hover:bg-rose-700',
    success:
      'bg-emerald-600 text-white shadow-[0_8px_18px_-12px_rgba(5,150,105,0.5)] hover:bg-emerald-700',
    outline:
      'bg-transparent text-stone-700 ring-1 ring-stone-300 hover:bg-white hover:ring-[#0018A8]/30 hover:text-[#0018A8]',
  };

  const sizes = {
    sm: 'px-3.5 py-1.5 text-xs',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-7 py-3 text-base',
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
