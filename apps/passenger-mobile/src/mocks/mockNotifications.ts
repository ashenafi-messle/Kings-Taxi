export interface AppNotification {
  id: string;
  title: string;
  message: string;
  category: 'ride' | 'hotel' | 'tour' | 'payment' | 'system';
  isRead: boolean;
  createdAt: string;
}

export const mockNotifications: AppNotification[] = [
  {
    id: 'notif_1',
    title: 'Driver Arriving in 2 Minutes',
    message: 'Your Kings Comfort driver Abebe (Silver Toyota Corolla 3-B48192) is approaching your pickup point at Bole Airport.',
    category: 'ride',
    isRead: false,
    createdAt: '2026-11-02T16:05:00Z',
  },
  {
    id: 'notif_2',
    title: 'Payment Successful',
    message: 'Payment of 480 ETB via Telebirr was successfully processed for ride #KT-90182.',
    category: 'payment',
    isRead: false,
    createdAt: '2026-11-01T14:33:00Z',
  },
  {
    id: 'notif_3',
    title: 'Hotel Reservation Confirmed',
    message: 'Your stay at Ethiopian Skylight Hotel (Deluxe King Room) has been confirmed. Confirmation Code: SKY-8921.',
    category: 'hotel',
    isRead: true,
    createdAt: '2026-10-24T09:16:35Z',
  },
  {
    id: 'notif_4',
    title: 'Full-Contract Tour Itinerary Ready',
    message: 'Your chauffeured contract itinerary for Gondar & Fasil Ghebbi has been approved. Driver details will be provided 24 hours prior.',
    category: 'tour',
    isRead: true,
    createdAt: '2026-10-18T11:05:00Z',
  },
  {
    id: 'notif_5',
    title: 'Welcome to Kings Taxi Ethiopia',
    message: 'Experience premium transportation, verified hotels, and seamless heritage exploration across Ethiopia with royal comfort.',
    category: 'system',
    isRead: true,
    createdAt: '2026-10-15T08:00:00Z',
  },
];
