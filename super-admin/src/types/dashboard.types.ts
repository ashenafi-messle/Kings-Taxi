export interface DashboardKPISummary {
  activeDrivers: number;
  totalDrivers: number;
  registeredPassengers: number;
  activeLiveRides: number;
  todayCompletedRides: number;
  todayGrossRevenueETB: number;
  platformCommissionRevenueETB: number;
  partnerHotels: number;
  totalHotelRooms: number;
  bookedHotelRooms: number;
  heritageDestinations: number;
  heritageTourBookings: number;
  openSupportTickets: number;
}

export interface RevenueChartDataPoint {
  date: string;
  day: string;
  ridesRevenue: number;
  hotelRevenue: number;
  heritageRevenue: number;
  totalRevenue: number;
  completedRides: number;
}

export interface HourlyRideVolume {
  hour: string;
  rides: number;
}

export interface DriverStatusDistribution {
  name: string;
  count: number;
  color: string;
}

export interface RecentActivityItem {
  id: string;
  type: 'RIDE_COMPLETED' | 'NEW_DRIVER' | 'HOTEL_BOOKING' | 'HERITAGE_BOOKING' | 'SUPPORT_ALERT';
  title: string;
  description: string;
  timestamp: string;
  amountETB?: number;
  statusBadge?: {
    text: string;
    variant: 'gold' | 'success' | 'warning' | 'danger' | 'info';
  };
}

export interface SystemServiceHealth {
  id: string;
  name: string;
  status: 'OPERATIONAL' | 'DEGRADED' | 'MAINTENANCE';
  latencyMs: number;
  uptimePercentage: string;
  lastChecked: string;
}
