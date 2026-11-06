import { Router } from 'express';
import { healthRouter } from '../modules/health/health.routes';

export const apiV1Router = Router();

// Health check and readiness endpoints
apiV1Router.use('/', healthRouter);

// Future Phase 2+ routes will be mounted here:
// apiV1Router.use('/auth', authRouter);
// apiV1Router.use('/passengers', passengerRouter);
// apiV1Router.use('/bookings', bookingRouter);

