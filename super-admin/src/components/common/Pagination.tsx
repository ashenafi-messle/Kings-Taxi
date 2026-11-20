import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  pageSize?: number;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
  className = '',
}) => {
  if (totalPages <= 1 && !totalItems) return null;

  const startItem = totalItems !== undefined && pageSize !== undefined ? (currentPage - 1) * pageSize + 1 : undefined;
  const endItem =
    totalItems !== undefined && pageSize !== undefined
      ? Math.min(currentPage * pageSize, totalItems)
      : undefined;

  return (
    <div
      className={`d-flex flex-column flex-sm-row align-items-center justify-content-between gap-2 pt-2 ${className}`}
    >
      {totalItems !== undefined && (
        <span className="small" style={{ color: '#77736A' }}>
          Showing <span className="fw-bold text-obsidian">{startItem}</span> to{' '}
          <span className="fw-bold text-obsidian">{endItem}</span> of{' '}
          <span className="fw-bold text-obsidian">{totalItems}</span> entries
        </span>
      )}

      <nav aria-label="Table pagination">
        <ul className="pagination pagination-sm mb-0 align-items-center gap-1">
          <li className={`page-item ${currentPage <= 1 ? 'disabled' : ''}`}>
            <button
              className="page-link rounded-2 px-2 py-1"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              aria-label="Previous"
              style={{
                backgroundColor: '#FFFDF7',
                borderColor: '#E8E3D8',
                color: currentPage <= 1 ? '#A09C94' : '#252525',
              }}
            >
              <ChevronLeft size={16} />
            </button>
          </li>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
            if (
              page === 1 ||
              page === totalPages ||
              (page >= currentPage - 1 && page <= currentPage + 1)
            ) {
              const isActive = currentPage === page;
              return (
                <li key={page} className={`page-item ${isActive ? 'active' : ''}`}>
                  <button
                    className="page-link rounded-2 px-2.5 py-1"
                    style={{
                      backgroundColor: isActive ? '#E9B83F' : '#FFFDF7',
                      borderColor: isActive ? '#E9B83F' : '#E8E3D8',
                      color: '#252525',
                      fontWeight: isActive ? 700 : 500,
                    }}
                    onClick={() => onPageChange(page)}
                  >
                    {page}
                  </button>
                </li>
              );
            } else if (page === currentPage - 2 || page === currentPage + 2) {
              return (
                <li key={page} className="page-item disabled">
                  <span className="page-link border-0 px-2" style={{ color: '#77736A', backgroundColor: 'transparent' }}>
                    ...
                  </span>
                </li>
              );
            }
            return null;
          })}

          <li className={`page-item ${currentPage >= totalPages ? 'disabled' : ''}`}>
            <button
              className="page-link rounded-2 px-2 py-1"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              aria-label="Next"
              style={{
                backgroundColor: '#FFFDF7',
                borderColor: '#E8E3D8',
                color: currentPage >= totalPages ? '#A09C94' : '#252525',
              }}
            >
              <ChevronRight size={16} />
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
};
