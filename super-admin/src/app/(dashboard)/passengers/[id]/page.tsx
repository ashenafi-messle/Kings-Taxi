'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  UserCheck,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Star,
  DollarSign,
  Car,
  Building2,
  Compass,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  CreditCard,
  History,
  AlertCircle,
  Shield,
  Ban,
  Check,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { PageHeader } from '../../../../components/common/PageHeader';
import { StatusBadge } from '../../../../components/common/StatusBadge';
import { PassengerService } from '../../../../services/passengerService';
import {
  PassengerDetail,
  PassengerRideItem,
  PassengerBookingItem,
  PassengerPaymentItem,
} from '../../../../types';
import { formatDate, formatDateTime } from '../../../../utils/dateUtils';
import { formatETB } from '../../../../utils/formatters';

export default function PassengerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [passenger, setPassenger] = useState<PassengerDetail | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'rides' | 'bookings' | 'payments' | 'audit'>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Tab-specific async data
  const [rides, setRides] = useState<PassengerRideItem[]>([]);
  const [isLoadingRides, setIsLoadingRides] = useState(false);
  const [bookings, setBookings] = useState<PassengerBookingItem[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);
  const [payments, setPayments] = useState<PassengerPaymentItem[]>([]);
  const [isLoadingPayments, setIsLoadingPayments] = useState(false);

  // Status modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<'ACTIVE' | 'SUSPENDED'>('ACTIVE');
  const [suspensionReason, setSuspensionReason] = useState('');
  const [isSubmittingStatus, setIsSubmittingStatus] = useState(false);
  const [statusActionError, setStatusActionError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadPassenger = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await PassengerService.getPassengerById(id);
      if (!data) {
        setErrorMessage('Passenger not found in records.');
      } else {
        setPassenger(data);
      }
    } catch (err: any) {
      console.error('[PassengerDetailPage] Failed to load passenger:', err);
      setErrorMessage(err.message || 'Failed to retrieve passenger record.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadPassenger();
    }
  }, [id]);

  // Load sub-tab data when switching
  useEffect(() => {
    if (!id) return;
    if (activeTab === 'rides' && rides.length === 0) {
      setIsLoadingRides(true);
      PassengerService.getPassengerRides(id, { limit: 50 })
        .then((res) => setRides(res.items))
        .catch((err) => console.error('Failed to load rides:', err))
        .finally(() => setIsLoadingRides(false));
    } else if (activeTab === 'bookings' && bookings.length === 0) {
      setIsLoadingBookings(true);
      PassengerService.getPassengerBookings(id, { limit: 50 })
        .then((res) => setBookings(res.items))
        .catch((err) => console.error('Failed to load bookings:', err))
        .finally(() => setIsLoadingBookings(false));
    } else if (activeTab === 'payments' && payments.length === 0) {
      setIsLoadingPayments(true);
      PassengerService.getPassengerPayments(id, { limit: 50 })
        .then((res) => setPayments(res.items))
        .catch((err) => console.error('Failed to load payments:', err))
        .finally(() => setIsLoadingPayments(false));
    }
  }, [id, activeTab]);

  const handleOpenStatusModal = (status: 'ACTIVE' | 'SUSPENDED') => {
    setTargetStatus(status);
    setSuspensionReason('');
    setStatusActionError(null);
    setIsModalOpen(true);
  };

  const handleConfirmStatusChange = async () => {
    if (!passenger) return;
    if (targetStatus === 'SUSPENDED' && !suspensionReason.trim()) {
      setStatusActionError('Please provide a reason for suspending this passenger account.');
      return;
    }

    setIsSubmittingStatus(true);
    setStatusActionError(null);
    try {
      const updated = await PassengerService.updatePassengerStatus(
        passenger.id,
        targetStatus,
        targetStatus === 'SUSPENDED' ? suspensionReason.trim() : undefined
      );

      if (updated) {
        setPassenger(updated);
      } else {
        loadPassenger();
      }

      setToastMessage({
        type: 'success',
        text: `Passenger account status successfully updated to ${targetStatus}.`,
      });
      setIsModalOpen(false);
    } catch (err: any) {
      setStatusActionError(err.message || 'Failed to update passenger status.');
    } finally {
      setIsSubmittingStatus(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-gold" role="status" />
        <p className="text-muted mt-2 small">Loading comprehensive passenger profile from database...</p>
      </div>
    );
  }

  if (errorMessage || !passenger) {
    return (
      <div className="text-center py-5">
        <AlertTriangle size={36} className="text-warning mb-2" />
        <h2 className="h5 fw-bold text-obsidian">{errorMessage || 'Passenger Record Not Found'}</h2>
        <p className="text-muted text-sm">The requested passenger does not exist in the database.</p>
        <Link href="/passengers" className="btn btn-outline-secondary btn-sm mt-2">
          Return to Passenger Directory
        </Link>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={passenger.fullName}
        description={`Passenger ID: ${passenger.passengerId} • Registered ${formatDate(passenger.createdAt)}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Passengers', href: '/passengers' },
          { label: passenger.fullName },
        ]}
        actions={
          <div className="d-flex align-items-center gap-2">
            <Link href="/passengers" className="btn btn-outline-secondary btn-sm">
              <ArrowLeft size={14} className="me-1" />
              <span>Back</span>
            </Link>

            {passenger.accountStatus === 'ACTIVE' ? (
              <button
                type="button"
                className="btn btn-sm btn-outline-danger d-flex align-items-center gap-1.5"
                onClick={() => handleOpenStatusModal('SUSPENDED')}
              >
                <Ban size={14} />
                <span>Suspend Account</span>
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-sm btn-success d-flex align-items-center gap-1.5"
                onClick={() => handleOpenStatusModal('ACTIVE')}
              >
                <Check size={14} />
                <span>Reactivate Account</span>
              </button>
            )}
          </div>
        }
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`alert ${
            toastMessage.type === 'success' ? 'alert-success' : 'alert-danger'
          } alert-dismissible fade show py-2.5 px-3 mb-4 rounded-3 text-sm d-flex align-items-center justify-content-between`}
        >
          <div className="d-flex align-items-center gap-2">
            {toastMessage.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <span>{toastMessage.text}</span>
          </div>
          <button
            type="button"
            className="btn-close shadow-none p-2"
            onClick={() => setToastMessage(null)}
          />
        </div>
      )}

      {/* Suspension Alert Banner if Suspended */}
      {passenger.accountStatus === 'SUSPENDED' && (
        <div className="alert alert-danger py-3 px-4 mb-4 rounded-3 d-flex align-items-start gap-3">
          <Ban size={20} className="flex-shrink-0 mt-0.5 text-danger" />
          <div>
            <div className="fw-bold text-danger">Passenger Account Is Suspended</div>
            <div className="text-sm text-secondary mt-0.5">
              Reason: <strong>{passenger.suspensionReason || 'Administrative suspension'}</strong>
              {passenger.suspendedAt && ` • Suspended on ${formatDateTime(passenger.suspendedAt)}`}
            </div>
          </div>
        </div>
      )}

      {/* Top 360 Summary Cards */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card shadow-sm border-0 rounded-3 p-3 bg-white h-100">
            <span className="text-muted small fw-medium">Account Status</span>
            <div className="d-flex align-items-center gap-2 mt-1">
              <StatusBadge status={passenger.accountStatus} size="lg" />
              {passenger.isVerified && (
                <span className="badge bg-success-subtle text-success text-xs">Verified OTP</span>
              )}
            </div>
          </div>
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card shadow-sm border-0 rounded-3 p-3 bg-white h-100">
            <span className="text-muted small fw-medium">Passenger Rating</span>
            <div className="d-flex align-items-center gap-1.5 mt-1">
              <Star size={18} className="text-gold fill-gold" />
              <span className="h4 fw-bold text-obsidian mb-0">
                {(passenger.statistics?.rating || passenger.rating || 5.0).toFixed(1)}
              </span>
            </div>
          </div>
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card shadow-sm border-0 rounded-3 p-3 bg-white h-100">
            <span className="text-muted small fw-medium">Completed Rides</span>
            <div className="h4 fw-bold text-obsidian mt-1 mb-0">
              {passenger.statistics?.completedRides ?? passenger.completedRides ?? passenger.totalRides ?? 0}
            </div>
          </div>
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card shadow-sm border-0 rounded-3 p-3 bg-white h-100">
            <span className="text-muted small fw-medium">Total Platform Spend</span>
            <div className="h5 fw-bold text-gold mt-1 mb-0">
              {formatETB(passenger.statistics?.totalSpentETB ?? passenger.totalSpentETB ?? 0)}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="card shadow-sm border-0 rounded-3">
        <div className="card-header bg-white border-bottom border-light p-0">
          <ul className="nav nav-tabs card-header-tabs m-0 px-3 border-0">
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link py-3 px-3 d-flex align-items-center gap-1.5 fw-semibold ${
                  activeTab === 'overview' ? 'active text-gold border-bottom border-gold' : 'text-muted'
                }`}
                onClick={() => setActiveTab('overview')}
              >
                <UserCheck size={16} />
                <span>Overview & Profile</span>
              </button>
            </li>
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link py-3 px-3 d-flex align-items-center gap-1.5 fw-semibold ${
                  activeTab === 'rides' ? 'active text-gold border-bottom border-gold' : 'text-muted'
                }`}
                onClick={() => setActiveTab('rides')}
              >
                <Car size={16} />
                <span>Ride History</span>
              </button>
            </li>
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link py-3 px-3 d-flex align-items-center gap-1.5 fw-semibold ${
                  activeTab === 'bookings' ? 'active text-gold border-bottom border-gold' : 'text-muted'
                }`}
                onClick={() => setActiveTab('bookings')}
              >
                <Building2 size={16} />
                <span>Hotel & Heritage Bookings</span>
              </button>
            </li>
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link py-3 px-3 d-flex align-items-center gap-1.5 fw-semibold ${
                  activeTab === 'payments' ? 'active text-gold border-bottom border-gold' : 'text-muted'
                }`}
                onClick={() => setActiveTab('payments')}
              >
                <CreditCard size={16} />
                <span>Payment History</span>
              </button>
            </li>
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link py-3 px-3 d-flex align-items-center gap-1.5 fw-semibold ${
                  activeTab === 'audit' ? 'active text-gold border-bottom border-gold' : 'text-muted'
                }`}
                onClick={() => setActiveTab('audit')}
              >
                <History size={16} />
                <span>Audit & Security</span>
              </button>
            </li>
          </ul>
        </div>

        <div className="card-body p-4">
          {/* TAB 1: Overview & Profile */}
          {activeTab === 'overview' && (
            <div className="row g-4">
              <div className="col-12 col-md-6">
                <h3 className="h6 fw-bold text-obsidian mb-3">Identity & Contact Verification</h3>
                <div className="d-flex flex-column gap-3">
                  <div className="p-3 rounded-2 bg-light border border-light">
                    <span className="text-muted small d-block mb-1">Phone Number (Authentication)</span>
                    <span className="fw-bold text-obsidian font-monospace">
                      {passenger.phoneNumber || passenger.phone || 'None registered'}
                    </span>
                    {passenger.isPhoneVerified && (
                      <span className="badge bg-success-subtle text-success ms-2 text-xs">Verified OTP</span>
                    )}
                  </div>
                  <div className="p-3 rounded-2 bg-light border border-light">
                    <span className="text-muted small d-block mb-1">Email Address</span>
                    <span className="fw-bold text-obsidian">{passenger.email || 'None registered'}</span>
                    {passenger.isEmailVerified && (
                      <span className="badge bg-success-subtle text-success ms-2 text-xs">Verified</span>
                    )}
                  </div>
                  <div className="p-3 rounded-2 bg-light border border-light">
                    <span className="text-muted small d-block mb-1">City / Region Base</span>
                    <span className="fw-bold text-obsidian">{passenger.city || passenger.registeredCity || 'Gondar, Ethiopia'}</span>
                  </div>
                  <div className="p-3 rounded-2 bg-light border border-light">
                    <span className="text-muted small d-block mb-1">Emergency Contact</span>
                    <span className="fw-bold text-obsidian">
                      {passenger.emergencyContactName ? `${passenger.emergencyContactName} (${passenger.emergencyContactPhone || 'No phone'})` : 'Not provided'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="col-12 col-md-6">
                <h3 className="h6 fw-bold text-obsidian mb-3">Platform Lifetime Statistics</h3>
                <div className="d-flex flex-column gap-3">
                  <div className="p-3 rounded-2 bg-light border border-light">
                    <span className="text-muted small d-block mb-1">Registration Date</span>
                    <span className="fw-bold text-obsidian">{formatDateTime(passenger.createdAt)}</span>
                  </div>
                  <div className="p-3 rounded-2 bg-light border border-light">
                    <span className="text-muted small d-block mb-1">Cancellation Rate</span>
                    <span className="fw-bold text-obsidian">
                      {passenger.statistics?.cancellationRate ?? 0}% ({passenger.statistics?.cancelledRides ?? 0} cancelled)
                    </span>
                  </div>
                  <div className="p-3 rounded-2 bg-light border border-light">
                    <span className="text-muted small d-block mb-1">Hospitality Bookings</span>
                    <span className="fw-bold text-obsidian">
                      {passenger.statistics?.hotelBookingsCount ?? passenger.hotelBookingsCount ?? 0} Hotel stays •{' '}
                      {passenger.statistics?.heritageBookingsCount ?? passenger.heritageBookingsCount ?? 0} Heritage Tours
                    </span>
                  </div>
                  <div className="p-3 rounded-2 bg-light border border-light">
                    <span className="text-muted small d-block mb-1">Preferred Language</span>
                    <span className="fw-bold text-obsidian text-uppercase">{passenger.language || 'EN'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Rides */}
          {activeTab === 'rides' && (
            <div>
              {isLoadingRides ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-gold spinner-border-sm" />
                  <p className="text-muted small mt-2">Loading ride history...</p>
                </div>
              ) : rides.length === 0 ? (
                <div className="text-center py-4 text-muted small">
                  <Car size={32} className="text-muted mb-2 opacity-50" />
                  <p className="mb-0">No ride records found for this passenger.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light text-uppercase text-muted text-xs">
                      <tr>
                        <th>Booking Ref</th>
                        <th>Route</th>
                        <th>Driver & Vehicle</th>
                        <th>Distance</th>
                        <th>Fare</th>
                        <th>Status</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rides.map((ride) => (
                        <tr key={ride.id}>
                          <td className="fw-bold font-monospace text-sm">{ride.bookingReference}</td>
                          <td>
                            <div className="text-sm fw-medium">{ride.pickupLocation}</div>
                            <div className="text-muted text-xs">&rarr; {ride.destinationLocation}</div>
                          </td>
                          <td>
                            <div className="text-sm">{ride.driver?.name || 'Unassigned'}</div>
                            <div className="text-muted text-xs font-monospace">
                              {ride.vehicle ? `${ride.vehicle.plateNumber} (${ride.vehicle.model})` : ''}
                            </div>
                          </td>
                          <td className="text-sm">{ride.distanceKm ? `${ride.distanceKm} km` : '—'}</td>
                          <td className="fw-bold text-gold text-sm">{formatETB(ride.fare)}</td>
                          <td>
                            <StatusBadge status={ride.bookingStatus} size="sm" />
                          </td>
                          <td className="text-muted text-xs">{formatDate(ride.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Hotel & Heritage Bookings */}
          {activeTab === 'bookings' && (
            <div>
              {isLoadingBookings ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-gold spinner-border-sm" />
                  <p className="text-muted small mt-2">Loading bookings...</p>
                </div>
              ) : bookings.length === 0 ? (
                <div className="text-center py-4 text-muted small">
                  <Building2 size={32} className="text-muted mb-2 opacity-50" />
                  <p className="mb-0">No hotel or tour reservations recorded for this passenger.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light text-uppercase text-muted text-xs">
                      <tr>
                        <th>Reference</th>
                        <th>Service Type</th>
                        <th>Details</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Payment</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.map((b) => (
                        <tr key={b.id}>
                          <td className="fw-bold font-monospace text-sm">{b.reference}</td>
                          <td>
                            <span
                              className={`badge text-xs ${
                                b.type === 'HOTEL'
                                  ? 'bg-primary-subtle text-primary'
                                  : b.type === 'HERITAGE'
                                  ? 'bg-warning-subtle text-warning-emphasis'
                                  : 'bg-secondary-subtle text-secondary'
                              }`}
                            >
                              {b.type}
                            </span>
                          </td>
                          <td>
                            <div className="text-sm fw-medium">{b.title}</div>
                            <div className="text-muted text-xs">{b.subtitle}</div>
                          </td>
                          <td className="fw-bold text-gold text-sm">{formatETB(b.amount)}</td>
                          <td>
                            <StatusBadge status={b.status} size="sm" />
                          </td>
                          <td>
                            <StatusBadge status={b.paymentStatus} size="sm" />
                          </td>
                          <td className="text-muted text-xs">{formatDate(b.date)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Payments */}
          {activeTab === 'payments' && (
            <div>
              {isLoadingPayments ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-gold spinner-border-sm" />
                  <p className="text-muted small mt-2">Loading payment ledger...</p>
                </div>
              ) : payments.length === 0 ? (
                <div className="text-center py-4 text-muted small">
                  <CreditCard size={32} className="text-muted mb-2 opacity-50" />
                  <p className="mb-0">No payment records found for this passenger.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light text-uppercase text-muted text-xs">
                      <tr>
                        <th>Transaction Ref</th>
                        <th>Related Item</th>
                        <th>Method</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Paid At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((p) => (
                        <tr key={p.id}>
                          <td className="fw-bold font-monospace text-sm">{p.transactionReference}</td>
                          <td className="text-sm">{p.relatedItem}</td>
                          <td>
                            <span className="badge bg-light text-dark border text-xs">{p.paymentMethod}</span>
                          </td>
                          <td className="fw-bold text-gold text-sm">{formatETB(p.amount)}</td>
                          <td>
                            <StatusBadge status={p.paymentStatus} size="sm" />
                          </td>
                          <td className="text-muted text-xs">
                            {p.paidAt ? formatDateTime(p.paidAt) : 'Pending'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: Audit & Security */}
          {activeTab === 'audit' && (
            <div>
              {passenger.auditHistory && passenger.auditHistory.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light text-uppercase text-muted text-xs">
                      <tr>
                        <th>Action</th>
                        <th>Actor</th>
                        <th>Details</th>
                        <th>Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {passenger.auditHistory.map((a) => (
                        <tr key={a.id}>
                          <td>
                            <span className="fw-bold font-monospace text-sm">{a.action}</span>
                          </td>
                          <td>
                            <span className="badge bg-secondary-subtle text-secondary text-xs">
                              {a.actorType}: {a.actorId || 'System'}
                            </span>
                          </td>
                          <td className="text-muted text-xs font-monospace">
                            {a.metadata ? JSON.stringify(a.metadata) : '—'}
                          </td>
                          <td className="text-muted text-xs">{formatDateTime(a.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-4 text-muted small">
                  <Shield size={32} className="text-muted mb-2 opacity-50" />
                  <p className="mb-0">No administrative audit records logged for this passenger yet.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Suspension / Reactivation Modal */}
      {isModalOpen && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ backgroundColor: 'rgba(37, 37, 37, 0.45)', backdropFilter: 'blur(3px)', zIndex: 1060 }}
        >
          <div className="modal-dialog modal-dialog-centered px-3" style={{ maxWidth: 480 }}>
            <div
              className="modal-content shadow-lg border rounded-4 overflow-hidden"
              style={{ backgroundColor: '#FFFDF7', borderColor: '#E8E3D8' }}
            >
              <div
                className="modal-header border-bottom py-3 px-4"
                style={{ backgroundColor: '#F2E9D5', borderColor: '#E8E3D8' }}
              >
                <div className="d-flex align-items-center gap-2">
                  <div
                    className="p-2 rounded-circle"
                    style={{
                      backgroundColor: targetStatus === 'SUSPENDED' ? '#FEE8E8' : '#EAF7EE',
                      color: targetStatus === 'SUSPENDED' ? '#B91C1C' : '#15803D',
                    }}
                  >
                    {targetStatus === 'SUSPENDED' ? <Ban size={19} /> : <Check size={19} />}
                  </div>
                  <h5 className="modal-title fw-bold mb-0 text-obsidian" style={{ fontSize: '1.05rem' }}>
                    {targetStatus === 'SUSPENDED' ? 'Suspend Passenger Account' : 'Reactivate Passenger Account'}
                  </h5>
                </div>
                <button
                  type="button"
                  className="btn-close shadow-none"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmittingStatus}
                />
              </div>

              <div className="modal-body p-4">
                <p className="text-secondary text-sm mb-3">
                  Are you sure you want to{' '}
                  <strong className="text-obsidian">
                    {targetStatus === 'SUSPENDED' ? 'suspend' : 'reactivate'}
                  </strong>{' '}
                  the account for <strong className="text-obsidian">{passenger.fullName}</strong>?
                </p>

                {targetStatus === 'SUSPENDED' ? (
                  <div>
                    <label className="form-label text-sm fw-medium text-obsidian mb-1">
                      Reason for Suspension *
                    </label>
                    <textarea
                      rows={3}
                      className="form-control text-sm shadow-none"
                      placeholder="e.g. Terms violation, multiple ride cancellations, payment disputes..."
                      value={suspensionReason}
                      onChange={(e) => setSuspensionReason(e.target.value)}
                      required
                    />
                    <div className="form-text text-xs text-muted mt-1">
                      Suspension immediately revokes active mobile sessions and prevents booking new rides.
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-light rounded-3 text-xs text-muted">
                    Reactivating will restore mobile app access and allow the passenger to request rides immediately.
                  </div>
                )}

                {statusActionError && (
                  <div className="alert alert-danger py-2 px-3 mt-3 mb-0 rounded-3 text-xs d-flex align-items-center gap-2">
                    <AlertCircle size={15} className="flex-shrink-0" />
                    <span>{statusActionError}</span>
                  </div>
                )}
              </div>

              <div
                className="modal-footer border-top py-2.5 px-4 d-flex justify-content-end gap-2"
                style={{ backgroundColor: '#FDFBF7', borderColor: '#E8E3D8' }}
              >
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm px-3"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmittingStatus}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={`btn btn-sm px-3 d-flex align-items-center gap-1.5 ${
                    targetStatus === 'SUSPENDED' ? 'btn-danger' : 'btn-success'
                  }`}
                  onClick={handleConfirmStatusChange}
                  disabled={isSubmittingStatus}
                >
                  {isSubmittingStatus && <span className="spinner-border spinner-border-sm" />}
                  <span>{targetStatus === 'SUSPENDED' ? 'Confirm Suspension' : 'Reactivate Account'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
