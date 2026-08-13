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
        className={`w-full rounded-xl border-stone-200/90 bg-white/95 text-stone-900 shadow-sm transition-all duration-200 ease-premium placeholder:text-stone-400 hover:border-cptb-gold/40 focus:border-cptb-gold/55 focus:outline-none focus:ring-2 focus:ring-cptb-gold/30 ${
          compact
            ? 'border bg-white/90 py-2 pl-8 pr-3 text-sm'
            : 'border py-3 pl-10 pr-4'
        }`}
      />
    </div>
  );
};

export default SearchBar;
