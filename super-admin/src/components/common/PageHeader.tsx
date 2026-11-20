import React from 'react';
import Link from 'next/link';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  breadcrumbs = [{ label: 'Dashboard', href: '/' }],
  actions,
}) => {
  return (
    <div
      className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between mb-4 pb-2 border-bottom"
      style={{ borderColor: '#E8E3D8' }}
    >
      <div>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="breadcrumb" className="mb-1.5">
            <ol className="breadcrumb mb-0 py-0" style={{ fontSize: '0.8125rem' }}>
              {breadcrumbs.map((crumb, idx) => {
                const isLast = idx === breadcrumbs.length - 1;
                return (
                  <li
                    key={idx}
                    className={`breadcrumb-item ${isLast ? 'active fw-bold' : ''}`}
                    aria-current={isLast ? 'page' : undefined}
                    style={{ color: isLast ? '#D99B19' : '#77736A' }}
                  >
                    {!isLast && crumb.href ? (
                      <Link href={crumb.href} className="text-decoration-none hover-gold" style={{ color: '#77736A' }}>
                        {crumb.label}
                      </Link>
                    ) : (
                      <span>{crumb.label}</span>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        )}
        <h1 className="h3 fw-bold mb-1" style={{ color: '#252525' }}>
          {title}
        </h1>
        {description && (
          <p className="mb-0 small" style={{ color: '#77736A' }}>
            {description}
          </p>
        )}
      </div>

      {actions && <div className="mt-3 mt-md-0 d-flex flex-wrap align-items-center gap-2">{actions}</div>}
    </div>
  );
};
