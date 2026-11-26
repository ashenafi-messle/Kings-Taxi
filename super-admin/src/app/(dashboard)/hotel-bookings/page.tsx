'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CalendarCheck,
  Eye,
  Building2,
  User,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Check,
  X,
  Calendar,
  Layers,
  Sparkles,
  Phone,
  BedDouble,
  DollarSign,
  ShieldCheck,
  Search,
} from 'lucide-react';
import { PageHeader } from '../../../components/common/PageHeader';
import { DataTable, Column } from '../../../components/common/DataTable';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { HotelService } from '../../../services/hotelService';
import { HotelBooking } from '../../../types';
import { formatDate, formatDateTime } from '../../../utils/dateUtils';
import { formatETB } from '../../../utils/formatters';

type TabKey = 'ALL' | 'PENDING' | 'CONFIRMED' | 'DECLINED' | 'CHECKED_IN' | 'COMPLETED' | 'CANCELLED';

export default function HotelBookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<HotelBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('ALL');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');

  // Approval Modals state
  const [acceptingBooking, setAcceptingBooking] = useState<HotelBooking | null>(null);
  const [acceptNote, setAcceptNote] = useState('');
  const [isSubmittingAccept, setIsSubmittingAccept] = useState(false);

  const [decliningBooking, setDecliningBooking] = useState<HotelBooking | null>(null);
  const [declineReason, setDeclineReason] = useState('Requested room inventory is no longer available');
  const [customDeclineReason, setCustomDeclineReason] = useState('');
  const [declineAdminNote, setDeclineAdminNote] = useState('');
  const [isSubmittingDecline, setIsSubmittingDecline] = useState(false);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);

  const showToast = (type: 'success' | 'danger', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4500);
  };

  const fetchBookings = async () => {
    setIsLoading(true);
    try {
      const data = await HotelService.getHotelBookings();
      setBookings(data);
    } catch (err) {
      console.error('Failed to load hotel bookings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  // Tab count badges
  const counts = useMemo(() => {
    return {
      ALL: bookings.length,
      PENDING: bookings.filter((b) => b.bookingStatus === 'PENDING').length,
      CONFIRMED: bookings.filter((b) => b.bookingStatus === 'CONFIRMED').length,
      DECLINED: bookings.filter((b) => b.bookingStatus === 'DECLINED').length,
      CHECKED_IN: bookings.filter((b) => b.bookingStatus === 'CHECKED_IN').length,
      COMPLETED: bookings.filter((b) => b.bookingStatus === 'COMPLETED').length,
      CANCELLED: bookings.filter((b) => b.bookingStatus === 'CANCELLED').length,
    };
  }, [bookings]);

  // Filtered dataset
  const filteredBookings = useMemo(() => {
    let result = [...bookings];

    if (activeTab !== 'ALL') {
      result = result.filter((b) => b.bookingStatus === activeTab);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (b) =>
          b.bookingReference.toLowerCase().includes(q) ||
          b.passengerName.toLowerCase().includes(q) ||
          (b.passengerPhone || '').toLowerCase().includes(q) ||
          b.hotelName.toLowerCase().includes(q) ||
          b.roomTypeName.toLowerCase().includes(q)
      );
    }

    if (startDateFilter) {
      result = result.filter((b) => b.checkInDate >= startDateFilter);
    }
    if (endDateFilter) {
      result = result.filter((b) => b.checkOutDate <= endDateFilter);
    }

    return result;
  }, [bookings, activeTab, searchQuery, startDateFilter, endDateFilter]);

  // Handle Accept Submit
  const handleConfirmAccept = async () => {
    if (!acceptingBooking) return;
    setIsSubmittingAccept(true);
    try {
      const res = await HotelService.acceptBooking(acceptingBooking.id, acceptNote);
      if (res.success) {
        showToast('success', `Booking ${acceptingBooking.bookingReference} accepted successfully! Room inventory reserved.`);
        setAcceptingBooking(null);
        setAcceptNote('');
        fetchBookings();
      } else {
        showToast('danger', res.error || 'Failed to accept booking.');
      }
    } catch (err: any) {
      showToast('danger', err.message || 'Error communicating with backend.');
    } finally {
      setIsSubmittingAccept(false);
    }
  };

  // Handle Decline Submit
  const handleConfirmDecline = async () => {
    if (!decliningBooking) return;
    const finalReason = declineReason === 'CUSTOM' ? customDeclineReason.trim() : declineReason;

    if (!finalReason) {
      showToast('danger', 'Please enter a valid decline reason.');
      return;
    }

    setIsSubmittingDecline(true);
    try {
      const res = await HotelService.declineBooking(
        decliningBooking.id,
        finalReason,
        declineAdminNote
      );
      if (res.success) {
        showToast('success', `Booking ${decliningBooking.bookingReference} declined and preserved in history.`);
        setDecliningBooking(null);
        setCustomDeclineReason('');
        setDeclineAdminNote('');
        fetchBookings();
      } else {
        showToast('danger', res.error || 'Failed to decline booking.');
      }
    } catch (err: any) {
      showToast('danger', err.message || 'Error communicating with backend.');
    } finally {
      setIsSubmittingDecline(false);
    }
  };

  // Table Columns (all specified columns)
  const columns: Column<HotelBooking>[] = [
    {
      key: 'bookingReference',
      header: 'Booking Ref',
      sortable: true,
      render: (b) => (
        <div>
          <span className="fw-bold font-monospace text-sm text-obsidian">{b.bookingReference}</span>
          <div className="text-muted text-xs d-flex align-items-center gap-1 mt-0.5">
            <Clock size={11} />
            <span>{formatDate(b.createdAt)}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'passengerName',
      header: 'Passenger / Guest',
      sortable: true,
      render: (b) => (
        <div>
          <div className="fw-bold text-obsidian text-sm d-flex align-items-center gap-1.5">
            <User size={13} className="text-gold" />
            <span>{b.passengerName}</span>
          </div>
          <div className="text-muted text-xs font-monospace mt-0.5">{b.passengerPhone}</div>
        </div>
      ),
    },
    {
      key: 'hotelName',
      header: 'Hotel & Room Type',
      sortable: true,
      render: (b) => (
        <div>
          <div className="fw-bold text-obsidian text-sm d-flex align-items-center gap-1.5">
            <Building2 size={13} className="text-gold" />
            <span>{b.hotelName}</span>
          </div>
          <div className="text-secondary text-xs mt-0.5 d-flex align-items-center gap-1">
            <BedDouble size={12} />
            <span>{b.roomTypeName}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'checkInDate',
      header: 'Stay Schedule',
      sortable: true,
      render: (b) => (
        <div>
          <div className="text-sm fw-medium">
            {formatDate(b.checkInDate)} &rarr; {formatDate(b.checkOutDate)}
          </div>
          <div className="text-muted text-xs mt-0.5">
            {b.numberOfNights || b.totalNights} Nights • {b.numberOfRooms} Room{b.numberOfRooms > 1 ? 's' : ''} • {b.numberOfGuests} Guest{b.numberOfGuests > 1 ? 's' : ''}
          </div>
        </div>
      ),
    },
    {
      key: 'totalAmountETB',
      header: 'Total Price (ETB)',
      sortable: true,
      render: (b) => (
        <div>
          <div className="fw-bold text-gold text-sm">{formatETB(b.totalAmountETB)}</div>
          <span
            className={`badge px-1.5 py-0.5 mt-0.5 text-xs ${
              b.paymentStatus === 'PAID'
                ? 'bg-success-subtle text-success border border-success-subtle'
                : 'bg-warning-subtle text-warning border border-warning-subtle'
            }`}
          >
            {b.paymentStatus} {b.paymentMethod ? `• ${b.paymentMethod}` : ''}
          </span>
        </div>
      ),
    },
    {
      key: 'bookingStatus',
      header: 'Booking Status',
      sortable: true,
      render: (b) => <StatusBadge status={b.bookingStatus} size="sm" />,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (b) => {
        const needsReview =
          b.bookingStatus === 'PENDING' ||
          (b.bookingStatus === 'CONFIRMED' && !b.reviewedAt && b.paymentStatus === 'PENDING');
        return (
          <div className="d-flex align-items-center justify-content-end gap-1.5" onClick={(e) => e.stopPropagation()}>
            {needsReview && (
              <>
                <button
                  type="button"
                  className="btn btn-sm py-1 px-2.5 fw-bold d-flex align-items-center gap-1 border-0 rounded-2"
                  style={{ backgroundColor: '#EAF7EE', color: '#15803D' }}
                  title="Confirm Hotel Booking Request"
                  onClick={() => setAcceptingBooking(b)}
                >
                  <Check size={14} />
                  <span>Confirm</span>
                </button>
                <button
                  type="button"
                  className="btn btn-sm py-1 px-2.5 fw-bold d-flex align-items-center gap-1 border-0 rounded-2"
                  style={{ backgroundColor: '#FEE8E8', color: '#B91C1C' }}
                  title="Decline Hotel Booking Request"
                  onClick={() => setDecliningBooking(b)}
                >
                  <X size={14} />
                  <span>Decline</span>
                </button>
              </>
            )}

            {b.bookingStatus === 'CONFIRMED' && Boolean(b.reviewedAt) && (
              <button
                type="button"
                className="btn btn-outline-success btn-sm py-1 px-2 text-xs d-flex align-items-center gap-1"
                title="Confirm Check-In Arrival"
                onClick={async () => {
                  await HotelService.updateBookingStatus(b.id, 'CHECKED_IN');
                  fetchBookings();
                  showToast('success', `Guest marked as Checked-In for ${b.bookingReference}.`);
                }}
              >
                <CheckCircle size={13} />
                <span>Check In</span>
              </button>
            )}

            <Link
              href={`/hotel-bookings/${b.id}`}
              className="btn btn-light btn-sm p-1.5 text-secondary hover-gold border"
              style={{ backgroundColor: '#FFFDF7', borderColor: '#E8E3D8' }}
              title="View Full Booking Details"
            >
              <Eye size={15} />
            </Link>
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title="Hotel Bookings & Reservations Approval"
        description="Review incoming lodging requests from the Passenger App, verify room inventory availability atomically, and decide whether to accept or decline."
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Partner Hotels', href: '/hotels' },
          { label: 'Hotel Bookings' },
        ]}
      />

      {/* Toast Feedback */}
      {toastMessage && (
        <div
          className={`alert alert-${toastMessage.type} d-flex align-items-center justify-content-between py-2.5 px-3 rounded-3 mb-3 shadow-sm`}
          role="alert"
        >
          <div className="d-flex align-items-center gap-2">
            {toastMessage.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <span className="text-sm fw-medium">{toastMessage.text}</span>
          </div>
          <button type="button" className="btn-close shadow-none" onClick={() => setToastMessage(null)} />
        </div>
      )}

      {/* Tab Navigation */}
      <div className="card rounded-3 border mb-3 overflow-hidden" style={{ backgroundColor: '#FFFDF7', borderColor: '#E8E3D8' }}>
        <div className="d-flex overflow-x-auto border-bottom py-1 px-2 gap-1 bg-white">
          {[
            { key: 'ALL', label: 'All Bookings', count: counts.ALL },
            { key: 'PENDING', label: 'Pending Review', count: counts.PENDING, highlight: true },
            { key: 'CONFIRMED', label: 'Accepted / Confirmed', count: counts.CONFIRMED },
            { key: 'DECLINED', label: 'Declined', count: counts.DECLINED },
            { key: 'CHECKED_IN', label: 'Checked In', count: counts.CHECKED_IN },
            { key: 'COMPLETED', label: 'Completed', count: counts.COMPLETED },
            { key: 'CANCELLED', label: 'Cancelled', count: counts.CANCELLED },
          ].map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as TabKey)}
                className={`btn btn-sm px-3 py-2 text-nowrap d-flex align-items-center gap-2 rounded-2 border-0 fw-semibold ${
                  isActive ? 'text-obsidian shadow-sm' : 'text-secondary'
                }`}
                style={{
                  backgroundColor: isActive ? '#F2E9D5' : 'transparent',
                  color: isActive ? '#252525' : '#77736A',
                  fontSize: '0.8125rem',
                }}
              >
                <span>{tab.label}</span>
                <span
                  className={`badge rounded-pill text-xs ${
                    tab.highlight && tab.count > 0
                      ? 'bg-danger text-white'
                      : isActive
                      ? 'bg-dark text-white'
                      : 'bg-light text-secondary border'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Date Filter Bar */}
        <div className="p-3 d-flex flex-column flex-md-row gap-2 align-items-stretch align-items-md-center justify-content-between">
          <div className="position-relative flex-grow-1" style={{ maxWidth: 360 }}>
            <span className="position-absolute top-50 start-0 translate-middle-y ps-3 text-muted">
              <Search size={15} />
            </span>
            <input
              type="text"
              className="form-control form-control-sm ps-5 pe-3 py-1.5 shadow-none text-sm"
              placeholder="Search reference, guest, hotel..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ backgroundColor: '#FFFDF7', borderColor: '#E8E3D8' }}
            />
          </div>

          <div className="d-flex align-items-center gap-2 flex-wrap">
            <div className="d-flex align-items-center gap-1.5 text-xs text-muted">
              <Calendar size={14} className="text-gold" />
              <span>Check-In From:</span>
              <input
                type="date"
                className="form-control form-control-sm shadow-none py-1 px-2 text-xs"
                value={startDateFilter}
                onChange={(e) => setStartDateFilter(e.target.value)}
                style={{ borderColor: '#E8E3D8', width: 135 }}
              />
            </div>
            <div className="d-flex align-items-center gap-1.5 text-xs text-muted">
              <span>To:</span>
              <input
                type="date"
                className="form-control form-control-sm shadow-none py-1 px-2 text-xs"
                value={endDateFilter}
                onChange={(e) => setEndDateFilter(e.target.value)}
                style={{ borderColor: '#E8E3D8', width: 135 }}
              />
            </div>
            {(searchQuery || startDateFilter || endDateFilter) && (
              <button
                type="button"
                className="btn btn-sm btn-link text-secondary text-xs p-0 text-decoration-none"
                onClick={() => {
                  setSearchQuery('');
                  setStartDateFilter('');
                  setEndDateFilter('');
                }}
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Data Table */}
      <DataTable
        columns={columns}
        data={filteredBookings}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        searchPlaceholder=""
        onRowClick={(item) => router.push(`/hotel-bookings/${item.id}`)}
      />

      {/* ========================================================================= */}
      {/* 1. ACCEPT CONFIRMATION DIALOG MODAL                                      */}
      {/* ========================================================================= */}
      {acceptingBooking && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.55)', zIndex: 1050 }}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 520 }}>
            <div
              className="modal-content rounded-4 border overflow-hidden shadow-lg"
              style={{ backgroundColor: '#FFFDF7', borderColor: '#E8E3D8' }}
            >
              {/* Header */}
              <div
                className="p-3.5 px-4 border-bottom d-flex align-items-center justify-content-between"
                style={{ backgroundColor: '#EAF7EE', borderColor: '#B7E4C7' }}
              >
                <div className="d-flex align-items-center gap-2">
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center text-white"
                    style={{ width: 34, height: 34, backgroundColor: '#15803D' }}
                  >
                    <Check size={18} />
                  </div>
                  <div>
                    <h2 className="h6 fw-bold mb-0 text-obsidian">Accept Hotel Booking Request</h2>
                    <span className="text-xs text-muted">Authoritative Central Backend Confirmation</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-close shadow-none"
                  onClick={() => setAcceptingBooking(null)}
                  disabled={isSubmittingAccept}
                />
              </div>

              {/* Body */}
              <div className="p-4">
                <p className="text-sm text-secondary mb-3">
                  You are about to accept booking <strong>{acceptingBooking.bookingReference}</strong>. Room inventory will be verified and atomically reserved on the central backend database.
                </p>

                {/* Booking Summary Box */}
                <div
                  className="p-3 rounded-3 mb-3 border text-xs"
                  style={{ backgroundColor: '#F8F5EB', borderColor: '#E8E3D8' }}
                >
                  <div className="row g-2">
                    <div className="col-6">
                      <span className="text-muted d-block">Hotel:</span>
                      <strong className="text-obsidian">{acceptingBooking.hotelName}</strong>
                    </div>
                    <div className="col-6">
                      <span className="text-muted d-block">Room Type:</span>
                      <strong className="text-obsidian">{acceptingBooking.roomTypeName}</strong>
                    </div>
                    <div className="col-6">
                      <span className="text-muted d-block">Stay Schedule:</span>
                      <span className="fw-medium text-obsidian">
                        {formatDate(acceptingBooking.checkInDate)} &rarr; {formatDate(acceptingBooking.checkOutDate)}
                      </span>
                    </div>
                    <div className="col-6">
                      <span className="text-muted d-block">Occupancy:</span>
                      <span className="fw-medium text-obsidian">
                        {acceptingBooking.numberOfRooms} Room(s) • {acceptingBooking.numberOfGuests} Guest(s)
                      </span>
                    </div>
                    <div className="col-6">
                      <span className="text-muted d-block">Lead Guest:</span>
                      <span className="fw-medium text-obsidian">{acceptingBooking.passengerName}</span>
                    </div>
                    <div className="col-6">
                      <span className="text-muted d-block">Total ETB:</span>
                      <span className="fw-bold text-gold text-sm">{formatETB(acceptingBooking.totalAmountETB)}</span>
                    </div>
                  </div>
                </div>

                {/* Inventory Verification Note */}
                <div className="d-flex align-items-center gap-2 p-2.5 rounded-2 mb-3 bg-light border text-xs">
                  <ShieldCheck size={16} className="text-success flex-shrink-0" />
                  <span>
                    <strong>Inventory Check:</strong> Central backend concurrency lock will guarantee room availability before confirming.
                  </span>
                </div>

                {/* Administrative Note */}
                <div className="mb-2">
                  <label className="form-label text-xs fw-semibold mb-1" style={{ color: '#252525' }}>
                    Optional Administrative Review Note:
                  </label>
                  <textarea
                    rows={2}
                    className="form-control form-control-sm text-xs shadow-none"
                    placeholder="e.g., Reconfirmed room availability with hotel front desk, late arrival marked..."
                    value={acceptNote}
                    onChange={(e) => setAcceptNote(e.target.value)}
                    style={{ backgroundColor: '#FFFDF7', borderColor: '#E8E3D8' }}
                  />
                </div>
              </div>

              {/* Footer */}
              <div
                className="p-3 px-4 border-top d-flex align-items-center justify-content-end gap-2"
                style={{ backgroundColor: '#F8F5EB', borderColor: '#E8E3D8' }}
              >
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => setAcceptingBooking(null)}
                  disabled={isSubmittingAccept}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-success btn-sm px-3 fw-bold d-flex align-items-center gap-1.5"
                  onClick={handleConfirmAccept}
                  disabled={isSubmittingAccept}
                >
                  {isSubmittingAccept ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status" />
                      <span>Reserving Inventory...</span>
                    </>
                  ) : (
                    <>
                      <Check size={15} />
                      <span>Confirm & Reserve Inventory</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. DECLINE CONFIRMATION DIALOG MODAL                                     */}
      {/* ========================================================================= */}
      {decliningBooking && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.55)', zIndex: 1050 }}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 520 }}>
            <div
              className="modal-content rounded-4 border overflow-hidden shadow-lg"
              style={{ backgroundColor: '#FFFDF7', borderColor: '#E8E3D8' }}
            >
              {/* Header */}
              <div
                className="p-3.5 px-4 border-bottom d-flex align-items-center justify-content-between"
                style={{ backgroundColor: '#FEE8E8', borderColor: '#FCA5A5' }}
              >
                <div className="d-flex align-items-center gap-2">
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center text-white"
                    style={{ width: 34, height: 34, backgroundColor: '#B91C1C' }}
                  >
                    <X size={18} />
                  </div>
                  <div>
                    <h2 className="h6 fw-bold mb-0 text-obsidian">Decline Hotel Booking Request</h2>
                    <span className="text-xs text-muted">Mandatory Reason Required</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-close shadow-none"
                  onClick={() => setDecliningBooking(null)}
                  disabled={isSubmittingDecline}
                />
              </div>

              {/* Body */}
              <div className="p-4">
                <p className="text-sm text-secondary mb-3">
                  You are declining booking request <strong>{decliningBooking.bookingReference}</strong> for <strong>{decliningBooking.passengerName}</strong>. The request will remain preserved in historical records and a status notification will be sent to the passenger.
                </p>

                {/* Decline Reason Dropdown */}
                <div className="mb-3">
                  <label className="form-label text-xs fw-semibold mb-1" style={{ color: '#252525' }}>
                    Select Primary Decline Reason <span className="text-danger">*</span>
                  </label>
                  <select
                    className="form-select form-select-sm text-xs shadow-none"
                    value={declineReason}
                    onChange={(e) => setDeclineReason(e.target.value)}
                    style={{ backgroundColor: '#FFFDF7', borderColor: '#E8E3D8' }}
                  >
                    <option value="Requested room inventory is no longer available">
                      Requested room inventory is no longer available
                    </option>
                    <option value="Hotel fully booked on requested dates due to annual symposium/festival">
                      Hotel fully booked on requested dates due to annual symposium/festival
                    </option>
                    <option value="Payment verification discrepancy or unconfirmed pre-authorization">
                      Payment verification discrepancy or unconfirmed pre-authorization
                    </option>
                    <option value="Stay dates fall outside partner hotel operating period">
                      Stay dates fall outside partner hotel operating period
                    </option>
                    <option value="Guest special requests exceed property accommodation limits">
                      Guest special requests exceed property accommodation limits
                    </option>
                    <option value="CUSTOM">Custom reason...</option>
                  </select>
                </div>

                {/* Custom reason input if selected */}
                {declineReason === 'CUSTOM' && (
                  <div className="mb-3">
                    <label className="form-label text-xs fw-semibold mb-1" style={{ color: '#252525' }}>
                      Specify Custom Reason <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      className="form-control form-control-sm text-xs shadow-none"
                      placeholder="Enter specific reason for declining..."
                      value={customDeclineReason}
                      onChange={(e) => setCustomDeclineReason(e.target.value)}
                      style={{ backgroundColor: '#FFFDF7', borderColor: '#E8E3D8' }}
                    />
                  </div>
                )}

                {/* Optional Admin Note */}
                <div className="mb-2">
                  <label className="form-label text-xs fw-semibold mb-1" style={{ color: '#252525' }}>
                    Optional Internal Review Note:
                  </label>
                  <textarea
                    rows={2}
                    className="form-control form-control-sm text-xs shadow-none"
                    placeholder="Internal audit notes (e.g. contacted passenger to offer alternate stay on next weekend)..."
                    value={declineAdminNote}
                    onChange={(e) => setDeclineAdminNote(e.target.value)}
                    style={{ backgroundColor: '#FFFDF7', borderColor: '#E8E3D8' }}
                  />
                </div>
              </div>

              {/* Footer */}
              <div
                className="p-3 px-4 border-top d-flex align-items-center justify-content-end gap-2"
                style={{ backgroundColor: '#F8F5EB', borderColor: '#E8E3D8' }}
              >
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => setDecliningBooking(null)}
                  disabled={isSubmittingDecline}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger btn-sm px-3 fw-bold d-flex align-items-center gap-1.5"
                  onClick={handleConfirmDecline}
                  disabled={isSubmittingDecline}
                >
                  {isSubmittingDecline ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status" />
                      <span>Declining...</span>
                    </>
                  ) : (
                    <>
                      <X size={15} />
                      <span>Decline Booking Request</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
