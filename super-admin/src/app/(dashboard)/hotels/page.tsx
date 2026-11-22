'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Briefcase,
  Plus,
  Eye,
  Star,
  MapPin,
  BedDouble,
  Phone,
  CalendarCheck,
} from 'lucide-react';
import { PageHeader } from '../../../components/common/PageHeader';
import { DataTable, Column } from '../../../components/common/DataTable';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { FilterDropdown } from '../../../components/common/FilterDropdown';
import { HotelService } from '../../../services/hotelService';
import { Hotel } from '../../../types';

export default function HotelsPage() {
  const router = useRouter();
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [cityFilter, setCityFilter] = useState('ALL');

  const fetchHotels = async () => {
    setIsLoading(true);
    try {
      const res = await HotelService.getHotels({
        category: categoryFilter,
        city: cityFilter,
        limit: 100,
      });
      setHotels(res.items);
    } catch (err) {
      console.error('Failed to load hotels:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHotels();
  }, [categoryFilter, cityFilter]);

  const columns: Column<Hotel>[] = [
    {
      key: 'name',
      header: 'Hotel & Location',
      sortable: true,
      render: (h) => (
        <div className="d-flex align-items-center gap-2.5">
          <div
            className="rounded-3 bg-light border p-2 d-flex align-items-center justify-content-center text-gold"
            style={{ width: 42, height: 42 }}
          >
            <Building2 size={22} />
          </div>
          <div>
            <div className="fw-bold text-obsidian text-sm">{h.name}</div>
            {h.partner?.businessName && (
              <div className="text-gold text-xs d-flex align-items-center gap-1">
                <Briefcase size={11} />
                <span>{h.partner.businessName}</span>
              </div>
            )}
            <div className="text-muted text-xs d-flex align-items-center gap-1 mt-0.5">
              <MapPin size={12} />
              <span>
                {h.address}, {h.city}
              </span>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'starRating',
      header: 'Rating & Tier',
      sortable: true,
      render: (h) => (
        <div>
          <div className="d-flex align-items-center gap-1 text-sm fw-semibold">
            <Star size={14} className="text-gold fill-gold" />
            <span>{h.starRating} Stars</span>
          </div>
          <span className="badge bg-light text-dark border mt-1 text-xs">{h.categoryLabel}</span>
        </div>
      ),
    },
    {
      key: 'roomInventory',
      header: 'Room Inventory',
      render: (h) => {
        let totalInv = 0;
        let availInv = 0;
        h.roomTypes.forEach((rt) => {
          totalInv += rt.totalInventory;
          availInv += rt.availableInventory ?? rt.availableRooms ?? 0;
        });
        const booked = totalInv - availInv;
        return (
          <div>
            <div className="d-flex align-items-center gap-1.5 text-sm fw-bold text-obsidian">
              <BedDouble size={15} className="text-muted" />
              <span>
                {availInv} / {totalInv} Available
              </span>
            </div>
            <div className="text-muted text-xs">{booked} occupied / booked</div>
          </div>
        );
      },
    },
    {
      key: 'phone',
      header: 'Contact',
      render: (h) => (
        <div>
          <div className="text-sm fw-medium font-monospace">{h.phone}</div>
          <div className="text-muted text-xs">{h.email}</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (h) => <StatusBadge status={h.status} size="sm" />,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (h) => (
        <div className="d-flex align-items-center justify-content-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Link
            href={`/hotels/${h.id}`}
            className="btn btn-light btn-sm p-1.5 text-secondary hover-gold border-0"
            title="Manage Hotel & Room Inventory"
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
        title="Partner Hotels & Lodging"
        description="Manage partner properties, dynamic room inventories, night tariffs in ETB, and guest reservation allocations"
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Partner Hotels' },
        ]}
        actions={
          <div className="d-flex align-items-center gap-2">
            <Link href="/hotel-partners" className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1.5">
              <Briefcase size={14} />
              <span>Hotel Partners</span>
            </Link>
            <Link href="/hotel-bookings" className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1.5">
              <CalendarCheck size={14} />
              <span>View Bookings</span>
            </Link>
            <Link
              href="/hotels/new"
              className="btn btn-gold btn-sm d-flex align-items-center gap-1.5 fw-semibold"
            >
              <Plus size={16} />
              <span>Add Partner Hotel</span>
            </Link>
          </div>
        }
      />

      <DataTable
        columns={columns}
        data={hotels}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        searchPlaceholder="Search hotel by name, city, address..."
        searchKeys={['name', 'city', 'address']}
        onRowClick={(item) => router.push(`/hotels/${item.id}`)}
        filters={
          <div className="d-flex flex-wrap align-items-center gap-2">
            <FilterDropdown
              label="City"
              value={cityFilter}
              onChange={setCityFilter}
              options={[
                { value: 'ALL', label: 'All Cities' },
                { value: 'Gondar', label: 'Gondar' },
                { value: 'Bahir Dar', label: 'Bahir Dar' },
                { value: 'Lalibela', label: 'Lalibela' },
              ]}
            />
            <FilterDropdown
              label="Tier"
              value={categoryFilter}
              onChange={setCategoryFilter}
              options={[
                { value: 'ALL', label: 'All Categories' },
                { value: 'LUXURY_RESORT', label: 'Luxury Resort' },
                { value: 'HISTORIC_HERITAGE', label: 'Historic Heritage' },
                { value: 'BOUTIQUE', label: 'Boutique Hotel' },
              ]}
            />
          </div>
        }
      />
    </div>
  );
}
