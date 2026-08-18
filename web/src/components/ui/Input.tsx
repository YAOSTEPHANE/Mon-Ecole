import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

const Input: React.FC<InputProps> = ({ label, error, icon, className = '', ...props }) => {
  return (
    <div className="w-full">
      {label && (
        <label className="mb-2 block text-sm font-semibold tracking-wide text-stone-800">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-stone-400">
            {icon}
          </div>
        )}
        <input
          className={`w-full rounded-xl border bg-white px-4 py-3 text-stone-900 shadow-[inset_0_1px_2px_rgba(28,39,76,0.04)] placeholder:text-stone-400 transition-all duration-200 ease-premium focus:outline-none focus:ring-2 focus:ring-[#0018A8]/20 focus:ring-offset-2 focus:ring-offset-white hover:border-[#cfd7ea] ${
            error
              ? 'border-red-400 focus:border-red-400 focus:ring-red-400/30'
              : 'border-[#e4e8f2] focus:border-[#0018A8]/45'
          } ${icon ? 'pl-10' : ''} ${className}`}
          {...props}
        />
      </div>
      {error && <p className="mt-1.5 text-sm font-medium text-red-700">{error}</p>}
    </div>
  );
};

export default Input;
