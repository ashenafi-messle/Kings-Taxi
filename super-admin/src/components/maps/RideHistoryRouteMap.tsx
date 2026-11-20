'use client';

import dynamic from 'next/dynamic';
import React from 'react';
import { Trip } from '../../types';
import { MapPin } from 'lucide-react';

const RideHistoryRouteMapInner = dynamic(() => import('./RideHistoryRouteMapInner'), {
  ssr: false,
  loading: () => (
    <div
      className="w-100 rounded-3 bg-light border border-light d-flex flex-column align-items-center justify-content-center"
      style={{ height: '420px' }}
    >
      <div className="spinner-border text-gold mb-3" role="status">
        <span className="visually-hidden">Loading Map...</span>
      </div>
      <div className="d-flex align-items-center gap-2 text-muted small">
        <MapPin size={16} className="text-gold" />
        <span>Rendering Historical GPS Trajectory...</span>
      </div>
    </div>
  ),
});

export interface RideHistoryRouteMapProps {
  ride: Trip;
  height?: string;
}

export const RideHistoryRouteMap: React.FC<RideHistoryRouteMapProps> = (props) => {
  return <RideHistoryRouteMapInner {...props} />;
};
