import React from 'react';
import { Search, X } from 'lucide-react';

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = 'Search...',
  className = '',
}) => {
  return (
    <div className={`position-relative ${className}`}>
      <span
        className="position-absolute top-50 start-0 translate-middle-y ps-3 text-muted"
        style={{ pointerEvents: 'none' }}
      >
        <Search size={16} />
      </span>
      <input
        type="text"
        className="form-control ps-5 pe-4 py-2 text-sm shadow-none"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ borderRadius: '0.5rem', borderColor: 'var(--color-border)' }}
      />
      {value && (
        <button
          type="button"
          className="btn position-absolute top-50 end-0 translate-middle-y pe-3 text-muted border-0 bg-transparent p-0"
          onClick={() => onChange('')}
          aria-label="Clear search"
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
};
