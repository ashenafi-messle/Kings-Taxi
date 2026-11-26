'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Compass,
  Eye,
  Landmark,
  User,
  CalendarCheck,
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
  Car,
  MapPin,
  ShieldCheck,
  Search,
} from 'lucide-react';
import { PageHeader } from '../../../components/common/PageHeader';
import { DataTable, Column } from '../../../components/common/DataTable';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { HeritageService } from '../../../services/heritageService';
import { HeritageTourBooking } from '../../../types';
import { formatDate, formatDateTime } from '../../../utils/dateUtils';
import { formatETB } from '../../../utils/formatters';

type TabKey = 'ALL' | 'PENDING' | 'CONFIRMED' | 'DECLINED' | 'UPCOMING' | 'COMPLETED' | 'CANCELLED';

export default function HeritageBookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<HeritageTourBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('ALL');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // Approval Modals state
  const [acceptingBooking, setAcceptingBooking] = useState<HeritageTourBooking | null>(null);
  const [acceptNote, setAcceptNote] = useState('');
  const [isSubmittingAccept, setIsSubmittingAccept] = useState(false);

  const [decliningBooking, setDecliningBooking] = useState<HeritageTourBooking | null>(null);
  const [declineReason, setDeclineReason] = useState('Tour schedule capacity reached for selected date');
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
      const data = await HeritageService.getHeritageBookings();
      setBookings(data);
    } catch (err) {
      console.error('Failed to load heritage tour bookings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
    const unsubscribe = HeritageService.subscribeHeritageEvents(() => {
      fetchBookings();
    });
    const onFocus = () => fetchBookings();
    window.addEventListener('focus', onFocus);
    return () => {
      unsubscribe();
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  // Tab count badges
  const counts = useMemo(() => {
    return {
      ALL: bookings.length,
      PENDING: bookings.filter((b) => b.bookingStatus === 'PENDING').length,
      CONFIRMED: bookings.filter((b) => b.bookingStatus === 'CONFIRMED').length,
      DECLINED: bookings.filter((b) => b.bookingStatus === 'DECLINED').length,
      UPCOMING: bookings.filter((b) => b.bookingStatus === 'UPCOMING').length,
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
          (b.heritageSiteName || b.siteName || '').toLowerCase().includes(q) ||
          (b.packageName || b.packageTitle || '').toLowerCase().includes(q)
      );
    }

    if (dateFilter) {
      result = result.filter((b) => b.tourDate === dateFilter);
    }

    return result;
  }, [bookings, activeTab, searchQuery, dateFilter]);

  // Handle Accept Submit
  const handleConfirmAccept = async () => {
    if (!acceptingBooking) return;
    setIsSubmittingAccept(true);
    try {
      const res = await HeritageService.acceptHeritageBooking(acceptingBooking.id, acceptNote);
      if (res.success) {
        showToast(
          'success',
          `Tour request ${acceptingBooking.bookingReference} confirmed! Visitor capacity and tour guide secured.`
        );
        setAcceptingBooking(null);
        setAcceptNote('');
        fetchBookings();
      } else {
        showToast('danger', res.error || 'Failed to accept tour booking.');
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
      const res = await HeritageService.declineHeritageBooking(
        decliningBooking.id,
        finalReason,
        declineAdminNote
      );
      if (res.success) {
        showToast('success', `Tour booking ${decliningBooking.bookingReference} declined and preserved in history.`);
        setDecliningBooking(null);
        setCustomDeclineReason('');
        setDeclineAdminNote('');
        fetchBookings();
      } else {
        showToast('danger', res.error || 'Failed to decline tour booking.');
      }
    } catch (err: any) {
      showToast('danger', err.message || 'Error communicating with backend.');
    } finally {
      setIsSubmittingDecline(false);
    }
  };

  // Columns specification
  const columns: Column<HeritageTourBooking>[] = [
    {
      key: 'bookingReference',
      header: 'Tour Ref',
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
      header: 'Passenger / Lead Visitor',
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
      key: 'heritageSiteName',
      header: 'Heritage Destination & Tour',
      sortable: true,
      render: (b) => (
        <div>
          <div className="fw-bold text-obsidian text-sm d-flex align-items-center gap-1.5">
            <Landmark size={13} className="text-gold" />
            <span>{b.heritageSiteName || b.siteName}</span>
          </div>
          <div className="text-secondary text-xs mt-0.5">{b.packageName || b.packageTitle}</div>
        </div>
      ),
    },
    {
      key: 'tourDate',
      header: 'Schedule & Party',
      sortable: true,
      render: (b) => (
        <div>
          <div className="text-sm fw-medium">
            {formatDate(b.tourDate)} • {b.scheduledTime}
          </div>
          <div className="text-muted text-xs mt-0.5">
            {b.numberOfVisitors} Visitors {b.transportIncluded ? '• Transport Incl.' : ''}
          </div>
        </div>
      ),
    },
    {
      key: 'totalAmountETB',
      header: 'Amount (ETB)',
      sortable: true,
      render: (b) => (
        <div>
          <div className="fw-bold text-gold text-sm">{formatETB(b.totalAmountETB || b.totalPriceETB || 0)}</div>
          <span
            className={`badge px-1.5 py-0.5 mt-0.5 text-xs ${
              b.paymentStatus === 'PAID'
                ? 'bg-success-subtle text-success border border-success-subtle'
                : 'bg-warning-subtle text-warning border border-warning-subtle'
            }`}
          >
            {b.paymentStatus}
          </span>
        </div>
      ),
    },
    {
      key: 'bookingStatus',
      header: 'Tour Status',
      sortable: true,
      render: (b) => <StatusBadge status={b.bookingStatus} size="sm" />,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (b) => (
        <div className="d-flex align-items-center justify-content-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          {b.bookingStatus === 'PENDING' && (
            <>
              <button
                type="button"
                className="btn btn-sm py-1 px-2.5 fw-bold d-flex align-items-center gap-1 border-0 rounded-2"
                style={{ backgroundColor: '#EAF7EE', color: '#15803D' }}
                title="Accept Heritage Tour Request"
                onClick={() => setAcceptingBooking(b)}
              >
                <Check size={14} />
                <span>Accept</span>
              </button>
              <button
                type="button"
                className="btn btn-sm py-1 px-2.5 fw-bold d-flex align-items-center gap-1 border-0 rounded-2"
                style={{ backgroundColor: '#FEE8E8', color: '#B91C1C' }}
                title="Decline Heritage Tour Request"
                onClick={() => setDecliningBooking(b)}
              >
                <X size={14} />
                <span>Decline</span>
              </button>
            </>
          )}

          <Link
            href={`/heritage-bookings/${b.id}`}
            className="btn btn-light btn-sm p-1.5 text-secondary hover-gold border"
            style={{ backgroundColor: '#FFFDF7', borderColor: '#E8E3D8' }}
            title="View Full Tour Details"
          >
            <Eye size={15} />
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Heritage Tour Bookings & Tourism Approval"
        description="Review incoming tourism reservations, verify excursion schedules and visitor capacity, and authorize guided heritage experiences."
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Heritage Tourism', href: '/heritage' },
          { label: 'Tour Bookings' },
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
            { key: 'UPCOMING', label: 'Upcoming Tours', count: counts.UPCOMING },
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

        {/* Search & Filter Bar */}
        <div className="p-3 d-flex flex-column flex-md-row gap-2 align-items-stretch align-items-md-center justify-content-between">
          <div className="position-relative flex-grow-1" style={{ maxWidth: 360 }}>
            <span className="position-absolute top-50 start-0 translate-middle-y ps-3 text-muted">
              <Search size={15} />
            </span>
            <input
              type="text"
              className="form-control form-control-sm ps-5 pe-3 py-1.5 shadow-none text-sm"
              placeholder="Search reference, visitor, site..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ backgroundColor: '#FFFDF7', borderColor: '#E8E3D8' }}
            />
          </div>

          <div className="d-flex align-items-center gap-2 flex-wrap">
            <div className="d-flex align-items-center gap-1.5 text-xs text-muted">
              <Calendar size={14} className="text-gold" />
              <span>Tour Date:</span>
              <input
                type="date"
                className="form-control form-control-sm shadow-none py-1 px-2 text-xs"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                style={{ borderColor: '#E8E3D8', width: 140 }}
              />
            </div>
            {(searchQuery || dateFilter) && (
              <button
                type="button"
                className="btn btn-sm btn-link text-secondary text-xs p-0 text-decoration-none"
                onClick={() => {
                  setSearchQuery('');
                  setDateFilter('');
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
        onRowClick={(item) => router.push(`/heritage-bookings/${item.id}`)}
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
                    <h2 className="h6 fw-bold mb-0 text-obsidian">Accept Heritage Tour Request</h2>
                    <span className="text-xs text-muted">Authoritative Central Backend Capacity Reservation</span>
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
                  You are confirming tour request <strong>{acceptingBooking.bookingReference}</strong> for <strong>{acceptingBooking.passengerName}</strong>. Tour schedule, guide assignment, and passenger notifications will be triggered atomically.
                </p>

                {/* Tour Summary Box */}
                <div
                  className="p-3 rounded-3 mb-3 border text-xs"
                  style={{ backgroundColor: '#F8F5EB', borderColor: '#E8E3D8' }}
                >
                  <div className="row g-2">
                    <div className="col-6">
                      <span className="text-muted d-block">Destination:</span>
                      <strong className="text-obsidian">{acceptingBooking.heritageSiteName || acceptingBooking.siteName}</strong>
                    </div>
                    <div className="col-6">
                      <span className="text-muted d-block">Tour Package:</span>
                      <strong className="text-obsidian">{acceptingBooking.packageName || acceptingBooking.packageTitle}</strong>
                    </div>
                    <div className="col-6">
                      <span className="text-muted d-block">Tour Schedule:</span>
                      <span className="fw-medium text-obsidian">
                        {formatDate(acceptingBooking.tourDate)} • {acceptingBooking.scheduledTime}
                      </span>
                    </div>
                    <div className="col-6">
                      <span className="text-muted d-block">Visitor Count:</span>
                      <span className="fw-medium text-obsidian">{acceptingBooking.numberOfVisitors} Visitors</span>
                    </div>
                    <div className="col-6">
                      <span className="text-muted d-block">Transport Service:</span>
                      <span className="fw-medium text-obsidian">
                        {acceptingBooking.transportIncluded ? 'Included in Package' : 'Self-Arranged'}
                      </span>
                    </div>
                    <div className="col-6">
                      <span className="text-muted d-block">Total Price:</span>
                      <span className="fw-bold text-gold text-sm">{formatETB(acceptingBooking.totalAmountETB || acceptingBooking.totalPriceETB || 0)}</span>
                    </div>
                  </div>
                </div>

                {/* Concurrency & Capacity Safe Note */}
                <div className="d-flex align-items-center gap-2 p-2.5 rounded-2 mb-3 bg-light border text-xs">
                  <ShieldCheck size={16} className="text-success flex-shrink-0" />
                  <span>
                    <strong>Capacity Verification:</strong> Central backend database transaction locks prevent overbooking on the selected date.
                  </span>
                </div>

                {/* Admin Note */}
                <div className="mb-2">
                  <label className="form-label text-xs fw-semibold mb-1" style={{ color: '#252525' }}>
                    Optional Administrative Review Note:
                  </label>
                  <textarea
                    rows={2}
                    className="form-control form-control-sm text-xs shadow-none"
                    placeholder="e.g. Assigned Senior Historian guide, verified morning entry ticket permits..."
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
                      <span>Securing Tour...</span>
                    </>
                  ) : (
                    <>
                      <Check size={15} />
                      <span>Confirm & Secure Tour</span>
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
                    <h2 className="h6 fw-bold mb-0 text-obsidian">Decline Heritage Tour Request</h2>
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
                  You are declining tour request <strong>{decliningBooking.bookingReference}</strong> for <strong>{decliningBooking.passengerName}</strong>. The request will remain preserved in historical records and a status notification will be sent to the passenger.
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
                    <option value="Tour schedule capacity reached for selected date">
                      Tour schedule capacity reached for selected date
                    </option>
                    <option value="Certified heritage tour guide unavailable on requested excursion date">
                      Certified heritage tour guide unavailable on requested excursion date
                    </option>
                    <option value="Heritage site closed for seasonal preservation or religious observance">
                      Heritage site closed for seasonal preservation or religious observance
                    </option>
                    <option value="Party size exceeds maximum allowable group ratio for heritage site">
                      Party size exceeds maximum allowable group ratio for heritage site
                    </option>
                    <option value="Requested 4WD or specialized transport vehicle unavailable">
                      Requested 4WD or specialized transport vehicle unavailable
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
                    placeholder="Internal audit notes (e.g. offered alternate afternoon departure time)..."
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
                      <span>Decline Tour Request</span>
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
