'use client';

import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { Ride } from '../../types';

const createPin = (color: string, label: string) => {
  return L.divIcon({
    className: 'custom-route-pin',
    html: `
      <div style="
        background-color: ${color};
        color: white;
        font-weight: bold;
        font-size: 11px;
        padding: 3px 8px;
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(37,37,37,0.25);
        border: 2px solid #FFFDF7;
        white-space: nowrap;
        text-align: center;
      ">
        ${label}
      </div>
    `,
    iconSize: [60, 24],
    iconAnchor: [30, 24],
  });
};

export interface RideHistoryRouteMapProps {
  ride: Ride;
  height?: string;
}

export default function RideHistoryRouteMapInner({
  ride,
  height = '420px',
}: RideHistoryRouteMapProps) {
  const pickupCoords: [number, number] = [
    ride.pickupLocation.latitude,
    ride.pickupLocation.longitude,
  ];
  const dropoffCoords: [number, number] = [
    ride.destinationLocation.latitude,
    ride.destinationLocation.longitude,
  ];

  const routePoints: [number, number][] =
    ride.recordedRoute && ride.recordedRoute.length > 0
      ? ride.recordedRoute.map((c) => [c.latitude, c.longitude])
      : [pickupCoords, dropoffCoords];

  const center: [number, number] = [
    (pickupCoords[0] + dropoffCoords[0]) / 2,
    (pickupCoords[1] + dropoffCoords[1]) / 2,
  ];

  return (
    <div
      className="w-100 rounded-3 overflow-hidden shadow-xs border"
      style={{ height, borderColor: '#E8E3D8', backgroundColor: '#F8F5EB' }}
    >
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Pickup Pin */}
        <Marker position={pickupCoords} icon={createPin('#15803D', 'Pickup')}>
          <Popup>
            <div className="p-1">
              <span className="badge mb-1" style={{ backgroundColor: '#EAF7EE', color: '#15803D' }}>
                Origin
              </span>
              <p className="fw-bold mb-0 text-sm">{ride.pickupLocation.title || ride.pickupLocation.address}</p>
            </div>
          </Popup>
        </Marker>

        {/* Dropoff Pin */}
        <Marker position={dropoffCoords} icon={createPin('#B91C1C', 'Dropoff')}>
          <Popup>
            <div className="p-1">
              <span className="badge mb-1" style={{ backgroundColor: '#FEE8E8', color: '#B91C1C' }}>
                Destination
              </span>
              <p className="fw-bold mb-0 text-sm">
                {ride.destinationLocation.title || ride.destinationLocation.address}
              </p>
            </div>
          </Popup>
        </Marker>

        {/* Replayed GPS Route */}
        <Polyline positions={routePoints} color="#E9B83F" weight={4} opacity={0.9} />
      </MapContainer>
    </div>
  );
}
