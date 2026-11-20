'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  History,
  Car,
  User,
  Phone,
  Clock,
  MapPin,
  DollarSign,
  ArrowLeft,
  Navigation,
  CheckCircle,
  ShieldCheck,
} from 'lucide-react';
import { PageHeader } from '../../../../components/common/PageHeader';
import { StatusBadge } from '../../../../components/common/StatusBadge';
import { RideHistoryRouteMap } from '../../../../components/maps/RideHistoryRouteMap';
import { TripService } from '../../../../services/tripService';
import { Ride } from '../../../../types';
import { formatDate, formatDateTime } from '../../../../utils/dateUtils';
import { formatETB } from '../../../../utils/formatters';

export default function RideHistoryDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [ride, setRide] = useState<Ride | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadRide = async () => {
    setIsLoading(true);
    try {
      const data = await TripService.getRideById(id);
      setRide(data);
    } catch (err) {
      console.error('Failed to load ride history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) loadRide();
  }, [id]);

  if (isLoading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-gold" role="status" />
        <p className="text-muted mt-2 small">Loading ride details...</p>
      </div>
    );
  }

  if (!ride) {
    return (
      <div className="text-center py-5">
        <h2 className="h5 fw-bold text-obsidian">Trip Not Found</h2>
        <Link href="/ride-history" className="btn btn-outline-secondary btn-sm mt-2">
          Return to Ride History
        </Link>
      </div>
    );
  }

  const fareTotal = ride.finalFareETB || ride.estimatedFareETB;
  const platformCommission = Math.round(fareTotal * 0.15);
  const driverPayout = fareTotal - platformCommission;

  return (
    <div>
      <PageHeader
        title={`Trip: ${ride.rideReference}`}
        description={`Completed on ${formatDateTime(ride.createdAt)} • ${ride.distanceKm} km in ${ride.durationMinutes} mins`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Ride History', href: '/ride-history' },
          { label: ride.rideReference },
        ]}
        actions={
          <Link href="/ride-history" className="btn btn-outline-secondary btn-sm">
            <ArrowLeft size={14} className="me-1" />
            <span>Back</span>
          </Link>
        }
      />

      <div className="row g-4">
        {/* Left Column: Recorded GPS Route Map */}
        <div className="col-12 col-lg-7">
          <div className="card shadow-sm border-0 rounded-3 mb-4 overflow-hidden">
            <div className="card-header bg-white border-bottom border-light p-3 d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center gap-2">
                <Navigation size={18} className="text-gold" />
                <h3 className="h6 fw-bold text-obsidian mb-0">Recorded GPS Route Trajectory</h3>
              </div>
              <StatusBadge status={ride.status} size="sm" />
            </div>

            <div className="card-body p-0">
              <RideHistoryRouteMap ride={ride} height="440px" />
            </div>

            <div className="card-footer bg-white border-top border-light p-3">
              <div className="row g-3 text-center">
                <div className="col-4 border-end">
                  <span className="text-muted small d-block">Distance</span>
                  <span className="fw-bold text-obsidian">{ride.distanceKm} km</span>
                </div>
                <div className="col-4 border-end">
                  <span className="text-muted small d-block">Duration</span>
                  <span className="fw-bold text-obsidian">{ride.durationMinutes} mins</span>
                </div>
                <div className="col-4">
                  <span className="text-muted small d-block">Final Fare</span>
                  <span className="fw-bold text-gold">{formatETB(fareTotal)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Location Details */}
          <div className="card shadow-sm border-0 rounded-3">
            <div className="card-header bg-white border-bottom border-light p-3">
              <h3 className="h6 fw-bold text-obsidian mb-0">Pickup & Destination Points</h3>
            </div>
            <div className="card-body p-3">
              <div className="d-flex align-items-start gap-3 mb-3">
                <div className="rounded-circle bg-success text-white p-1.5 mt-0.5">
                  <MapPin size={16} />
                </div>
                <div>
                  <span className="text-muted text-xs text-uppercase fw-semibold">Pickup Location</span>
                  <div className="fw-bold text-obsidian text-sm">
                    {ride.pickupLocation.title || ride.pickupLocation.address}
                  </div>
                  <div className="text-muted text-xs">{ride.pickupLocation.address}</div>
                </div>
              </div>

              <div className="d-flex align-items-start gap-3">
                <div className="rounded-circle bg-danger text-white p-1.5 mt-0.5">
                  <MapPin size={16} />
                </div>
                <div>
                  <span className="text-muted text-xs text-uppercase fw-semibold">Destination Location</span>
                  <div className="fw-bold text-obsidian text-sm">
                    {ride.destinationLocation.title || ride.destinationLocation.address}
                  </div>
                  <div className="text-muted text-xs">{ride.destinationLocation.address}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Driver, Passenger & Fare Settlement */}
        <div className="col-12 col-lg-5">
          {/* Driver Card */}
          <div className="card shadow-sm border-0 rounded-3 mb-4">
            <div className="card-header bg-white border-bottom border-light p-3">
              <div className="d-flex align-items-center gap-2">
                <Car size={18} className="text-gold" />
                <h3 className="h6 fw-bold text-obsidian mb-0">Assigned Driver & Vehicle</h3>
              </div>
            </div>
            <div className="card-body p-3">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="fw-bold text-obsidian">{ride.driverName}</span>
                <span className="text-muted text-xs font-monospace">{ride.driverPhone}</span>
              </div>
              <div className="p-2.5 rounded-2 bg-light border border-light text-xs d-flex justify-content-between">
                <span>Vehicle: {ride.vehicleModel}</span>
                <span className="font-monospace fw-bold">{ride.vehiclePlate}</span>
              </div>
            </div>
          </div>

          {/* Passenger Card */}
          <div className="card shadow-sm border-0 rounded-3 mb-4">
            <div className="card-header bg-white border-bottom border-light p-3">
              <div className="d-flex align-items-center gap-2">
                <User size={18} className="text-gold" />
                <h3 className="h6 fw-bold text-obsidian mb-0">Passenger</h3>
              </div>
            </div>
            <div className="card-body p-3">
              <div className="fw-bold text-obsidian text-sm">{ride.passengerName}</div>
              <div className="text-muted text-xs font-monospace">{ride.passengerPhone}</div>
            </div>
          </div>

          {/* Fare Breakdown */}
          <div className="card shadow-sm border-0 rounded-3">
            <div className="card-header bg-white border-bottom border-light p-3 d-flex align-items-center justify-content-between">
              <h3 className="h6 fw-bold text-obsidian mb-0">Fare Breakdown & Commission</h3>
              <span className="badge bg-success-subtle text-success">{ride.paymentStatus}</span>
            </div>
            <div className="card-body p-3">
              <div className="d-flex justify-content-between mb-2 text-sm">
                <span className="text-muted">Gross Passenger Fare:</span>
                <span className="fw-bold text-obsidian">{formatETB(fareTotal)}</span>
              </div>
              <div className="d-flex justify-content-between mb-2 text-sm">
                <span className="text-muted">Kings Platform Fee (15%):</span>
                <span className="fw-bold text-gold">-{formatETB(platformCommission)}</span>
              </div>
              <div className="border-top pt-2 d-flex justify-content-between mb-3 text-sm">
                <span className="fw-semibold text-obsidian">Driver Net Payout (85%):</span>
                <span className="fw-bold text-success">{formatETB(driverPayout)}</span>
              </div>

              <div className="p-2.5 rounded-2 bg-light border text-xs">
                <div className="d-flex justify-content-between">
                  <span className="text-muted">Payment Channel:</span>
                  <span className="fw-bold text-obsidian">{ride.paymentMethod}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
