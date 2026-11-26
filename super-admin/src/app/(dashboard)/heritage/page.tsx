'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Landmark, Plus, Eye, MapPin, Compass, Star, CalendarCheck } from 'lucide-react';
import { PageHeader } from '../../../components/common/PageHeader';
import { DataTable, Column } from '../../../components/common/DataTable';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { FilterDropdown } from '../../../components/common/FilterDropdown';
import { HeritageService } from '../../../services/heritageService';
import { HeritageSite } from '../../../types';
import { formatETB } from '../../../utils/formatters';

export default function HeritagePage() {
  const router = useRouter();
  const [sites, setSites] = useState<HeritageSite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [cityFilter, setCityFilter] = useState('ALL');

  const fetchSites = async (silent = false) => {
    if (!silent) setIsLoading(true);
    setError(null);
    try {
      const res = await HeritageService.getHeritageSites({
        category: categoryFilter,
        city: cityFilter,
        limit: 100,
      });
      setSites(res.items);
    } catch (err: any) {
      console.error('Failed to load heritage destinations:', err);
      if (!silent) {
        setError(err?.message || 'Unable to load heritage destinations from database.');
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSites();
    const unsubscribe = HeritageService.subscribeHeritageEvents((evt) => {
      if (evt?.type?.startsWith('heritage.site.')) {
        fetchSites(true);
      }
    });
    return unsubscribe;
  }, [categoryFilter, cityFilter]);

  const columns: Column<HeritageSite>[] = [
    {
      key: 'name',
      header: 'Destination & Region',
      sortable: true,
      render: (s) => (
        <div className="d-flex align-items-center gap-2.5">
          <div
            className="rounded-3 bg-light border p-2 d-flex align-items-center justify-content-center text-gold"
            style={{ width: 42, height: 42 }}
          >
            <Landmark size={22} />
          </div>
          <div>
            <div className="fw-bold text-obsidian text-sm">{s.name}</div>
            <div className="text-muted text-xs d-flex align-items-center gap-1 mt-0.5">
              <MapPin size={12} />
              <span>
                {s.city}, {s.region}
              </span>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'unescoStatus',
      header: 'UNESCO World Heritage',
      render: (s) => (
        <div>
          {s.unescoWorldHeritage ? (
            <span className="badge bg-gold-subtle text-gold fw-bold text-xs">
              UNESCO World Heritage
            </span>
          ) : (
            <span className="badge bg-light text-muted border text-xs">National Monument</span>
          )}
        </div>
      ),
    },
    {
      key: 'tourPackages',
      header: 'Tour Packages',
      render: (s) => {
        const pkgs = s.tourPackages || [];
        return (
          <div>
            <span className="fw-bold text-obsidian text-sm">
              {pkgs.length} Available Packages
            </span>
            <div className="text-muted text-xs">
              {pkgs.length > 0
                ? `From ${formatETB(Math.min(...pkgs.map((p) => p.pricePerPersonETB)))} / person`
                : 'Custom & Direct Tours'}
            </div>
          </div>
        );
      },
    },
    {
      key: 'entranceFeeETB',
      header: 'Standard Entrance',
      sortable: true,
      render: (s) => (
        <span className="fw-bold text-gold text-sm">{formatETB(s.entranceFeeETB || s.entryFeeETB || 0)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (s) => <StatusBadge status={s.status} size="sm" />,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (s) => (
        <div className="d-flex align-items-center justify-content-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          {String(s.status) === 'PUBLISHED' ? (
            <button
              type="button"
              className="btn btn-outline-warning btn-sm py-1 px-2 text-xs"
              onClick={async () => {
                await HeritageService.unpublishHeritageSite(s.id);
                fetchSites(true);
              }}
            >
              Unpublish
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-gold btn-sm py-1 px-2 text-xs fw-semibold"
              onClick={async () => {
                await HeritageService.publishHeritageSite(s.id);
                fetchSites(true);
              }}
            >
              Publish
            </button>
          )}
          <Link
            href={`/heritage/${s.id}`}
            className="btn btn-light btn-sm p-1.5 text-secondary hover-gold border-0"
            title="View Site Details & Packages"
          >
            <Eye size={16} />
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Heritage & Tourism Destinations"
        description="Historic cultural attractions, national parks, guided tour packages, and private tourism transport logistics"
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Heritage Sites' },
        ]}
        actions={
          <div className="d-flex align-items-center gap-2">
            <Link href="/heritage-bookings" className="btn btn-outline-secondary btn-sm">
              <CalendarCheck size={14} className="me-1" />
              <span>Tour Bookings</span>
            </Link>
            <Link
              href="/heritage/new"
              className="btn btn-gold btn-sm d-flex align-items-center gap-1.5 fw-semibold"
            >
              <Plus size={16} />
              <span>Add Heritage Destination</span>
            </Link>
          </div>
        }
      />

      {error && (
        <div className="alert alert-danger d-flex align-items-center justify-content-between py-2.5 px-3 mb-3 rounded-3 text-sm">
          <span>{error}</span>
          <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => fetchSites(false)}>
            Retry
          </button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={sites}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        searchPlaceholder="Search destination by name, city, region..."
        searchKeys={['name', 'city', 'region']}
        onRowClick={(item) => router.push(`/heritage/${item.id}`)}
        filters={
          <div className="d-flex flex-wrap align-items-center gap-2">
            <FilterDropdown
              label="Location"
              value={cityFilter}
              onChange={setCityFilter}
              options={[
                { value: 'ALL', label: 'All Regions' },
                { value: 'Gondar', label: 'Gondar' },
                { value: 'Debark', label: 'Debark / Simien' },
                { value: 'Lalibela', label: 'Lalibela' },
              ]}
            />
          </div>
        }
      />
    </div>
  );
}
