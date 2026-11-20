'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Navigation,
  Radio,
  Car,
  User,
  Phone,
  Clock,
  Gauge,
  MapPin,
  AlertTriangle,
  RefreshCw,
  Compass,
  CheckCircle2,
  ListFilter,
  Activity,
  Layers,
} from 'lucide-react';
import { PageHeader } from '../../../components/common/PageHeader';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { RideLiveMap } from '../../../components/maps/RideLiveMap';
import { TripService } from '../../../services/tripService';
import { Ride } from '../../../types';
import { formatETB } from '../../../utils/formatters';

export default function RideMonitoringPage() {
  const [activeRides, setActiveRides] = useState<Ride[]>([]);
  const [selectedRideId, setSelectedRideId] = useState<string | null>(null);
  const [isSimulatingGps, setIsSimulatingGps] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [mobileTab, setMobileTab] = useState<'map' | 'rides' | 'telemetry'>('map');

  const fetchActiveRides = async () => {
    try {
      const rides = await TripService.getActiveRides();
      setActiveRides(rides);
      if (rides.length > 0 && !selectedRideId) {
        setSelectedRideId(rides[0].id);
      }
    } catch (err) {
      console.error('Failed to load active rides:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveRides();
  }, []);

  // Simulated GPS Telemetry Interval (every 4 seconds)
  useEffect(() => {
    if (!isSimulatingGps) return;

    const interval = setInterval(() => {
      if (selectedRideId) {
        const updated = TripService.simulateLocationStep(selectedRideId);
        if (updated) {
          setActiveRides((prev) =>
            prev.map((r) => (r.id === selectedRideId ? { ...updated } : r))
          );
        }
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [isSimulatingGps, selectedRideId]);

  const selectedRide = activeRides.find((r) => r.id === selectedRideId);

  return (
    <div>
      <PageHeader
        title="Live GPS Ride Monitoring"
        description="Real-time vehicle telemetry, driver positions, speed monitoring, and active passenger trips across Gondar"
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Live Ride Monitor' },
        ]}
        actions={
          <div className="d-flex flex-wrap align-items-center gap-2">
            <button
              type="button"
              className={`btn btn-sm d-flex align-items-center gap-1.5 ${
                isSimulatingGps ? 'btn-gold' : 'btn-outline-secondary'
              }`}
              onClick={() => setIsSimulatingGps(!isSimulatingGps)}
            >
              <Radio size={14} className={isSimulatingGps ? 'animate-pulse' : ''} />
              <span>{isSimulatingGps ? 'GPS: Streaming' : 'GPS: Paused'}</span>
            </button>
            <button
              type="button"
              className="btn btn-sm"
              style={{ backgroundColor: '#F2E9D5', color: '#252525', borderColor: '#E8E3D8' }}
              onClick={fetchActiveRides}
              title="Refresh radar"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        }
      />

      {/* Mobile / Tablet View Switcher (< 992px) */}
      <div className="d-flex d-lg-none mb-3 p-1 rounded-3 border" style={{ backgroundColor: '#F2E9D5', borderColor: '#E8E3D8' }}>
        <button
          type="button"
          className="btn btn-sm flex-grow-1 fw-bold rounded-2 py-1.5 transition-all"
          style={{
            backgroundColor: mobileTab === 'map' ? '#E9B83F' : 'transparent',
            color: '#252525',
          }}
          onClick={() => setMobileTab('map')}
        >
          Map View
        </button>
        <button
          type="button"
          className="btn btn-sm flex-grow-1 fw-bold rounded-2 py-1.5 transition-all"
          style={{
            backgroundColor: mobileTab === 'rides' ? '#E9B83F' : 'transparent',
            color: '#252525',
          }}
          onClick={() => setMobileTab('rides')}
        >
          Active Rides ({activeRides.length})
        </button>
        <button
          type="button"
          className="btn btn-sm flex-grow-1 fw-bold rounded-2 py-1.5 transition-all"
          style={{
            backgroundColor: mobileTab === 'telemetry' ? '#E9B83F' : 'transparent',
            color: '#252525',
          }}
          onClick={() => setMobileTab('telemetry')}
        >
          Telemetry
        </button>
      </div>

      <div className="row g-3">
        {/* ======================================================== */}
        {/* 1. Left Column: Active Rides List                        */}
        {/* ======================================================== */}
        <div className={`col-12 col-lg-4 col-xl-3 ${mobileTab !== 'rides' ? 'd-none d-lg-block' : ''}`}>
          <div
            className="card rounded-3 mb-3"
            style={{ backgroundColor: '#FFFDF7', borderColor: '#E8E3D8', boxShadow: 'var(--shadow-sm)' }}
          >
            <div
              className="card-header border-bottom p-3 d-flex align-items-center justify-content-between"
              style={{ backgroundColor: '#FFFDF7', borderColor: '#E8E3D8' }}
            >
              <div className="d-flex align-items-center gap-2">
                <Radio size={16} className="text-gold" />
                <h3 className="h6 fw-bold mb-0 text-obsidian">Active Rides ({activeRides.length})</h3>
              </div>
              <span className="badge fw-bold" style={{ backgroundColor: '#EAF7EE', color: '#15803D' }}>
                Online
              </span>
            </div>

            <div className="card-body p-2 overflow-y-auto" style={{ maxHeight: '640px' }}>
              {isLoading ? (
                <div className="text-center py-4 text-muted small">Loading GPS fleet...</div>
              ) : activeRides.length === 0 ? (
                <div className="text-center py-4 text-muted small">No active rides on duty.</div>
              ) : (
                <div className="d-flex flex-column gap-2">
                  {activeRides.map((ride) => {
                    const isSelected = ride.id === selectedRideId;
                    return (
                      <div
                        key={ride.id}
                        className="p-3 rounded-3 cursor-pointer border transition-all"
                        style={{
                          backgroundColor: isSelected ? 'rgba(233, 184, 63, 0.22)' : '#F8F5EB',
                          borderColor: isSelected ? '#E9B83F' : '#E8E3D8',
                          boxShadow: isSelected ? 'var(--shadow-sm)' : 'none',
                        }}
                        onClick={() => {
                          setSelectedRideId(ride.id);
                          if (window.innerWidth < 992) {
                            setMobileTab('map');
                          }
                        }}
                        role="button"
                      >
                        <div className="d-flex align-items-center justify-content-between mb-1.5">
                          <span className="fw-bold font-monospace text-obsidian text-sm">
                            {ride.rideReference}
                          </span>
                          <StatusBadge status={ride.status} size="sm" />
                        </div>

                        <div className="mb-2">
                          <div className="text-sm fw-bold text-obsidian">{ride.driverName}</div>
                          <div className="small font-monospace" style={{ color: '#77736A', fontSize: '0.75rem' }}>
                            {ride.vehiclePlate} • {ride.vehicleModel}
                          </div>
                        </div>

                        <div className="border-top pt-2 text-xs" style={{ borderColor: '#E8E3D8' }}>
                          <div className="d-flex align-items-center gap-1.5 text-truncate mb-1" style={{ color: '#77736A' }}>
                            <span className="fw-bold" style={{ color: '#15803D' }}>•</span>
                            <span className="text-truncate">
                              {ride.pickupLocation.title || ride.pickupLocation.address}
                            </span>
                          </div>
                          <div className="d-flex align-items-center gap-1.5 text-truncate" style={{ color: '#77736A' }}>
                            <span className="fw-bold" style={{ color: '#B91C1C' }}>•</span>
                            <span className="text-truncate">
                              {ride.destinationLocation.title || ride.destinationLocation.address}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 2. Center: Live Interactive Leaflet GPS Map              */}
        {/* ======================================================== */}
        <div className={`col-12 col-lg-8 col-xl-6 ${mobileTab !== 'map' ? 'd-none d-lg-block' : ''}`}>
          <div
            className="card rounded-3 overflow-hidden"
            style={{ backgroundColor: '#FFFDF7', borderColor: '#E8E3D8', boxShadow: 'var(--shadow-sm)' }}
          >
            <div className="d-block d-lg-none">
              <RideLiveMap
                rides={activeRides}
                selectedRideId={selectedRideId}
                onSelectRide={(r) => setSelectedRideId(r.id)}
                height="420px"
              />
            </div>
            <div className="d-none d-lg-block">
              <RideLiveMap
                rides={activeRides}
                selectedRideId={selectedRideId}
                onSelectRide={(r) => setSelectedRideId(r.id)}
                height="675px"
              />
            </div>

            {/* Mobile Bottom Quick-Action Bar */}
            {selectedRide && (
              <div
                className="p-3 border-top d-flex d-lg-none align-items-center justify-content-between"
                style={{ backgroundColor: '#F2E9D5', borderColor: '#E8E3D8' }}
              >
                <div>
                  <span className="fw-bold text-obsidian small">{selectedRide.rideReference}</span>
                  <div className="small" style={{ color: '#77736A', fontSize: '0.75rem' }}>
                    {selectedRide.driverName} • {selectedRide.currentSpeedKmh || 38} km/h
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-gold btn-sm px-3 fw-bold"
                  onClick={() => setMobileTab('telemetry')}
                >
                  View Telemetry
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* 3. Right Column: Selected Ride Telemetry                 */}
        {/* ======================================================== */}
        <div className={`col-12 col-xl-3 ${mobileTab !== 'telemetry' ? 'd-none d-xl-block' : ''}`}>
          {selectedRide ? (
            <div
              className="card rounded-3 h-100"
              style={{ backgroundColor: '#FFFDF7', borderColor: '#E8E3D8', boxShadow: 'var(--shadow-sm)' }}
            >
              <div
                className="card-header border-bottom p-3"
                style={{ backgroundColor: '#FFFDF7', borderColor: '#E8E3D8' }}
              >
                <div className="d-flex align-items-center justify-content-between">
                  <span className="small fw-semibold" style={{ color: '#77736A' }}>Live Telemetry</span>
                  <StatusBadge status={selectedRide.status} size="sm" />
                </div>
                <h3 className="h6 fw-bold text-obsidian mt-1 mb-0">{selectedRide.rideReference}</h3>
              </div>

              <div className="card-body p-3">
                {/* Telemetry Gauge */}
                <div
                  className="p-3 rounded-3 mb-3 text-center border"
                  style={{ backgroundColor: '#F2E9D5', borderColor: '#E8E3D8' }}
                >
                  <div className="d-flex align-items-center justify-content-center gap-2 mb-1">
                    <Gauge size={20} className="text-gold" />
                    <span className="h3 fw-bold text-obsidian mb-0">
                      {selectedRide.currentSpeedKmh || 42}
                    </span>
                    <span className="small fw-semibold text-muted">km/h</span>
                  </div>
                  <div className="small" style={{ color: '#77736A', fontSize: '0.78125rem' }}>
                    ETA: ~{selectedRide.estimatedRemainingMinutes || 8} mins remaining
                  </div>
                </div>

                {/* Driver Profile */}
                <div className="mb-3">
                  <div className="small fw-bold text-uppercase mb-2" style={{ color: '#77736A', fontSize: '0.7rem' }}>
                    Assigned Driver
                  </div>
                  <div
                    className="p-2.5 rounded-3 d-flex align-items-center gap-2.5 border"
                    style={{ backgroundColor: '#F8F5EB', borderColor: '#E8E3D8' }}
                  >
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center fw-bold shadow-xs"
                      style={{
                        width: 36,
                        height: 36,
                        backgroundColor: '#E9B83F',
                        color: '#252525',
                        flexShrink: 0,
                      }}
                    >
                      {selectedRide.driverName.charAt(0)}
                    </div>
                    <div className="overflow-hidden flex-grow-1">
                      <div className="fw-bold text-obsidian text-sm text-truncate">
                        {selectedRide.driverName}
                      </div>
                      <div className="small text-truncate" style={{ color: '#77736A', fontSize: '0.75rem' }}>
                        {selectedRide.driverPhone}
                      </div>
                    </div>
                    <span className="badge fw-bold" style={{ backgroundColor: 'rgba(233, 184, 63, 0.25)', color: '#D99B19' }}>
                      ★ {selectedRide.driverRating}
                    </span>
                  </div>
                </div>

                {/* Passenger Profile */}
                <div className="mb-3">
                  <div className="small fw-bold text-uppercase mb-2" style={{ color: '#77736A', fontSize: '0.7rem' }}>
                    Passenger
                  </div>
                  <div
                    className="p-2.5 rounded-3 d-flex align-items-center gap-2.5 border"
                    style={{ backgroundColor: '#F8F5EB', borderColor: '#E8E3D8' }}
                  >
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center text-muted border shadow-xs"
                      style={{
                        width: 36,
                        height: 36,
                        backgroundColor: '#FFFDF7',
                        borderColor: '#E8E3D8',
                        flexShrink: 0,
                      }}
                    >
                      <User size={18} />
                    </div>
                    <div className="overflow-hidden flex-grow-1">
                      <div className="fw-bold text-obsidian text-sm text-truncate">
                        {selectedRide.passengerName}
                      </div>
                      <div className="small text-truncate" style={{ color: '#77736A', fontSize: '0.75rem' }}>
                        {selectedRide.passengerPhone}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Vehicle Specs */}
                <div className="mb-3">
                  <div className="small fw-bold text-uppercase mb-2" style={{ color: '#77736A', fontSize: '0.7rem' }}>
                    Dispatched Vehicle
                  </div>
                  <div
                    className="p-2.5 rounded-3 border"
                    style={{ backgroundColor: '#F8F5EB', borderColor: '#E8E3D8', fontSize: '0.8125rem' }}
                  >
                    <div className="d-flex justify-content-between mb-1">
                      <span style={{ color: '#77736A' }}>Model:</span>
                      <span className="fw-semibold text-obsidian">{selectedRide.vehicleModel}</span>
                    </div>
                    <div className="d-flex justify-content-between mb-1">
                      <span style={{ color: '#77736A' }}>Plate:</span>
                      <span className="fw-bold font-monospace text-obsidian">{selectedRide.vehiclePlate}</span>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span style={{ color: '#77736A' }}>Category:</span>
                      <span className="fw-semibold text-obsidian">{selectedRide.vehicleCategory}</span>
                    </div>
                  </div>
                </div>

                {/* Financial Summary */}
                <div
                  className="p-3 rounded-3 border mb-3"
                  style={{ backgroundColor: '#F2E9D5', borderColor: '#E8E3D8' }}
                >
                  <div className="d-flex justify-content-between mb-1 text-sm">
                    <span style={{ color: '#77736A' }}>Estimated Fare:</span>
                    <span className="fw-bold text-gold">
                      {formatETB(selectedRide.finalFareETB || selectedRide.estimatedFareETB)}
                    </span>
                  </div>
                  <div className="d-flex justify-content-between text-xs">
                    <span style={{ color: '#77736A' }}>Payment Method:</span>
                    <span className="fw-semibold text-obsidian">{selectedRide.paymentMethod}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="d-grid gap-2">
                  <Link
                    href={`/ride-history/${selectedRide.id}`}
                    className="btn btn-outline-gold btn-sm py-2 fw-semibold text-center"
                  >
                    View Ride Route Audit
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div
              className="card rounded-3 p-4 text-center"
              style={{ backgroundColor: '#FFFDF7', borderColor: '#E8E3D8' }}
            >
              <div className="text-muted small">Select an active ride to inspect live telemetry.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
