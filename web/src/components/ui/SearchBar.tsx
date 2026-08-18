import React from 'react';
import { FiSearch } from 'react-icons/fi';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  /** Hauteur et texte réduits (ex. barre outils Élèves) */
  compact?: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Rechercher...',
  className = '',
  compact = false,
}) => {
  return (
    <div className={`relative ${className}`}>
      <div
        className={`pointer-events-none absolute inset-y-0 left-0 flex items-center ${compact ? 'pl-2' : 'pl-3'}`}
      >
        <FiSearch className={`text-stone-400 ${compact ? 'h-4 w-4' : 'h-5 w-5'}`} />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-full border-[#e4e8f2] bg-white text-stone-900 shadow-[inset_0_1px_2px_rgba(28,39,76,0.04)] transition-all duration-200 ease-premium placeholder:text-stone-400 hover:border-[#cfd7ea] focus:border-[#0018A8]/40 focus:outline-none focus:ring-2 focus:ring-[#0018A8]/18 ${
          compact
            ? 'border bg-white py-2 pl-8 pr-3 text-sm'
            : 'border py-3 pl-10 pr-4'
        }`}
      />
    </div>
  );
};

export default SearchBar;
