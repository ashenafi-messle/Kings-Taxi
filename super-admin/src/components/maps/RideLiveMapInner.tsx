'use client';

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { Ride } from '../../types';
import { formatETB } from '../../utils/formatters';
import { StatusBadge } from '../common/StatusBadge';

const createTaxiIcon = (isSelected: boolean) => {
  return L.divIcon({
    className: 'custom-taxi-marker',
    html: `
      <div style="
        width: ${isSelected ? '38px' : '32px'};
        height: ${isSelected ? '38px' : '32px'};
        background-color: ${isSelected ? '#E9B83F' : '#FFFDF7'};
        border: 2.5px solid ${isSelected ? '#D99B19' : '#E9B83F'};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(37, 37, 37, 0.25);
        cursor: pointer;
        transition: transform 0.2s ease;
      ">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#252525" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
          <circle cx="7" cy="17" r="2"/>
          <path d="M9 17h6"/>
          <circle cx="17" cy="17" r="2"/>
        </svg>
      </div>
    `,
    iconSize: [isSelected ? 38 : 32, isSelected ? 38 : 32],
    iconAnchor: [isSelected ? 19 : 16, isSelected ? 19 : 16],
  });
};

const createLocationPin = (type: 'pickup' | 'dropoff') => {
  const isPickup = type === 'pickup';
  const color = isPickup ? '#15803D' : '#B91C1C';
  return L.divIcon({
    className: 'custom-pin-marker',
    html: `
      <div style="
        width: 16px;
        height: 16px;
        background-color: ${color};
        border: 2px solid #FFFDF7;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(37,37,37,0.3);
      "></div>
    `,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
};

export interface RideLiveMapProps {
  rides: Ride[];
  selectedRideId?: string | null;
  onSelectRide?: (ride: Ride) => void;
  height?: string;
}

export default function RideLiveMapInner({
  rides,
  selectedRideId,
  onSelectRide,
  height = '640px',
}: RideLiveMapProps) {
  // Center on Gondar: [12.6075, 37.4670]
  const defaultCenter: [number, number] = [12.6075, 37.4670];
  const [mapCenter, setMapCenter] = useState<[number, number]>(defaultCenter);

  const selectedRide = rides.find((r) => r.id === selectedRideId);

  useEffect(() => {
    if (selectedRide?.currentDriverLocation) {
      setMapCenter([
        selectedRide.currentDriverLocation.latitude,
        selectedRide.currentDriverLocation.longitude,
      ]);
    }
  }, [selectedRide]);

  return (
    <div
      className="w-100 rounded-3 overflow-hidden shadow-xs border position-relative"
      style={{ height, borderColor: '#E8E3D8', backgroundColor: '#F8F5EB' }}
    >
      <MapContainer
        center={mapCenter}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {rides.map((ride) => {
          if (!ride.currentDriverLocation) return null;
          const isSelected = ride.id === selectedRideId;

          const polylinePoints: [number, number][] =
            ride.recordedRoute && ride.recordedRoute.length > 0
              ? ride.recordedRoute.map((p) => [p.latitude, p.longitude])
              : [
                  [ride.pickupLocation.latitude, ride.pickupLocation.longitude],
                  [ride.currentDriverLocation.latitude, ride.currentDriverLocation.longitude],
                  [ride.destinationLocation.latitude, ride.destinationLocation.longitude],
                ];

          return (
            <React.Fragment key={ride.id}>
              {/* Pickup Marker */}
              <Marker
                position={[ride.pickupLocation.latitude, ride.pickupLocation.longitude]}
                icon={createLocationPin('pickup')}
              >
                <Popup>
                  <div className="p-1" style={{ color: '#252525' }}>
                    <span className="badge mb-1" style={{ backgroundColor: '#EAF7EE', color: '#15803D' }}>
                      Pickup Location
                    </span>
                    <p className="fw-bold mb-0 text-sm">
                      {ride.pickupLocation.title || ride.pickupLocation.address}
                    </p>
                    <small style={{ color: '#77736A' }}>{ride.passengerName}</small>
                  </div>
                </Popup>
              </Marker>

              {/* Destination Marker */}
              <Marker
                position={[ride.destinationLocation.latitude, ride.destinationLocation.longitude]}
                icon={createLocationPin('dropoff')}
              >
                <Popup>
                  <div className="p-1" style={{ color: '#252525' }}>
                    <span className="badge mb-1" style={{ backgroundColor: '#FEE8E8', color: '#B91C1C' }}>
                      Dropoff Destination
                    </span>
                    <p className="fw-bold mb-0 text-sm">
                      {ride.destinationLocation.title || ride.destinationLocation.address}
                    </p>
                  </div>
                </Popup>
              </Marker>

              {/* Live Taxi Vehicle Marker */}
              <Marker
                position={[
                  ride.currentDriverLocation.latitude,
                  ride.currentDriverLocation.longitude,
                ]}
                icon={createTaxiIcon(isSelected)}
                eventHandlers={{
                  click: () => onSelectRide && onSelectRide(ride),
                }}
              >
                <Popup>
                  <div className="p-2" style={{ minWidth: 210, color: '#252525' }}>
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <span className="fw-bold text-obsidian">{ride.rideReference}</span>
                      <StatusBadge status={ride.status} size="sm" />
                    </div>
                    <div className="mb-1">
                      <span className="small" style={{ color: '#77736A' }}>Driver: </span>
                      <span className="fw-semibold text-sm">{ride.driverName}</span>
                    </div>
                    <div className="mb-1">
                      <span className="small" style={{ color: '#77736A' }}>Plate: </span>
                      <span className="fw-semibold text-sm font-monospace">{ride.vehiclePlate}</span>
                    </div>
                    <div className="mb-1">
                      <span className="small" style={{ color: '#77736A' }}>Speed: </span>
                      <span className="fw-semibold text-sm">{ride.currentSpeedKmh || 42} km/h</span>
                    </div>
                    <div className="border-top pt-2 d-flex justify-content-between" style={{ borderColor: '#E8E3D8' }}>
                      <span className="small" style={{ color: '#77736A' }}>Est. Fare:</span>
                      <span className="fw-bold text-gold">
                        {formatETB(ride.finalFareETB || ride.estimatedFareETB)}
                      </span>
                    </div>
                  </div>
                </Popup>
              </Marker>

              {/* Active Route Polyline */}
              {isSelected && (
                <Polyline
                  positions={polylinePoints}
                  color="#D99B19"
                  weight={4}
                  opacity={0.9}
                  dashArray="6, 8"
                />
              )}
            </React.Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
}
