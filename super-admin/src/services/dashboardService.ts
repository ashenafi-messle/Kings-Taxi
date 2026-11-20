import {
  DashboardKPISummary,
  RevenueChartDataPoint,
  HourlyRideVolume,
  DriverStatusDistribution,
  RecentActivityItem,
  SystemServiceHealth,
} from '../types';
import {
  mockDrivers,
  mockPassengers,
  mockHotels,
  mockHotelBookings,
  mockHeritageSites,
  mockHeritageBookings,
  mockRides,
  mockSupportTickets,
} from './mockData';

export const dashboardService = {
  async getKPISummary(): Promise<DashboardKPISummary> {
    await new Promise((resolve) => setTimeout(resolve, 80));

    const activeDrivers = mockDrivers.filter(
      (d) => (d.verificationStatus === 'APPROVED' || d.verificationStatus === 'VERIFIED') && d.availabilityStatus !== 'OFFLINE'
    ).length;

    const totalDrivers = mockDrivers.length;
    const registeredPassengers = mockPassengers.length;
    const activeLiveRides = mockRides.filter((r) => r.status === 'IN_PROGRESS' || r.status === 'DRIVER_APPROACHING' || r.status === 'DRIVER_ASSIGNED').length;
    const todayCompletedRides = mockRides.filter((r) => r.status === 'COMPLETED').length;

    // Revenue calculations
    const todayGrossRevenueETB = mockRides
      .filter((r) => r.status === 'COMPLETED')
      .reduce((sum, r) => sum + (r.finalFareETB || r.estimatedFareETB || r.fareETB || 0), 0) + 18500; // adding base mock turnover for realistic scale

    const platformCommissionRevenueETB = Math.round(todayGrossRevenueETB * 0.15);

    const partnerHotels = mockHotels.length;
    let totalHotelRooms = 0;
    let bookedHotelRooms = 0;
    mockHotels.forEach((h) => {
      h.roomTypes.forEach((rt) => {
        totalHotelRooms += rt.totalInventory;
        const available = rt.availableInventory ?? rt.availableRooms ?? 0;
        bookedHotelRooms += rt.totalInventory - available;
      });
    });

    const heritageDestinations = mockHeritageSites.length;
    const heritageTourBookings = mockHeritageBookings.length;
    const openSupportTickets = mockSupportTickets.filter(
      (t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS'
    ).length;

    return {
      activeDrivers,
      totalDrivers,
      registeredPassengers,
      activeLiveRides,
      todayCompletedRides,
      todayGrossRevenueETB,
      platformCommissionRevenueETB,
      partnerHotels,
      totalHotelRooms,
      bookedHotelRooms,
      heritageDestinations,
      heritageTourBookings,
      openSupportTickets,
    };
  },

  async getRevenueTrends(): Promise<RevenueChartDataPoint[]> {
    await new Promise((resolve) => setTimeout(resolve, 60));

    return [
      { date: '2026-11-13', day: 'Fri', ridesRevenue: 28400, hotelRevenue: 42000, heritageRevenue: 15500, totalRevenue: 85900, completedRides: 54 },
      { date: '2026-11-14', day: 'Sat', ridesRevenue: 34500, hotelRevenue: 58000, heritageRevenue: 24000, totalRevenue: 116500, completedRides: 68 },
      { date: '2026-11-15', day: 'Sun', ridesRevenue: 38200, hotelRevenue: 62000, heritageRevenue: 28500, totalRevenue: 128700, completedRides: 74 },
      { date: '2026-11-16', day: 'Mon', ridesRevenue: 22100, hotelRevenue: 31000, heritageRevenue: 12000, totalRevenue: 65100, completedRides: 42 },
      { date: '2026-11-17', day: 'Tue', ridesRevenue: 26800, hotelRevenue: 36000, heritageRevenue: 14200, totalRevenue: 77000, completedRides: 49 },
      { date: '2026-11-18', day: 'Wed', ridesRevenue: 29400, hotelRevenue: 39500, heritageRevenue: 18000, totalRevenue: 86900, completedRides: 58 },
      { date: '2026-11-19', day: 'Thu (Today)', ridesRevenue: 31200, hotelRevenue: 44000, heritageRevenue: 21500, totalRevenue: 96700, completedRides: 62 },
    ];
  },

  async getHourlyVolume(): Promise<HourlyRideVolume[]> {
    await new Promise((resolve) => setTimeout(resolve, 50));

    return [
      { hour: '06:00', rides: 8 },
      { hour: '08:00', rides: 24 },
      { hour: '10:00', rides: 19 },
      { hour: '12:00', rides: 28 },
      { hour: '14:00', rides: 22 },
      { hour: '16:00', rides: 32 },
      { hour: '18:00', rides: 41 },
      { hour: '20:00', rides: 35 },
      { hour: '22:00', rides: 16 },
    ];
  },

  async getDriverStatusDistribution(): Promise<DriverStatusDistribution[]> {
    await new Promise((resolve) => setTimeout(resolve, 50));

    const online = mockDrivers.filter((d) => d.availabilityStatus === 'ONLINE').length;
    const onTrip = mockDrivers.filter((d) => d.availabilityStatus === 'ON_TRIP').length;
    const offline = mockDrivers.filter((d) => d.availabilityStatus === 'OFFLINE').length;
    const suspended = mockDrivers.filter(
      (d) => d.verificationStatus === 'SUSPENDED' || d.verificationStatus === 'REJECTED'
    ).length;

    return [
      { name: 'Online & Available', count: online || 3, color: '#15803D' },
      { name: 'On Active Trip', count: onTrip || 2, color: '#E9B83F' },
      { name: 'Offline', count: offline || 2, color: '#77736A' },
      { name: 'Under Review / Suspended', count: suspended || 1, color: '#B91C1C' },
    ];
  },

  async getRecentActivity(): Promise<RecentActivityItem[]> {
    await new Promise((resolve) => setTimeout(resolve, 70));

    return [
      {
        id: 'act_1',
        type: 'RIDE_COMPLETED',
        title: 'Airport VIP Transfer Completed',
        description: 'Tewodros Kassaye safely delivered Ambassador Girma Wolde to Goha Hotel.',
        timestamp: '12 mins ago',
        amountETB: 450,
        statusBadge: { text: 'Completed', variant: 'success' },
      },
      {
        id: 'act_2',
        type: 'HOTEL_BOOKING',
        title: 'New Luxury Suite Reservation',
        description: 'Haile Resort Gondar: Imperial Fasil View Suite reserved for 3 nights.',
        timestamp: '35 mins ago',
        amountETB: 37500,
        statusBadge: { text: 'Confirmed', variant: 'gold' },
      },
      {
        id: 'act_3',
        type: 'HERITAGE_BOOKING',
        title: 'Simien Mountains Expedition Booked',
        description: '4-day trekking package for 2 international visitors booked with private 4WD.',
        timestamp: '1 hour ago',
        amountETB: 48000,
        statusBadge: { text: 'Heritage Tour', variant: 'gold' },
      },
      {
        id: 'act_4',
        type: 'NEW_DRIVER',
        title: 'New Driver Verification Pending',
        description: 'Biniyam Girma submitted commercial license renewal documents.',
        timestamp: '2 hours ago',
        statusBadge: { text: 'Pending Action', variant: 'warning' },
      },
      {
        id: 'act_5',
        type: 'SUPPORT_ALERT',
        title: 'Passenger Fare Dispute Flagged',
        description: 'Solomon Tesfaye reported route detour delay near Azezo.',
        timestamp: '3 hours ago',
        statusBadge: { text: 'High Priority', variant: 'danger' },
      },
    ];
  },

  async getSystemHealth(): Promise<SystemServiceHealth[]> {
    await new Promise((resolve) => setTimeout(resolve, 40));

    return [
      {
        id: 'gps_gateway',
        name: 'GPS Telemetry & Live Dispatch Engine',
        status: 'OPERATIONAL',
        latencyMs: 18,
        uptimePercentage: '99.99%',
        lastChecked: 'Just now',
      },
      {
        id: 'db_cluster',
        name: 'PostgreSQL Database & Storage',
        status: 'OPERATIONAL',
        latencyMs: 12,
        uptimePercentage: '99.98%',
        lastChecked: '1 min ago',
      },
      {
        id: 'telegram_bot',
        name: 'Telegram OTP & Notification Bot Service',
        status: 'OPERATIONAL',
        latencyMs: 45,
        uptimePercentage: '99.95%',
        lastChecked: '2 mins ago',
      },
      {
        id: 'payment_gateway',
        name: 'Telebirr & CBE Birr Payment Connector',
        status: 'OPERATIONAL',
        latencyMs: 65,
        uptimePercentage: '99.90%',
        lastChecked: 'Just now',
      },
    ];
  },
};
