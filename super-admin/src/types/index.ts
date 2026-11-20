export * from './auth.types';
export * from './driver.types';
export * from './vehicle.types';
export * from './passenger.types';
export * from './hotel.types';
export * from './heritage.types';
export * from './trip.types';
export * from './support.types';
export * from './notification.types';
export * from './settings.types';
export * from './dashboard.types';

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

