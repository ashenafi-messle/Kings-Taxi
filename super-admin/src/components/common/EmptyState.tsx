import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div
      className={`text-center py-5 px-3 d-flex flex-column align-items-center justify-content-center ${className}`}
    >
      <div
        className="rounded-circle bg-gold-subtle text-gold d-flex align-items-center justify-content-center mb-3"
        style={{ width: 56, height: 56 }}
      >
        <Icon size={28} />
      </div>
      <h3 className="h6 fw-bold text-obsidian mb-1">{title}</h3>
      <p className="text-muted small mb-3 max-w-md" style={{ maxWidth: 420 }}>
        {description}
      </p>
      {action && (
        <button type="button" className="btn btn-gold btn-sm px-3" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  );
};
