export type Currency = 'ETB' | 'USD';

export type ServiceVertical = 'ride' | 'hotel' | 'heritage' | 'tour';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

export interface AddressLocation {
  id: string;
  title: string;
  subtitle?: string;
  address: string;
  coordinates: LocationCoordinates;
  city?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export type StatusVariant = 'success' | 'warning' | 'danger' | 'info' | 'default';
