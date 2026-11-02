import { AddressLocation } from './common.types';

export interface HeritageSite {
  id: string;
  name: string;
  region: string;
  unescoDesignated: boolean;
  unescoYear?: number;
  shortDescription: string;
  historicalOverview: string;
  culturalSignificance: string;
  recommendedDuration: string;
  visitingHours: string;
  heroImage: string;
  gallery: string[];
  location: AddressLocation;
  keyHighlights: string[];
  entryFeeETB: number;
}

export interface CustomContractStop {
  id: string;
  heritageSiteId: string;
  siteName: string;
  region: string;
  durationHours: number;
  order: number;
}

export interface FullContractTransportationRequest {
  id: string;
  departureLocation: AddressLocation;
  selectedStops: CustomContractStop[];
  startDate: string;
  endDate?: string;
  departureTime: string;
  passengersCount: number;
  vehicleCategory: 'suv' | 'van' | 'minibus' | 'coaster_bus';
  durationDays: number;
  estimatedPriceETB: number;
  status: 'DRAFT' | 'QUOTED' | 'REQUESTED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
  createdAt: string;
}
