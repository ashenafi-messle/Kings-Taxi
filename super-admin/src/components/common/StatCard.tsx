import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

export interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive?: boolean;
    label?: string;
  };
  subtext?: string;
  accentColor?: 'gold' | 'emerald' | 'amber' | 'rose' | 'slate';
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  trend,
  subtext,
  accentColor = 'gold',
  onClick,
}) => {
  const getIconWrapperStyle = () => {
    switch (accentColor) {
      case 'emerald':
        return { backgroundColor: '#EAF7EE', color: '#15803D' };
      case 'amber':
        return { backgroundColor: '#FEF6E4', color: '#B45309' };
      case 'rose':
        return { backgroundColor: '#FEE8E8', color: '#B91C1C' };
      case 'slate':
        return { backgroundColor: '#F2E9D5', color: '#77736A' };
      case 'gold':
      default:
        return { backgroundColor: 'rgba(233, 184, 63, 0.2)', color: '#D99B19' };
    }
  };

  return (
    <div
      className={`card stat-card h-100 ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      style={{
        backgroundColor: '#FFFDF7',
        borderColor: '#E8E3D8',
        boxShadow: 'var(--shadow-sm)',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      }}
    >
      <div className="card-body p-3 d-flex flex-column justify-content-between">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <span
            className="fw-bold small text-uppercase tracking-wider text-truncate"
            style={{ color: '#77736A', fontSize: '0.72rem', letterSpacing: '0.06em' }}
          >
            {title}
          </span>
          <div
            className="d-flex align-items-center justify-content-center rounded-3 p-2 flex-shrink-0"
            style={{
              width: 40,
              height: 40,
              ...getIconWrapperStyle(),
            }}
          >
            <Icon size={20} />
          </div>
        </div>

        <div className="mt-1">
          <h2 className="h4 fw-bold mb-1" style={{ color: '#252525' }}>
            {value}
          </h2>

          <div className="d-flex align-items-center justify-content-between">
            {trend && (
              <span
                className={`d-inline-flex align-items-center gap-1 small fw-semibold ${
                  trend.isPositive ? 'text-success' : 'text-danger'
                }`}
                style={{ fontSize: '0.78rem' }}
              >
                {trend.isPositive ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                {trend.value}
                {trend.label && (
                  <span className="fw-normal ms-1" style={{ color: '#77736A' }}>
                    {trend.label}
                  </span>
                )}
              </span>
            )}
            {subtext && !trend && (
              <span className="small text-truncate" style={{ color: '#77736A', fontSize: '0.75rem' }}>
                {subtext}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
