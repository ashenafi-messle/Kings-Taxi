import React from 'react';

export interface StatusBadgeProps {
  status: string;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  size = 'md',
  className = '',
}) => {
  const normStatus = (status || '').toUpperCase();
  const displayLabel = label || (status ? String(status).replace(/_/g, ' ') : 'ACTIVE');

  // Determine variant styling
  let badgeStyle = {
    backgroundColor: '#F2E9D5',
    color: '#77736A',
    borderColor: '#E8E3D8',
    dotColor: '#77736A',
  };

  switch (normStatus) {
    // Success / Green
    case 'ACTIVE':
    case 'APPROVED':
    case 'VERIFIED':
    case 'ONLINE':
    case 'COMPLETED':
    case 'CONFIRMED':
    case 'RESOLVED':
    case 'CHECKED_IN':
    case 'CHECKED_OUT':
    case 'OPERATIONAL':
    case 'PAID':
    case 'ONBOARDING_EMAIL_SENT':
    case 'SENT':
      badgeStyle = {
        backgroundColor: '#EAF7EE',
        color: '#15803D',
        borderColor: '#B7E4C7',
        dotColor: '#15803D',
      };
      break;

    // Warning / Golden-Amber
    case 'PENDING':
    case 'UPCOMING':
    case 'IN_PROGRESS':
    case 'ACCEPTED':
    case 'REQUESTED':
    case 'ON_TRIP':
    case 'DRIVER_ASSIGNED':
    case 'DRIVER_APPROACHING':
    case 'WAITING_FOR_RESPONSE':
    case 'UNDER_REVIEW':
    case 'DEGRADED':
    case 'MEDIUM':
    case 'HIGH':
    case 'PENDING_ONBOARDING':
    case 'NOT_SENT':
      badgeStyle = {
        backgroundColor: '#FEF6E4',
        color: '#B45309',
        borderColor: '#FCD34D',
        dotColor: '#B45309',
      };
      break;

    // Danger / Red
    case 'SUSPENDED':
    case 'REJECTED':
    case 'DECLINED':
    case 'CANCELLED':
    case 'CLOSED':
    case 'CRITICAL':
    case 'MAINTENANCE':
    case 'UNDER_MAINTENANCE':
    case 'FAILED':
    case 'ONBOARDING_EMAIL_FAILED':
    case 'ONBOARDING_EXPIRED':
      badgeStyle = {
        backgroundColor: '#FEE8E8',
        color: '#B91C1C',
        borderColor: '#FCA5A5',
        dotColor: '#B91C1C',
      };
      break;

    // Secondary / Neutral
    case 'OFFLINE':
    case 'INACTIVE':
    case 'LOW':
    default:
      badgeStyle = {
        backgroundColor: '#F2E9D5',
        color: '#77736A',
        borderColor: '#E8E3D8',
        dotColor: '#77736A',
      };
      break;
  }

  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-xs'
      : size === 'lg'
      ? 'px-3 py-1.5 text-sm'
      : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`d-inline-flex align-items-center gap-1.5 fw-bold text-uppercase border rounded-pill ${sizeClasses} ${className}`}
      style={{
        backgroundColor: badgeStyle.backgroundColor,
        color: badgeStyle.color,
        borderColor: badgeStyle.borderColor,
        letterSpacing: '0.04em',
        fontSize: size === 'sm' ? '0.6875rem' : '0.75rem',
      }}
    >
      <span
        className="rounded-circle d-inline-block"
        style={{
          width: 6,
          height: 6,
          backgroundColor: badgeStyle.dotColor,
          flexShrink: 0,
        }}
      />
      <span>{displayLabel}</span>
    </span>
  );
};
