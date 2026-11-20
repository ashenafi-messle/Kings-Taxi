'use client';

import dynamic from 'next/dynamic';
import React from 'react';
import { Trip } from '../../types';
import { Navigation } from 'lucide-react';

const RideLiveMapInner = dynamic(() => import('./RideLiveMapInner'), {
  ssr: false,
  loading: () => (
    <div
      className="w-100 rounded-3 bg-light border border-light d-flex flex-column align-items-center justify-content-center"
      style={{ height: '620px' }}
    >
      <div className="spinner-border text-gold mb-3" role="status">
        <span className="visually-hidden">Loading Map...</span>
      </div>
      <div className="d-flex align-items-center gap-2 text-muted small">
        <Navigation size={16} className="text-gold" />
        <span>Initializing Real-Time Kings Taxi GPS Map...</span>
      </div>
    </div>
  ),
});

export interface RideLiveMapProps {
  rides: Trip[];
  selectedRideId?: string | null;
  onSelectRide?: (ride: Trip) => void;
  height?: string;
}

export const RideLiveMap: React.FC<RideLiveMapProps> = (props) => {
  return <RideLiveMapInner {...props} />;
};
