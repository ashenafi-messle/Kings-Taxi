import { Router } from 'express';
import { healthRouter } from '../modules/health/health.routes';
import { authRouter } from '../modules/auth';
import { passengerRouter } from '../modules/passengers';
import { driverRouter } from '../modules/drivers';
import { vehicleRouter } from '../modules/vehicles';
import { bookingRouter } from '../modules/bookings';
import { tripRouter } from '../modules/trips';
import { paymentRouter } from '../modules/payments';
import { notificationRouter } from '../modules/notifications';
import { subcityRouter } from '../modules/subcities';
import { supportRouter } from '../modules/support';
import { hospitalityRouter } from '../modules/hospitality';

export const apiV1Router = Router();

// Operational & health check probes (/health, /health/live, /health/ready, /live, /ready)
apiV1Router.use('/', healthRouter);

// Domain module routers
apiV1Router.use('/auth', authRouter);
apiV1Router.use('/subcities', subcityRouter);
apiV1Router.use('/passengers', passengerRouter);
apiV1Router.use('/drivers', driverRouter);
apiV1Router.use('/vehicles', vehicleRouter);
apiV1Router.use('/bookings', bookingRouter);
apiV1Router.use('/trips', tripRouter);
apiV1Router.use('/payments', paymentRouter);
apiV1Router.use('/notifications', notificationRouter);
apiV1Router.use('/support', supportRouter);
apiV1Router.use('/', hospitalityRouter);
