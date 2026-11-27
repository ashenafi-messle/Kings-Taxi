import { Router } from 'express';
import { healthRouter } from '../modules/health/health.routes';
import { authRouter } from '../modules/auth';
import { passengerRouter, adminPassengerRouter } from '../modules/passengers';
import { passengerBookingHistoryController } from '../modules/passengers/passengerBookingHistory.controller';
import { authenticateToken } from '../core/middleware/auth.middleware';
import { driverRouter, adminDriverRouter } from '../modules/drivers';
import { adminDocumentRouter } from '../modules/documents';
import { vehicleRouter, adminVehicleRouter } from '../modules/vehicles';
import { bookingRouter } from '../modules/bookings';
import { rideRequestRouter } from '../modules/rides/rideRequest.routes';
import { tripRouter } from '../modules/trips';
import { paymentRouter } from '../modules/payments';
import { notificationRouter } from '../modules/notifications';
import { subcityRouter } from '../modules/subcities';
import { supportRouter, adminSupportRouter } from '../modules/support';
import { hospitalityRouter } from '../modules/hospitality';
import { adminHotelPartnerRouter } from '../modules/hotel-partners';
import { heritageRouter } from '../modules/heritage';

export const apiV1Router = Router();

// Operational & health check probes (/health, /health/live, /health/ready, /live, /ready)
apiV1Router.use('/', healthRouter);

// Domain module routers
apiV1Router.use('/auth', authRouter);
apiV1Router.use('/subcities', subcityRouter);

// Direct top-level bindings for unified passenger booking history
apiV1Router.get('/passengers/bookings', authenticateToken, (req, res) =>
  passengerBookingHistoryController.listBookings(req, res)
);
apiV1Router.get('/passenger/bookings', authenticateToken, (req, res) =>
  passengerBookingHistoryController.listBookings(req, res)
);
apiV1Router.get('/passengers/bookings/:type/:id', authenticateToken, (req, res) =>
  passengerBookingHistoryController.getBookingDetail(req, res)
);
apiV1Router.get('/passenger/bookings/:type/:id', authenticateToken, (req, res) =>
  passengerBookingHistoryController.getBookingDetail(req, res)
);

// Authenticated passenger recent activities
apiV1Router.get('/passengers/recent-activities', authenticateToken, (req, res) =>
  passengerBookingHistoryController.getRecentActivities(req, res)
);
apiV1Router.get('/passenger/recent-activities', authenticateToken, (req, res) =>
  passengerBookingHistoryController.getRecentActivities(req, res)
);

apiV1Router.use('/passengers', passengerRouter);
apiV1Router.use('/passenger', passengerRouter);
apiV1Router.use('/drivers', driverRouter);
apiV1Router.use('/vehicles', vehicleRouter);
apiV1Router.use('/bookings', bookingRouter);
apiV1Router.use('/rides', rideRequestRouter);
apiV1Router.use('/trips', tripRouter);
apiV1Router.use('/payments', paymentRouter);
apiV1Router.use('/notifications', notificationRouter);
apiV1Router.use('/support', supportRouter);
apiV1Router.use('/admin/support', adminSupportRouter);
apiV1Router.use('/admin/drivers', adminDriverRouter);
apiV1Router.use('/admin/vehicles', adminVehicleRouter);
apiV1Router.use('/admin/documents', adminDocumentRouter);
apiV1Router.use('/admin/passengers', adminPassengerRouter);
apiV1Router.use('/admin/hotel-partners', adminHotelPartnerRouter);
apiV1Router.use('/hospitality', hospitalityRouter);
apiV1Router.use('/', hospitalityRouter);
apiV1Router.use('/', heritageRouter);
