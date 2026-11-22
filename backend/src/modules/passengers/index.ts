import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { ApiResponse } from '../../core/response/apiResponse';
import { subcityController } from '../subcities/subcity.controller';
import { driverController } from '../drivers/driver.controller';
import { bookingController } from '../bookings/booking.controller';
import { tripController } from '../trips/trip.controller';
import { passengerBookingHistoryController } from './passengerBookingHistory.controller';
import { passengerProfileController } from './passengerProfile.controller';
import { authenticateToken } from '../../core/middleware/auth.middleware';

/**
 * Kings Taxi — Passenger Transportation Module
 */
export const passengerRouter = Router();

// Rate limiters for security-sensitive profile and OTP endpoints
const contactOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many contact change attempts. Please try again after 15 minutes.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
});

const profileUpdateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many profile update requests. Please try again after 15 minutes.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
});

const uploadSigLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many upload signature requests. Please try again after 15 minutes.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
});

passengerRouter.get('/status', (_req: Request, res: Response) => {
  ApiResponse.success(
    res,
    {
      module: 'passengers',
      status: 'operational',
      description: 'Passenger ride discovery, bookings, journeys, profile, and security management',
    },
    'Passenger service status operational'
  );
});

// Profile Management (Personal Info, Avatar, Contacts)
passengerRouter.get('/profile', authenticateToken, (req, res) =>
  passengerProfileController.getProfile(req, res)
);
passengerRouter.patch('/profile', authenticateToken, profileUpdateLimiter, (req, res) =>
  passengerProfileController.updateProfile(req, res)
);
passengerRouter.post('/profile/change-contact/initiate', authenticateToken, contactOtpLimiter, (req, res) =>
  passengerProfileController.initiateContactChange(req, res)
);
passengerRouter.post('/profile/change-contact/verify', authenticateToken, contactOtpLimiter, (req, res) =>
  passengerProfileController.verifyContactChange(req, res)
);

// Cloudinary Profile Image Upload Signature & URL updates
passengerRouter.post('/profile-image/upload-signature', authenticateToken, uploadSigLimiter, (req, res) =>
  passengerProfileController.getCloudinaryUploadSignature(req, res)
);
passengerRouter.post('/profile-image/upload-direct', authenticateToken, uploadSigLimiter, (req, res) =>
  passengerProfileController.uploadDirectProfileImage(req, res)
);
passengerRouter.patch('/profile-image', authenticateToken, (req, res) =>
  passengerProfileController.updateProfileImage(req, res)
);
passengerRouter.delete('/profile-image', authenticateToken, (req, res) =>
  passengerProfileController.removeProfileImage(req, res)
);

// Security & Native Biometric Preference Registration
passengerRouter.get('/security', authenticateToken, (req, res) =>
  passengerProfileController.getSecurityInfo(req, res)
);
passengerRouter.post('/security/biometric', authenticateToken, (req, res) =>
  passengerProfileController.updateBiometricPreference(req, res)
);

// Unified Passenger Bookings History & Detail (Rides, Hotels, Heritage Tours)
passengerRouter.get('/bookings', authenticateToken, (req, res) =>
  passengerBookingHistoryController.listBookings(req, res)
);
passengerRouter.get('/bookings/:type/:id', authenticateToken, (req, res) =>
  passengerBookingHistoryController.getBookingDetail(req, res)
);
passengerRouter.get('/recent-activities', authenticateToken, (req, res) =>
  passengerBookingHistoryController.getRecentActivities(req, res)
);

// Subcity & Driver Discovery
passengerRouter.get('/subcities', (req, res) => subcityController.listActive(req, res));
passengerRouter.get('/drivers', (req, res) => driverController.getAvailableDrivers(req, res));

// Fare Estimation
passengerRouter.post('/rides/estimate', (req, res) => bookingController.estimate(req, res));

// Ride Booking & Lifecycle
passengerRouter.post('/rides', authenticateToken, (req, res) => bookingController.createRide(req, res));
passengerRouter.get('/rides', authenticateToken, (req, res) => bookingController.getPassengerRides(req, res));
passengerRouter.get('/rides/:id', authenticateToken, (req, res) => bookingController.getRideById(req, res));
passengerRouter.post('/rides/:id/cancel', authenticateToken, (req, res) => bookingController.cancelRide(req, res));

// Mid-Journey Destination Change
passengerRouter.post('/rides/:rideId/change-destination', authenticateToken, (req, res) =>
  tripController.changeDestination(req, res)
);

// Admin Passenger Management exports
export * from './adminPassenger.routes';
export * from './adminPassenger.controller';
export * from './adminPassenger.service';

