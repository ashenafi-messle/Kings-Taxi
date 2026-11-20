import React from 'react';

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterDropdownProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  className?: string;
}

export const FilterDropdown: React.FC<FilterDropdownProps> = ({
  label,
  value,
  onChange,
  options,
  className = '',
}) => {
  return (
    <div className={`d-flex align-items-center gap-2 ${className}`}>
      {label && <label className="form-label mb-0 text-muted small fw-medium text-nowrap">{label}:</label>}
      <select
        className="form-select form-select-sm py-2 text-sm shadow-none"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          borderRadius: '0.5rem',
          borderColor: 'var(--color-border)',
          minWidth: 140,
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
};
