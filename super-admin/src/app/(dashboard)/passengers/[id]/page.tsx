'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
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
  ShieldAlert,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import { PageHeader } from '../../../../components/common/PageHeader';
import { StatusBadge } from '../../../../components/common/StatusBadge';
import { PassengerService } from '../../../../services/passengerService';
import { Passenger } from '../../../../types';
import { formatDate, formatDateTime } from '../../../../utils/dateUtils';
import { formatETB } from '../../../../utils/formatters';
import { mockRides } from '../../../../services/mockData/rides.mock';
import { mockHotelBookings } from '../../../../services/mockData/hotelBookings.mock';
import { mockHeritageBookings } from '../../../../services/mockData/heritageBookings.mock';

export default function PassengerDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [passenger, setPassenger] = useState<Passenger | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'rides' | 'hotels' | 'heritage'>('profile');
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const loadPassenger = async () => {
    setIsLoading(true);
    try {
      const data = await PassengerService.getPassengerById(id);
      setPassenger(data);
    } catch (err) {
      console.error('Failed to load passenger:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) loadPassenger();
  }, [id]);

  const handleToggleStatus = async () => {
    if (!passenger) return;
    const newStatus = passenger.accountStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    setIsUpdating(true);
    try {
      await PassengerService.updatePassengerStatus(passenger.id, newStatus);
      loadPassenger();
    } catch (err) {
      console.error('Failed to update passenger status:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-gold" role="status" />
        <p className="text-muted mt-2 small">Loading passenger record...</p>
      </div>
    );
  }

  if (!passenger) {
    return (
      <div className="text-center py-5">
        <h2 className="h5 fw-bold text-obsidian">Passenger Record Not Found</h2>
        <Link href="/passengers" className="btn btn-outline-secondary btn-sm mt-2">
          Return to Passenger Directory
        </Link>
      </div>
    );
  }

  // Filter rides and bookings related to passenger
  const passengerRides = mockRides.filter((r) => r.passengerId === passenger.id || r.passengerPhone === passenger.phone);
  const passengerHotelBookings = mockHotelBookings.filter(
    (b) => b.passengerId === passenger.id || b.passengerPhone === passenger.phone
  );
  const passengerHeritageBookings = mockHeritageBookings.filter(
    (h) => h.passengerId === passenger.id || h.passengerPhone === passenger.phone
  );

  return (
    <div>
      <PageHeader
        title={passenger.fullName}
        description={`Passenger ID: ${passenger.passengerId} • Member since ${formatDate(passenger.createdAt)}`}
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
            <button
              type="button"
              className={`btn btn-sm d-flex align-items-center gap-1.5 ${
                passenger.accountStatus === 'ACTIVE' ? 'btn-outline-danger' : 'btn-success'
              }`}
              onClick={handleToggleStatus}
              disabled={isUpdating}
            >
              {passenger.accountStatus === 'ACTIVE' ? (
                <>
                  <XCircle size={14} />
                  <span>Suspend Account</span>
                </>
              ) : (
                <>
                  <CheckCircle size={14} />
                  <span>Reactivate Account</span>
                </>
              )}
            </button>
          </div>
        }
      />

      {/* Top Profile Summary Cards */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card shadow-sm border-0 rounded-3 p-3 bg-white h-100">
            <span className="text-muted small fw-medium">Account Status</span>
            <div className="mt-1">
              <StatusBadge status={passenger.accountStatus} size="lg" />
            </div>
          </div>
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card shadow-sm border-0 rounded-3 p-3 bg-white h-100">
            <span className="text-muted small fw-medium">Passenger Rating</span>
            <div className="d-flex align-items-center gap-1.5 mt-1">
              <Star size={18} className="text-gold fill-gold" />
              <span className="h4 fw-bold text-obsidian mb-0">{passenger.rating.toFixed(1)}</span>
            </div>
          </div>
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card shadow-sm border-0 rounded-3 p-3 bg-white h-100">
            <span className="text-muted small fw-medium">Total Trips Taken</span>
            <div className="h4 fw-bold text-obsidian mt-1 mb-0">{passenger.totalTripsTaken}</div>
          </div>
        </div>
        <div className="col-12 col-sm-6 col-xl-3">
          <div className="card shadow-sm border-0 rounded-3 p-3 bg-white h-100">
            <span className="text-muted small fw-medium">Total Platform Spend</span>
            <div className="h5 fw-bold text-gold mt-1 mb-0">{formatETB(passenger.totalSpentETB)}</div>
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
                  activeTab === 'profile' ? 'active text-gold border-bottom border-gold' : 'text-muted'
                }`}
                onClick={() => setActiveTab('profile')}
              >
                <UserCheck size={16} />
                <span>Passenger 360 Profile</span>
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
                <span>Rides History ({passengerRides.length})</span>
              </button>
            </li>
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link py-3 px-3 d-flex align-items-center gap-1.5 fw-semibold ${
                  activeTab === 'hotels' ? 'active text-gold border-bottom border-gold' : 'text-muted'
                }`}
                onClick={() => setActiveTab('hotels')}
              >
                <Building2 size={16} />
                <span>Hotel Bookings ({passengerHotelBookings.length})</span>
              </button>
            </li>
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link py-3 px-3 d-flex align-items-center gap-1.5 fw-semibold ${
                  activeTab === 'heritage' ? 'active text-gold border-bottom border-gold' : 'text-muted'
                }`}
                onClick={() => setActiveTab('heritage')}
              >
                <Compass size={16} />
                <span>Heritage Tours ({passengerHeritageBookings.length})</span>
              </button>
            </li>
          </ul>
        </div>

        <div className="card-body p-4">
          {/* TAB 1: Profile */}
          {activeTab === 'profile' && (
            <div className="row g-4">
              <div className="col-12 col-md-6">
                <h3 className="h6 fw-bold text-obsidian mb-3">Identity & Contact Verification</h3>
                <div className="d-flex flex-column gap-3">
                  <div className="p-3 rounded-2 bg-light border border-light">
                    <span className="text-muted small d-block mb-1">Phone (Telegram / Auth)</span>
                    <span className="fw-bold text-obsidian font-monospace">{passenger.phone}</span>
                    <span className="badge bg-success-subtle text-success ms-2 text-xs">Verified OTP</span>
                  </div>
                  <div className="p-3 rounded-2 bg-light border border-light">
                    <span className="text-muted small d-block mb-1">Email Address</span>
                    <span className="fw-bold text-obsidian">{passenger.email}</span>
                  </div>
                  <div className="p-3 rounded-2 bg-light border border-light">
                    <span className="text-muted small d-block mb-1">Home / Registered Base</span>
                    <span className="fw-bold text-obsidian">{passenger.registeredCity || 'Gondar, Ethiopia'}</span>
                  </div>
                </div>
              </div>

              <div className="col-12 col-md-6">
                <h3 className="h6 fw-bold text-obsidian mb-3">Security & Platform Activity</h3>
                <div className="d-flex flex-column gap-3">
                  <div className="p-3 rounded-2 bg-light border border-light">
                    <span className="text-muted small d-block mb-1">Registration Date</span>
                    <span className="fw-bold text-obsidian">{formatDateTime(passenger.createdAt)}</span>
                  </div>
                  <div className="p-3 rounded-2 bg-light border border-light">
                    <span className="text-muted small d-block mb-1">Last Trip Completed</span>
                    <span className="fw-bold text-obsidian">
                      {passenger.lastTripAt ? formatDateTime(passenger.lastTripAt) : 'Recently'}
                    </span>
                  </div>
                  <div className="p-3 rounded-2 bg-light border border-light">
                    <span className="text-muted small d-block mb-1">Preferred Payment Channel</span>
                    <span className="fw-bold text-obsidian">Telebirr / Cash in ETB</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Rides */}
          {activeTab === 'rides' && (
            <div>
              {passengerRides.length === 0 ? (
                <p className="text-muted small mb-0">No rides recorded for this passenger yet.</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light text-uppercase text-muted text-xs">
                      <tr>
                        <th>Trip Ref</th>
                        <th>Pickup & Dropoff</th>
                        <th>Driver</th>
                        <th>Fare</th>
                        <th>Status</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {passengerRides.map((ride) => (
                        <tr key={ride.id}>
                          <td className="fw-bold font-monospace text-sm">{ride.rideReference}</td>
                          <td>
                            <div className="text-sm fw-medium">{ride.pickupLocation.title || ride.pickupLocation.address}</div>
                            <div className="text-muted text-xs">&rarr; {ride.destinationLocation.title || ride.destinationLocation.address}</div>
                          </td>
                          <td className="text-sm">{ride.driverName}</td>
                          <td className="fw-bold text-gold text-sm">{formatETB(ride.finalFareETB || ride.estimatedFareETB)}</td>
                          <td>
                            <StatusBadge status={ride.status} size="sm" />
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

          {/* TAB 3: Hotel Bookings */}
          {activeTab === 'hotels' && (
            <div>
              {passengerHotelBookings.length === 0 ? (
                <p className="text-muted small mb-0">No hotel reservations found for this passenger.</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light text-uppercase text-muted text-xs">
                      <tr>
                        <th>Booking Ref</th>
                        <th>Hotel & Room</th>
                        <th>Dates</th>
                        <th>Total (ETB)</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {passengerHotelBookings.map((b) => (
                        <tr key={b.id}>
                          <td className="fw-bold font-monospace text-sm">{b.bookingReference}</td>
                          <td>
                            <div className="text-sm fw-medium">{b.hotelName}</div>
                            <div className="text-muted text-xs">{b.roomTypeName}</div>
                          </td>
                          <td className="text-sm">
                            {formatDate(b.checkInDate)} to {formatDate(b.checkOutDate)}
                          </td>
                          <td className="fw-bold text-gold text-sm">{formatETB(b.totalAmountETB)}</td>
                          <td>
                            <StatusBadge status={b.bookingStatus} size="sm" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Heritage Tours */}
          {activeTab === 'heritage' && (
            <div>
              {passengerHeritageBookings.length === 0 ? (
                <p className="text-muted small mb-0">No heritage tour bookings found for this passenger.</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light text-uppercase text-muted text-xs">
                      <tr>
                        <th>Tour Ref</th>
                        <th>Site & Package</th>
                        <th>Tour Date</th>
                        <th>Visitors</th>
                        <th>Price (ETB)</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {passengerHeritageBookings.map((hb) => (
                        <tr key={hb.id}>
                          <td className="fw-bold font-monospace text-sm">{hb.bookingReference}</td>
                          <td>
                            <div className="text-sm fw-medium">{hb.siteName || hb.heritageSiteName}</div>
                            <div className="text-muted text-xs">{hb.packageTitle || hb.packageName}</div>
                          </td>
                          <td className="text-sm">{formatDate(hb.tourDate)}</td>
                          <td className="text-sm">{hb.numberOfVisitors} Persons</td>
                          <td className="fw-bold text-gold text-sm">{formatETB(hb.totalPriceETB || hb.totalAmountETB)}</td>
                          <td>
                            <StatusBadge status={hb.bookingStatus} size="sm" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
