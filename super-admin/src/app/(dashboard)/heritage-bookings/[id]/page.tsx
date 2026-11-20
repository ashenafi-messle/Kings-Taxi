'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  Landmark,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  Compass,
  DollarSign,
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  History,
  CreditCard,
  FileText,
  Car,
  Users,
  Check,
  X,
  Info,
  Layers,
} from 'lucide-react';
import { PageHeader } from '../../../../components/common/PageHeader';
import { StatusBadge } from '../../../../components/common/StatusBadge';
import { HeritageService } from '../../../../services/heritageService';
import { HeritageTourBooking } from '../../../../types';
import { formatDate, formatDateTime } from '../../../../utils/dateUtils';
import { formatETB } from '../../../../utils/formatters';

export default function HeritageBookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [booking, setBooking] = useState<HeritageTourBooking | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Approval Modals
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [acceptNote, setAcceptNote] = useState('');
  const [isSubmittingAccept, setIsSubmittingAccept] = useState(false);

  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState('Maximum visitor group capacity reached for selected date');
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
      const data = await HeritageService.getHeritageBookingById(id);
      setBooking(data);
    } catch (err) {
      console.error('Failed to load heritage booking:', err);
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
      const res = await HeritageService.acceptHeritageBooking(booking.id, acceptNote);
      if (res.success && res.data) {
        setBooking(res.data);
        setShowAcceptModal(false);
        showToast('success', `Tour booking ${booking.bookingReference} accepted and schedule confirmed!`);
      } else {
        showToast('danger', res.error || 'Failed to accept heritage booking.');
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
      const res = await HeritageService.declineHeritageBooking(booking.id, finalReason, declineAdminNote);
      if (res.success && res.data) {
        setBooking(res.data);
        setShowDeclineModal(false);
        showToast('success', `Tour booking request ${booking.bookingReference} has been declined.`);
      } else {
        showToast('danger', res.error || 'Failed to decline heritage tour booking.');
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
        <p className="text-muted mt-2 small">Loading tour booking details...</p>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="text-center py-5">
        <h2 className="h5 fw-bold text-obsidian">Tour Booking Not Found</h2>
        <p className="text-muted small">The requested heritage tour record could not be located.</p>
        <Link href="/heritage-bookings" className="btn btn-outline-secondary btn-sm mt-2">
          Return to Tour Bookings
        </Link>
      </div>
    );
  }

  const siteTitle = booking.heritageSiteName || booking.siteName || 'Heritage Destination';
  const pkgTitle = booking.packageName || booking.packageTitle || 'Standard Tour Package';
  const totalAmount = booking.totalAmountETB ?? booking.totalPriceETB ?? 0;
  const maxCapacity = booking.maxVisitorCapacity || 20;
  const isPending = booking.bookingStatus === 'PENDING';

  return (
    <div>
      <PageHeader
        title={`Tour Booking: ${booking.bookingReference}`}
        description={`Scheduled for ${formatDate(booking.tourDate)} at ${booking.scheduledTime || '09:00 AM'} • ${siteTitle}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Heritage Destinations', href: '/heritage' },
          { label: 'Tour Bookings', href: '/heritage-bookings' },
          { label: booking.bookingReference },
        ]}
        actions={
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <Link href="/heritage-bookings" className="btn btn-outline-secondary btn-sm">
              <ArrowLeft size={14} className="me-1" />
              <span>Back to List</span>
            </Link>

            {isPending && (
              <>
                <button
                  type="button"
                  className="btn btn-success btn-sm px-3 fw-bold d-flex align-items-center gap-1.5"
                  onClick={() => setShowAcceptModal(true)}
                >
                  <Check size={16} />
                  <span>Accept Tour Request</span>
                </button>
                <button
                  type="button"
                  className="btn btn-danger btn-sm px-3 fw-bold d-flex align-items-center gap-1.5"
                  onClick={() => setShowDeclineModal(true)}
                >
                  <X size={16} />
                  <span>Decline Tour Request</span>
                </button>
              </>
            )}

            {booking.bookingStatus === 'CONFIRMED' && (
              <span className="badge bg-success-subtle text-success border border-success-subtle px-3 py-2 fw-semibold d-flex align-items-center gap-1.5">
                <CheckCircle size={15} />
                <span>Confirmed & Scheduled</span>
              </span>
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
      {isPending && (
        <div
          className="alert py-3 px-4 rounded-3 border mb-4 d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3"
          style={{ backgroundColor: '#FEF6E4', borderColor: '#FCD34D' }}
        >
          <div className="d-flex align-items-start gap-2.5">
            <ShieldAlert size={22} className="text-warning flex-shrink-0 mt-0.5" />
            <div>
              <div className="fw-bold text-obsidian text-sm">Action Required: Tour Booking Request Pending Administrator Review</div>
              <p className="text-xs text-secondary mb-0 mt-0.5">
                This guided tour request was submitted via the Kings Taxi mobile application. Verify tour schedule availability, guide allocation, and visitor capacity before accepting or declining.
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
              <span>Accept Tour</span>
            </button>
            <button
              type="button"
              className="btn btn-outline-danger btn-sm px-3 fw-bold d-flex align-items-center gap-1"
              onClick={() => setShowDeclineModal(true)}
            >
              <X size={15} />
              <span>Decline Tour</span>
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
              <div className="fw-bold text-danger text-sm">Tour Booking Request Declined</div>
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
        {/* Left Column (Sections C, D, F) */}
        <div className="col-12 col-lg-7">
          {/* Section C: Tour Details */}
          <div
            className="card rounded-3 border mb-3.5 p-3.5 p-md-4"
            style={{ backgroundColor: '#FFFDF7', borderColor: '#E8E3D8' }}
          >
            <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
              <h2 className="h6 fw-bold mb-0 text-obsidian d-flex align-items-center gap-2">
                <Compass size={17} className="text-gold" />
                <span>Section C: Tour Details & Itinerary</span>
              </h2>
              <StatusBadge status={booking.bookingStatus} size="sm" />
            </div>

            <div className="row g-3 text-sm">
              <div className="col-12">
                <span className="text-muted text-xs d-block">Tour Package</span>
                <span className="fw-bold text-obsidian text-base">{pkgTitle}</span>
              </div>

              <div className="col-6 col-sm-4">
                <span className="text-muted text-xs d-block">Scheduled Tour Date</span>
                <span className="fw-bold text-obsidian d-flex align-items-center gap-1.5 mt-0.5">
                  <Calendar size={14} className="text-gold" />
                  <span>{formatDate(booking.tourDate)}</span>
                </span>
              </div>

              <div className="col-6 col-sm-4">
                <span className="text-muted text-xs d-block">Scheduled Time</span>
                <span className="fw-semibold text-obsidian d-flex align-items-center gap-1.5 mt-0.5">
                  <Clock size={14} className="text-gold" />
                  <span>{booking.scheduledTime || '09:00 AM'}</span>
                </span>
              </div>

              <div className="col-6 col-sm-4">
                <span className="text-muted text-xs d-block">Tour Duration</span>
                <span className="fw-semibold text-obsidian">
                  {booking.tourDurationHours || 5} Hours
                </span>
              </div>

              <div className="col-6 col-sm-4">
                <span className="text-muted text-xs d-block">Number of Visitors</span>
                <span className="fw-bold text-obsidian d-flex align-items-center gap-1.5 mt-0.5">
                  <Users size={14} className="text-gold" />
                  <span>{booking.numberOfVisitors} Visitors</span>
                </span>
              </div>

              <div className="col-6 col-sm-4">
                <span className="text-muted text-xs d-block">Max Group Capacity</span>
                <span className="fw-medium text-secondary">
                  {maxCapacity} Persons max
                </span>
              </div>

              <div className="col-6 col-sm-4">
                <span className="text-muted text-xs d-block">Assigned Lead Guide</span>
                <span className="fw-medium text-obsidian">
                  {booking.guideAssigned || booking.guideName || 'Yonas Tadesse (Certified Lead)'}
                </span>
              </div>

              {/* Included Services */}
              <div className="col-12 mt-2">
                <span className="text-muted text-xs d-block mb-1.5">Package Inclusions:</span>
                <div className="d-flex flex-wrap gap-1.5">
                  {(booking.includedServices || [
                    'Professional Certified Tour Guide',
                    'Heritage Site Entry Permits',
                    'Bottled Spring Water',
                    'Historical Museum Pass',
                  ]).map((service, idx) => (
                    <span
                      key={idx}
                      className="badge rounded-pill border px-2.5 py-1 text-xs fw-normal"
                      style={{ backgroundColor: '#F8F5EB', borderColor: '#E8E3D8', color: '#252525' }}
                    >
                      ✓ {service}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section D: Transport Information */}
          <div
            className="card rounded-3 border mb-3.5 p-3.5 p-md-4"
            style={{ backgroundColor: '#FFFDF7', borderColor: '#E8E3D8' }}
          >
            <h2 className="h6 fw-bold mb-3 border-bottom pb-2 text-obsidian d-flex align-items-center gap-2">
              <Car size={17} className="text-gold" />
              <span>Section D: Transport Information</span>
            </h2>

            <div className="row g-3 text-sm">
              <div className="col-6 col-sm-4">
                <span className="text-muted text-xs d-block">Transport Service</span>
                <span className="badge mt-1 px-2.5 py-1 text-xs fw-semibold bg-success-subtle text-success border border-success-subtle">
                  {booking.transportIncluded !== false ? 'Transport Included' : 'Self-Arranged'}
                </span>
              </div>

              <div className="col-6 col-sm-4">
                <span className="text-muted text-xs d-block">Vehicle Category</span>
                <span className="fw-bold text-obsidian">
                  {booking.vehicleCategory || booking.requestedTransportService || 'Luxury VIP Van / Minibus'}
                </span>
              </div>

              <div className="col-6 col-sm-4">
                <span className="text-muted text-xs d-block">Vehicles Dispatched</span>
                <span className="fw-bold text-obsidian">
                  {booking.numberOfVehicles || 1} Vehicle(s)
                </span>
              </div>

              <div className="col-12">
                <span className="text-muted text-xs d-block">Passenger Pickup Location</span>
                <div
                  className="p-2.5 rounded-2 border text-xs text-obsidian d-flex align-items-center gap-2 mt-1"
                  style={{ backgroundColor: '#F8F5EB', borderColor: '#E8E3D8' }}
                >
                  <MapPin size={15} className="text-gold flex-shrink-0" />
                  <span className="fw-medium">
                    {booking.pickupLocation || 'Bole International Airport (Terminal 2) or Downtown Hotel Lobby'}
                  </span>
                </div>
              </div>

              {booking.transportQuotationETB && (
                <div className="col-12">
                  <div className="d-flex justify-content-between align-items-center p-2 rounded-2 border text-xs" style={{ backgroundColor: '#FFFDF7' }}>
                    <span className="text-muted">Transport Logistics Quotation:</span>
                    <span className="fw-bold text-obsidian">{formatETB(booking.transportQuotationETB)}</span>
                  </div>
                </div>
              )}
            </div>
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
                  {booking.adminReviewNote && (
                    <div className="text-secondary mt-1 fst-italic">"{booking.adminReviewNote}"</div>
                  )}
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
              <span>Section A: Lead Visitor / Passenger</span>
            </h2>

            <div className="d-flex flex-column gap-2 text-sm">
              <div>
                <span className="text-muted text-xs d-block">Full Name</span>
                <span className="fw-bold text-obsidian">{booking.passengerName}</span>
              </div>
              <div>
                <span className="text-muted text-xs d-block">Contact Phone</span>
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

          {/* Section B: Heritage Destination Details */}
          <div
            className="card rounded-3 border mb-3.5 p-3.5 p-md-4"
            style={{ backgroundColor: '#FFFDF7', borderColor: '#E8E3D8' }}
          >
            <h2 className="h6 fw-bold mb-3 border-bottom pb-2 text-obsidian d-flex align-items-center gap-2">
              <Landmark size={17} className="text-gold" />
              <span>Section B: Heritage Destination</span>
            </h2>

            <div className="d-flex flex-column gap-2 text-sm mb-3">
              <div>
                <span className="text-muted text-xs d-block">Destination Site</span>
                <span className="fw-bold text-obsidian">{siteTitle}</span>
              </div>
              <div>
                <span className="text-muted text-xs d-block">Region & Location</span>
                <span className="text-secondary d-flex align-items-center gap-1">
                  <MapPin size={13} className="text-gold" />
                  <span>{booking.destinationLocation || booking.destinationCity || 'Northern Ethiopia'}</span>
                </span>
              </div>
              {booking.destinationDescription && (
                <div>
                  <span className="text-muted text-xs d-block">Historical Overview</span>
                  <p className="text-xs text-secondary mt-1 mb-0" style={{ lineHeight: 1.5 }}>
                    {booking.destinationDescription}
                  </p>
                </div>
              )}
            </div>

            {/* Destination Gallery Images */}
            {booking.destinationImages && booking.destinationImages.length > 0 ? (
              <div>
                <span className="text-muted text-xs d-block mb-1.5">Destination Photography</span>
                <div className="row g-2">
                  {booking.destinationImages.map((img, idx) => (
                    <div key={idx} className="col-6">
                      <div
                        className="position-relative rounded-2 overflow-hidden border shadow-sm"
                        style={{ height: 110 }}
                      >
                        <Image
                          src={img}
                          alt={`${siteTitle} photo ${idx + 1}`}
                          fill
                          sizes="200px"
                          style={{ objectFit: 'cover' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div
                className="p-3 rounded-2 text-center text-xs text-muted border"
                style={{ backgroundColor: '#F8F5EB', borderColor: '#E8E3D8' }}
              >
                Destination Photography Cataloged in Heritage Registry
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
                  {booking.transactionReference || 'TLB-HRT-TX9821'}
                </span>
              </div>
              <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                <span className="text-muted text-xs">Total Tour Price</span>
                <span className="fw-bold text-gold text-base">{formatETB(totalAmount)}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center">
                <span className="text-muted text-xs">Platform Fee (12%)</span>
                <span className="fw-semibold text-obsidian">{formatETB(Math.round(totalAmount * 0.12))}</span>
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
      {/* ACCEPT TOUR BOOKING MODAL                                                 */}
      {/* ========================================================================= */}
      {showAcceptModal && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.55)', zIndex: 1050 }}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 520 }}>
            <div className="modal-content rounded-4 border overflow-hidden shadow-lg" style={{ backgroundColor: '#FFFDF7', borderColor: '#E8E3D8' }}>
              <div className="p-3.5 px-4 border-bottom d-flex align-items-center justify-content-between" style={{ backgroundColor: '#EAF7EE', borderColor: '#B7E4C7' }}>
                <h3 className="h6 fw-bold mb-0 text-obsidian d-flex align-items-center gap-2">
                  <Check size={18} className="text-success" />
                  <span>Confirm & Accept Tour Booking</span>
                </h3>
                <button type="button" className="btn-close shadow-none" onClick={() => setShowAcceptModal(false)} />
              </div>
              <div className="p-4">
                <p className="text-sm text-secondary mb-3">
                  Confirm acceptance for tour itinerary <strong>{booking.bookingReference}</strong> to <strong>{siteTitle}</strong>.
                </p>

                {/* Capacity & Schedule verification card */}
                <div
                  className="p-3 rounded-3 border mb-3 text-xs"
                  style={{ backgroundColor: '#F8F5EB', borderColor: '#E8E3D8' }}
                >
                  <div className="fw-bold text-obsidian mb-1.5 d-flex align-items-center gap-1.5">
                    <ShieldCheck size={14} className="text-success" />
                    <span>Schedule & Capacity Verification:</span>
                  </div>
                  <div className="d-flex justify-content-between py-1 border-bottom">
                    <span className="text-muted">Itinerary Date:</span>
                    <span className="fw-semibold text-obsidian">{formatDate(booking.tourDate)} at {booking.scheduledTime || '09:00 AM'}</span>
                  </div>
                  <div className="d-flex justify-content-between py-1 border-bottom">
                    <span className="text-muted">Group Size:</span>
                    <span className="fw-bold text-obsidian">{booking.numberOfVisitors} Visitors</span>
                  </div>
                  <div className="d-flex justify-content-between py-1">
                    <span className="text-muted">Capacity Status:</span>
                    <span className="fw-bold text-success">
                      Verified Available ({booking.numberOfVisitors} of {maxCapacity} slots)
                    </span>
                  </div>
                </div>

                <div className="mb-2">
                  <label className="form-label text-xs fw-semibold mb-1">Administrative Note (Optional):</label>
                  <textarea
                    rows={2}
                    className="form-control form-control-sm text-xs shadow-none"
                    placeholder="e.g. Assigned guide confirmed and destination permits secured..."
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
                  {isSubmittingAccept ? 'Confirming...' : 'Confirm Acceptance'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DECLINE TOUR BOOKING MODAL                                                */}
      {/* ========================================================================= */}
      {showDeclineModal && (
        <div
          className="modal show d-block"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.55)', zIndex: 1050 }}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 520 }}>
            <div className="modal-content rounded-4 border overflow-hidden shadow-lg" style={{ backgroundColor: '#FFFDF7', borderColor: '#E8E3D8' }}>
              <div className="p-3.5 px-4 border-bottom d-flex align-items-center justify-content-between" style={{ backgroundColor: '#FEE8E8', borderColor: '#FCA5A5' }}>
                <h3 className="h6 fw-bold mb-0 text-danger d-flex align-items-center gap-2">
                  <X size={18} />
                  <span>Decline Tour Booking Request</span>
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
                    <option value="Maximum visitor group capacity reached for selected date">
                      Maximum visitor group capacity reached for selected date
                    </option>
                    <option value="Tour guide / logistical allocation unavailable for scheduled itinerary">
                      Tour guide / logistical allocation unavailable for scheduled itinerary
                    </option>
                    <option value="Site closed for special heritage conservation or state event">
                      Site closed for special heritage conservation or state event
                    </option>
                    <option value="Payment verification discrepancy or unconfirmed pre-authorization">
                      Payment verification discrepancy or unconfirmed pre-authorization
                    </option>
                    <option value="Adverse weather or travel advisory affecting tour route">
                      Adverse weather or travel advisory affecting tour route
                    </option>
                    <option value="CUSTOM">Custom reason...</option>
                  </select>
                </div>
                {declineReason === 'CUSTOM' && (
                  <div className="mb-3">
                    <input
                      type="text"
                      className="form-control form-control-sm text-xs shadow-none"
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
                    className="form-control form-control-sm text-xs shadow-none"
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
