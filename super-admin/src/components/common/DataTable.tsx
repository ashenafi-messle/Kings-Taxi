import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { SearchInput } from './SearchInput';
import { Pagination } from './Pagination';
import { EmptyState } from './EmptyState';
import { LoadingSkeleton } from './LoadingSkeleton';

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (item: T) => React.ReactNode;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  isLoading?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchKeys?: (keyof T)[];
  filters?: React.ReactNode;
  actions?: React.ReactNode;
  title?: string;
  subtitle?: string;
  pageSize?: number;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (item: T) => void;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  searchable = true,
  searchPlaceholder = 'Search records...',
  searchKeys = [],
  filters,
  actions,
  title,
  subtitle,
  pageSize = 10,
  emptyTitle = 'No records found',
  emptyDescription = 'There are no items matching your criteria at this moment.',
  onRowClick,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Search filter
  const filteredData = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase().trim();

    return data.filter((item) => {
      if (searchKeys.length > 0) {
        return searchKeys.some((k) => {
          const val = item[k];
          return val !== undefined && val !== null && String(val).toLowerCase().includes(q);
        });
      }
      return Object.values(item).some(
        (val) => val !== undefined && val !== null && String(val).toLowerCase().includes(q)
      );
    });
  }, [data, search, searchKeys]);

  // Sorting
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    return [...filteredData].sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];

      if (valA === valB) return 0;
      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }

      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      return sortDirection === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });
  }, [filteredData, sortKey, sortDirection]);

  // Pagination
  const totalItems = sortedData.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortKey(null);
      }
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  return (
    <div
      className="card rounded-3 overflow-hidden"
      style={{
        backgroundColor: '#FFFDF7',
        borderColor: '#E8E3D8',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {/* Table Header Controls */}
      <div
        className="card-header p-3 border-bottom"
        style={{ backgroundColor: '#FFFDF7', borderColor: '#E8E3D8' }}
      >
        <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
          <div>
            {title && (
              <h3 className="h6 fw-bold mb-0" style={{ color: '#252525' }}>
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="small mb-0 mt-0.5" style={{ color: '#77736A' }}>
                {subtitle}
              </p>
            )}
          </div>

          <div className="d-flex flex-wrap align-items-center gap-2">
            {searchable && (
              <SearchInput
                value={search}
                onChange={(val) => {
                  setSearch(val);
                  setCurrentPage(1);
                }}
                placeholder={searchPlaceholder}
                className="w-auto flex-grow-1 flex-sm-grow-0"
              />
            )}
            {filters}
            {actions}
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="table-responsive">
        <table className="table table-hover align-middle mb-0">
          <thead>
            <tr>
              {columns.map((col) => {
                const isSorted = sortKey === col.key;
                return (
                  <th
                    key={col.key}
                    style={{
                      width: col.width,
                      cursor: col.sortable ? 'pointer' : 'default',
                      textAlign: col.align || 'left',
                      backgroundColor: '#F2E9D5',
                      color: '#77736A',
                      borderColor: '#E8E3D8',
                    }}
                    onClick={() => col.sortable && handleSort(col.key)}
                    className="py-3 px-3 fw-bold border-bottom"
                  >
                    <div
                      className={`d-flex align-items-center gap-1 ${
                        col.align === 'right'
                          ? 'justify-content-end'
                          : col.align === 'center'
                          ? 'justify-content-center'
                          : 'justify-content-start'
                      }`}
                    >
                      <span>{col.header}</span>
                      {col.sortable && (
                        <span style={{ color: isSorted ? '#D99B19' : '#A09C94' }}>
                          {isSorted ? (
                            sortDirection === 'asc' ? (
                              <ChevronUp size={14} />
                            ) : (
                              <ChevronDown size={14} />
                            )
                          ) : (
                            <ChevronsUpDown size={14} />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="p-4">
                  <LoadingSkeleton rows={5} />
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-4">
                  <EmptyState title={emptyTitle} description={emptyDescription} />
                </td>
              </tr>
            ) : (
              paginatedData.map((item) => (
                <tr
                  key={keyExtractor(item)}
                  onClick={() => onRowClick && onRowClick(item)}
                  style={{
                    cursor: onRowClick ? 'pointer' : 'default',
                    borderColor: '#F0EBE1',
                  }}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      style={{
                        textAlign: col.align || 'left',
                        color: '#252525',
                        borderColor: '#F0EBE1',
                      }}
                      className="py-3 px-3 text-sm"
                    >
                      {col.render ? col.render(item) : item[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {!isLoading && paginatedData.length > 0 && (
        <div
          className="card-footer px-3 py-2 border-top"
          style={{ backgroundColor: '#FFFDF7', borderColor: '#E8E3D8' }}
        >
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={(page) => setCurrentPage(page)}
          />
        </div>
      )}
    </div>
  );
}
