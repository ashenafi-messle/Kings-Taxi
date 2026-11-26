'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  CalendarCheck,
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  DollarSign,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  BedDouble,
  Check,
  X,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  History,
  CreditCard,
  FileText,
  Info,
} from 'lucide-react';
import { PageHeader } from '../../../../components/common/PageHeader';
import { StatusBadge } from '../../../../components/common/StatusBadge';
import { HotelService } from '../../../../services/hotelService';
import { HotelBooking } from '../../../../types';
import { formatDate, formatDateTime } from '../../../../utils/dateUtils';
import { formatETB } from '../../../../utils/formatters';

export default function HotelBookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [booking, setBooking] = useState<HotelBooking | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Approval Modals
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [acceptNote, setAcceptNote] = useState('');
  const [isSubmittingAccept, setIsSubmittingAccept] = useState(false);

  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState('Requested room inventory is no longer available');
  const [customDeclineReason, setCustomDeclineReason] = useState('');
  const [declineAdminNote, setDeclineAdminNote] = useState('');
  const [isSubmittingDecline, setIsSubmittingDecline] = useState(false);

  // Feedback Toast
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);

  const showToast = (type: 'success' | 'danger', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4500);
  };

  const loadBooking = async () => {
    setIsLoading(true);
    try {
      const data = await HotelService.getBookingById(id);
      setBooking(data);
    } catch (err) {
      console.error('Failed to load hotel booking:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) loadBooking();
  }, [id]);

  const handleConfirmAccept = async () => {
    if (!booking) return;
    setIsSubmittingAccept(true);
    try {
      const res = await HotelService.acceptBooking(booking.id, acceptNote);
      if (res.success && res.data) {
        setBooking(res.data);
        setShowAcceptModal(false);
        showToast('success', `Booking ${booking.bookingReference} accepted and room inventory reserved!`);
      } else {
        showToast('danger', res.error || 'Failed to accept booking.');
      }
    } catch (err: any) {
      showToast('danger', err.message || 'Error communicating with backend.');
    } finally {
      setIsSubmittingAccept(false);
    }
  };

  const handleConfirmDecline = async () => {
    if (!booking) return;
    const finalReason = declineReason === 'CUSTOM' ? customDeclineReason.trim() : declineReason;

    if (!finalReason) {
      showToast('danger', 'Please specify a decline reason.');
      return;
    }

    setIsSubmittingDecline(true);
    try {
      const res = await HotelService.declineBooking(booking.id, finalReason, declineAdminNote);
      if (res.success && res.data) {
        setBooking(res.data);
        setShowDeclineModal(false);
        showToast('success', `Booking request ${booking.bookingReference} has been declined.`);
      } else {
        showToast('danger', res.error || 'Failed to decline booking.');
      }
    } catch (err: any) {
      showToast('danger', err.message || 'Error communicating with backend.');
    } finally {
      setIsSubmittingDecline(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-gold" role="status" />
        <p className="text-muted mt-2 small">Loading booking details...</p>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="text-center py-5">
        <h2 className="h5 fw-bold text-obsidian">Booking Not Found</h2>
        <p className="text-muted small">The requested reservation record could not be located.</p>
        <Link href="/hotel-bookings" className="btn btn-outline-secondary btn-sm mt-2">
          Return to Hotel Bookings
        </Link>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={`Reservation: ${booking.bookingReference}`}
        description={`Submitted on ${formatDateTime(booking.createdAt)} • Guest: ${booking.passengerName}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Hotel Bookings', href: '/hotel-bookings' },
          { label: booking.bookingReference },
        ]}
        actions={
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <Link href="/hotel-bookings" className="btn btn-outline-secondary btn-sm">
              <ArrowLeft size={14} className="me-1" />
              <span>Back to List</span>
            </Link>

            {(booking.bookingStatus === 'PENDING' ||
              (booking.bookingStatus === 'CONFIRMED' && !booking.reviewedAt && booking.paymentStatus === 'PENDING')) && (
              <>
                <button
                  type="button"
                  className="btn btn-success btn-sm px-3 fw-bold d-flex align-items-center gap-1.5"
                  onClick={() => setShowAcceptModal(true)}
                >
                  <Check size={16} />
                  <span>Confirm Booking</span>
                </button>
                <button
                  type="button"
                  className="btn btn-danger btn-sm px-3 fw-bold d-flex align-items-center gap-1.5"
                  onClick={() => setShowDeclineModal(true)}
                >
                  <X size={16} />
                  <span>Decline Booking</span>
                </button>
              </>
            )}

            {booking.bookingStatus === 'CONFIRMED' && Boolean(booking.reviewedAt) && (
              <button
                type="button"
                className="btn btn-outline-success btn-sm d-flex align-items-center gap-1.5"
                onClick={async () => {
                  await HotelService.updateBookingStatus(booking.id, 'CHECKED_IN');
                  loadBooking();
                  showToast('success', 'Guest marked as Checked-In.');
                }}
              >
                <CheckCircle size={15} />
                <span>Mark Checked In</span>
              </button>
            )}
          </div>
        }
      />

      {/* Toast Alert */}
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

      {/* Pending Banner Alert */}
      {booking.bookingStatus === 'PENDING' && (
        <div
          className="alert py-3 px-4 rounded-3 border mb-4 d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3"
          style={{ backgroundColor: '#FEF6E4', borderColor: '#FCD34D' }}
        >
          <div className="d-flex align-items-start gap-2.5">
            <ShieldAlert size={22} className="text-warning flex-shrink-0 mt-0.5" />
            <div>
              <div className="fw-bold text-obsidian text-sm">Action Required: Booking Request Pending Administrator Review</div>
              <p className="text-xs text-secondary mb-0 mt-0.5">
                This request was submitted via the Kings Taxi mobile application. Verify room availability and choose to Accept or Decline this reservation.
              </p>
            </div>
          </div>
          <div className="d-flex align-items-center gap-2 flex-shrink-0">
            <button
              type="button"
              className="btn btn-success btn-sm px-3 fw-bold d-flex align-items-center gap-1"
              onClick={() => setShowAcceptModal(true)}
            >
              <Check size={15} />
              <span>Accept Request</span>
            </button>
            <button
              type="button"
              className="btn btn-outline-danger btn-sm px-3 fw-bold d-flex align-items-center gap-1"
              onClick={() => setShowDeclineModal(true)}
            >
              <X size={15} />
              <span>Decline Request</span>
            </button>
          </div>
        </div>
      )}

      {/* Declined Banner Alert */}
      {booking.bookingStatus === 'DECLINED' && (
        <div
          className="alert py-3 px-4 rounded-3 border mb-4"
          style={{ backgroundColor: '#FEE8E8', borderColor: '#FCA5A5' }}
        >
          <div className="d-flex align-items-start gap-2.5">
            <XCircle size={22} className="text-danger flex-shrink-0 mt-0.5" />
            <div>
              <div className="fw-bold text-danger text-sm">Booking Request Declined</div>
              <p className="text-xs text-secondary mb-1 mt-0.5">
                <strong>Decline Reason:</strong> {booking.declineReason || 'Not specified'}
              </p>
              {booking.adminReviewNote && (
                <p className="text-xs text-muted mb-0">
                  <strong>Internal Review Notes:</strong> {booking.adminReviewNote}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Grid: 2 Columns */}
      <div className="row g-3 g-md-4">
        {/* Left Column (Sections A, C, D) */}
        <div className="col-12 col-lg-7">
          {/* Section D: Booking Details */}
          <div
            className="card rounded-3 border mb-3.5 p-3.5 p-md-4"
            style={{ backgroundColor: '#FFFDF7', borderColor: '#E8E3D8' }}
          >
            <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
              <h2 className="h6 fw-bold mb-0 text-obsidian d-flex align-items-center gap-2">
                <FileText size={17} className="text-gold" />
                <span>Section D: Booking Information</span>
              </h2>
              <StatusBadge status={booking.bookingStatus} size="sm" />
            </div>

            <div className="row g-3 text-sm">
              <div className="col-6 col-sm-4">
                <span className="text-muted text-xs d-block">Booking Reference</span>
                <span className="fw-bold font-monospace text-obsidian">{booking.bookingReference}</span>
              </div>
              <div className="col-6 col-sm-4">
                <span className="text-muted text-xs d-block">Check-In Date</span>
                <span className="fw-semibold text-obsidian">{formatDate(booking.checkInDate)}</span>
              </div>
              <div className="col-6 col-sm-4">
                <span className="text-muted text-xs d-block">Check-Out Date</span>
                <span className="fw-semibold text-obsidian">{formatDate(booking.checkOutDate)}</span>
              </div>

              <div className="col-6 col-sm-4">
                <span className="text-muted text-xs d-block">Total Nights</span>
                <span className="fw-bold text-obsidian">{booking.numberOfNights || booking.totalNights} Nights</span>
              </div>
              <div className="col-6 col-sm-4">
                <span className="text-muted text-xs d-block">Rooms Reserved</span>
                <span className="fw-bold text-obsidian">{booking.numberOfRooms} Room(s)</span>
              </div>
              <div className="col-6 col-sm-4">
                <span className="text-muted text-xs d-block">Total Guests</span>
                <span className="fw-bold text-obsidian">{booking.numberOfGuests} Guests</span>
              </div>

              <div className="col-6 col-sm-4">
                <span className="text-muted text-xs d-block">Booking Request Date</span>
                <span className="text-secondary">{formatDateTime(booking.createdAt)}</span>
              </div>
              <div className="col-6 col-sm-4">
                <span className="text-muted text-xs d-block">Price Per Night</span>
                <span className="fw-medium text-obsidian">{formatETB(booking.pricePerNightETB)}</span>
              </div>
              <div className="col-6 col-sm-4">
                <span className="text-muted text-xs d-block">Total Booking Price</span>
                <span className="fw-bold text-gold text-base">{formatETB(booking.totalAmountETB)}</span>
              </div>

              {booking.specialRequests && (
                <div className="col-12 mt-2">
                  <span className="text-muted text-xs d-block">Special Requests</span>
                  <div
                    className="p-2.5 rounded-2 border text-xs text-secondary mt-1"
                    style={{ backgroundColor: '#F8F5EB', borderColor: '#E8E3D8' }}
                  >
                    {booking.specialRequests}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section C: Room Information */}
          <div
            className="card rounded-3 border mb-3.5 p-3.5 p-md-4"
            style={{ backgroundColor: '#FFFDF7', borderColor: '#E8E3D8' }}
          >
            <h2 className="h6 fw-bold mb-3 border-bottom pb-2 text-obsidian d-flex align-items-center gap-2">
              <BedDouble size={17} className="text-gold" />
              <span>Section C: Room Details & Images</span>
            </h2>

            <div className="d-flex align-items-center justify-content-between mb-2">
              <div className="fw-bold text-obsidian text-sm">{booking.roomTypeName}</div>
              <span className="badge bg-gold text-dark text-xs">{formatETB(booking.pricePerNightETB)} / night</span>
            </div>

            <div className="text-xs text-muted mb-3">
              Allocated Room Type: {booking.roomTypeName} • Capacity: {booking.numberOfGuests} Persons
            </div>

            {/* Room Images Gallery */}
            {booking.roomImages && booking.roomImages.length > 0 ? (
              <div className="row g-2">
                {booking.roomImages.map((img, idx) => (
                  <div key={idx} className="col-6 col-sm-4">
                    <div
                      className="position-relative rounded-2 overflow-hidden border shadow-sm"
                      style={{ height: 110 }}
                    >
                      <Image
                        src={img}
                        alt={`Room photo ${idx + 1}`}
                        fill
                        sizes="200px"
                        style={{ objectFit: 'cover' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                className="p-3 rounded-2 text-center text-xs text-muted border"
                style={{ backgroundColor: '#F8F5EB', borderColor: '#E8E3D8' }}
              >
                Standard Room Photography Available in Hotel Directory
              </div>
            )}
          </div>

          {/* Section F: Booking Review History */}
          <div
            className="card rounded-3 border p-3.5 p-md-4"
            style={{ backgroundColor: '#FFFDF7', borderColor: '#E8E3D8' }}
          >
            <h2 className="h6 fw-bold mb-3 border-bottom pb-2 text-obsidian d-flex align-items-center gap-2">
              <History size={17} className="text-gold" />
              <span>Section F: Booking Review & Audit History</span>
            </h2>

            <div className="timeline text-xs">
              {booking.statusHistory && booking.statusHistory.length > 0 ? (
                booking.statusHistory.map((item, idx) => (
                  <div key={idx} className="d-flex gap-2.5 mb-2.5 pb-2.5 border-bottom">
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center text-white flex-shrink-0 mt-0.5"
                      style={{
                        width: 22,
                        height: 22,
                        backgroundColor:
                          item.status === 'CONFIRMED'
                            ? '#15803D'
                            : item.status === 'DECLINED'
                            ? '#B91C1C'
                            : '#D99B19',
                      }}
                    >
                      <Info size={12} />
                    </div>
                    <div>
                      <div className="fw-bold text-obsidian">
                        Status transitioned to <span className="text-uppercase">{item.status}</span>
                        {item.adminName && ` by ${item.adminName}`}
                      </div>
                      <div className="text-muted">{formatDateTime(item.changedAt)}</div>
                      {item.note && <div className="text-secondary mt-0.5 fst-italic">"{item.note}"</div>}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-muted text-xs">
                  Initial submission registered on {formatDateTime(booking.createdAt)}.
                  {booking.reviewedAt && ` Reviewed on ${formatDateTime(booking.reviewedAt)}.`}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (Sections A, B, E) */}
        <div className="col-12 col-lg-5">
          {/* Section A: Passenger Information */}
          <div
            className="card rounded-3 border mb-3.5 p-3.5 p-md-4"
            style={{ backgroundColor: '#FFFDF7', borderColor: '#E8E3D8' }}
          >
            <h2 className="h6 fw-bold mb-3 border-bottom pb-2 text-obsidian d-flex align-items-center gap-2">
              <User size={17} className="text-gold" />
              <span>Section A: Passenger Information</span>
            </h2>

            <div className="d-flex flex-column gap-2 text-sm">
              <div>
                <span className="text-muted text-xs d-block">Passenger Full Name</span>
                <span className="fw-bold text-obsidian">{booking.passengerName}</span>
              </div>
              <div>
                <span className="text-muted text-xs d-block">Passenger Phone</span>
                <span className="font-monospace text-obsidian">{booking.passengerPhone}</span>
              </div>
              <div>
                <span className="text-muted text-xs d-block">Email Address</span>
                <span className="text-secondary">{booking.passengerEmail || 'Not provided'}</span>
              </div>
              <div>
                <span className="text-muted text-xs d-block">Passenger ID</span>
                <span className="font-monospace text-xs text-muted">{booking.passengerId}</span>
              </div>
            </div>
          </div>

          {/* Section B: Hotel Information */}
          <div
            className="card rounded-3 border mb-3.5 p-3.5 p-md-4"
            style={{ backgroundColor: '#FFFDF7', borderColor: '#E8E3D8' }}
          >
            <h2 className="h6 fw-bold mb-3 border-bottom pb-2 text-obsidian d-flex align-items-center gap-2">
              <Building2 size={17} className="text-gold" />
              <span>Section B: Hotel Information</span>
            </h2>

            <div className="d-flex flex-column gap-2 text-sm mb-3">
              <div>
                <span className="text-muted text-xs d-block">Hotel Property</span>
                <span className="fw-bold text-obsidian">{booking.hotelName}</span>
              </div>
              <div>
                <span className="text-muted text-xs d-block">City & Location</span>
                <span className="text-secondary d-flex align-items-center gap-1">
                  <MapPin size={13} className="text-gold" />
                  <span>{booking.hotelAddress || `${booking.hotelCity}, Ethiopia`}</span>
                </span>
              </div>
              {booking.hotelPhone && (
                <div>
                  <span className="text-muted text-xs d-block">Hotel Contact Phone</span>
                  <span className="font-monospace text-secondary">{booking.hotelPhone}</span>
                </div>
              )}
            </div>

            {/* Hotel Photo preview */}
            {booking.hotelImages && booking.hotelImages.length > 0 && (
              <div
                className="position-relative rounded-2 overflow-hidden border shadow-sm"
                style={{ height: 130 }}
              >
                <Image
                  src={booking.hotelImages[0]}
                  alt={booking.hotelName}
                  fill
                  sizes="400px"
                  style={{ objectFit: 'cover' }}
                />
              </div>
            )}
          </div>

          {/* Section E: Payment Information */}
          <div
            className="card rounded-3 border p-3.5 p-md-4"
            style={{ backgroundColor: '#FFFDF7', borderColor: '#E8E3D8' }}
          >
            <h2 className="h6 fw-bold mb-3 border-bottom pb-2 text-obsidian d-flex align-items-center gap-2">
              <CreditCard size={17} className="text-gold" />
              <span>Section E: Payment Information</span>
            </h2>

            <div className="d-flex flex-column gap-2 text-sm">
              <div className="d-flex justify-content-between align-items-center">
                <span className="text-muted text-xs">Payment Status</span>
                <span
                  className={`badge px-2 py-0.5 text-xs ${
                    booking.paymentStatus === 'PAID'
                      ? 'bg-success text-white'
                      : 'bg-warning text-dark'
                  }`}
                >
                  {booking.paymentStatus}
                </span>
              </div>
              <div className="d-flex justify-content-between align-items-center">
                <span className="text-muted text-xs">Payment Method</span>
                <span className="fw-medium text-obsidian">{booking.paymentMethod || 'Telebirr SuperApp'}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center">
                <span className="text-muted text-xs">Transaction Reference</span>
                <span className="font-monospace text-xs text-secondary">
                  {booking.transactionReference || 'TLB-TX-PENDING'}
                </span>
              </div>
              <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                <span className="text-muted text-xs">Amount Paid</span>
                <span className="fw-bold text-obsidian">{formatETB(booking.amountPaidETB ?? booking.totalAmountETB)}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center">
                <span className="text-muted text-xs">Outstanding Balance</span>
                <span className="fw-bold text-success">ETB 0.00</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ACCEPT MODAL                                                              */}
      {/* ========================================================================= */}
      {showAcceptModal && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.55)', zIndex: 1050 }}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 500 }}>
            <div className="modal-content rounded-4 border overflow-hidden shadow-lg" style={{ backgroundColor: '#FFFDF7', borderColor: '#E8E3D8' }}>
              <div className="p-3.5 px-4 border-bottom d-flex align-items-center justify-content-between" style={{ backgroundColor: '#EAF7EE', borderColor: '#B7E4C7' }}>
                <h3 className="h6 fw-bold mb-0 text-obsidian d-flex align-items-center gap-2">
                  <Check size={18} className="text-success" />
                  <span>Confirm & Accept Hotel Booking</span>
                </h3>
                <button type="button" className="btn-close shadow-none" onClick={() => setShowAcceptModal(false)} />
              </div>
              <div className="p-4">
                <p className="text-sm text-secondary mb-3">
                  Confirm acceptance for reservation <strong>{booking.bookingReference}</strong> at <strong>{booking.hotelName}</strong> ({booking.roomTypeName}).
                </p>
                <div className="mb-3">
                  <label className="form-label text-xs fw-semibold mb-1">Administrative Note:</label>
                  <textarea
                    rows={2}
                    className="form-control form-control-sm text-xs shadow-none"
                    placeholder="e.g. Verified room availability with front desk..."
                    value={acceptNote}
                    onChange={(e) => setAcceptNote(e.target.value)}
                  />
                </div>
              </div>
              <div className="p-3 px-4 border-top d-flex justify-content-end gap-2" style={{ backgroundColor: '#F8F5EB' }}>
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setShowAcceptModal(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-success btn-sm px-3 fw-bold"
                  onClick={handleConfirmAccept}
                  disabled={isSubmittingAccept}
                >
                  {isSubmittingAccept ? 'Reserving...' : 'Confirm Acceptance'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DECLINE MODAL                                                             */}
      {/* ========================================================================= */}
      {showDeclineModal && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.55)', zIndex: 1050 }}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 500 }}>
            <div className="modal-content rounded-4 border overflow-hidden shadow-lg" style={{ backgroundColor: '#FFFDF7', borderColor: '#E8E3D8' }}>
              <div className="p-3.5 px-4 border-bottom d-flex align-items-center justify-content-between" style={{ backgroundColor: '#FEE8E8', borderColor: '#FCA5A5' }}>
                <h3 className="h6 fw-bold mb-0 text-danger d-flex align-items-center gap-2">
                  <X size={18} />
                  <span>Decline Booking Request</span>
                </h3>
                <button type="button" className="btn-close shadow-none" onClick={() => setShowDeclineModal(false)} />
              </div>
              <div className="p-4">
                <div className="mb-3">
                  <label className="form-label text-xs fw-semibold mb-1">Mandatory Decline Reason *</label>
                  <select
                    className="form-select form-select-sm text-xs shadow-none"
                    value={declineReason}
                    onChange={(e) => setDeclineReason(e.target.value)}
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
                    <option value="CUSTOM">Custom reason...</option>
                  </select>
                </div>
                {declineReason === 'CUSTOM' && (
                  <div className="mb-3">
                    <input
                      type="text"
                      className="form-control form-control-sm text-xs"
                      placeholder="Specify custom reason..."
                      value={customDeclineReason}
                      onChange={(e) => setCustomDeclineReason(e.target.value)}
                    />
                  </div>
                )}
                <div className="mb-2">
                  <label className="form-label text-xs fw-semibold mb-1">Internal Review Note:</label>
                  <textarea
                    rows={2}
                    className="form-control form-control-sm text-xs"
                    placeholder="Internal audit notes..."
                    value={declineAdminNote}
                    onChange={(e) => setDeclineAdminNote(e.target.value)}
                  />
                </div>
              </div>
              <div className="p-3 px-4 border-top d-flex justify-content-end gap-2" style={{ backgroundColor: '#F8F5EB' }}>
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setShowDeclineModal(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger btn-sm px-3 fw-bold"
                  onClick={handleConfirmDecline}
                  disabled={isSubmittingDecline}
                >
                  {isSubmittingDecline ? 'Declining...' : 'Confirm Decline'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
