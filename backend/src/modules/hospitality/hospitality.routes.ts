import { Router, Request, Response } from 'express';
import { hospitalityController } from './hospitality.controller';
import { authenticateToken, requireRole } from '../../core/middleware/auth.middleware';

export const hospitalityRouter = Router();

// ============================================================================
// 1. PUBLIC PASSENGER HOTEL ROUTES
// ============================================================================

hospitalityRouter.get('/hotels', (req: Request, res: Response) => hospitalityController.listHotels(req, res));
hospitalityRouter.get('/hotels/featured', (req: Request, res: Response) => hospitalityController.getFeaturedHotels(req, res));
hospitalityRouter.get('/hotels/:id/rooms', (req: Request, res: Response) => hospitalityController.getHotelRooms(req, res));
hospitalityRouter.get('/hotels/:slugOrId', (req: Request, res: Response) => hospitalityController.getHotelDetails(req, res));
hospitalityRouter.get('/hotels/:hotelId/availability', (req: Request, res: Response) => hospitalityController.checkAvailability(req, res));
hospitalityRouter.get('/hotels/:hotelId/transfer-rates', (req: Request, res: Response) => hospitalityController.getTransferRates(req, res));

// ============================================================================
// 2. HOTEL BOOKING ROUTES
// ============================================================================

hospitalityRouter.post('/hotel-bookings/quote', (req: Request, res: Response) => hospitalityController.quoteBooking(req, res));
hospitalityRouter.post('/hotel-bookings', authenticateToken, (req: Request, res: Response) => hospitalityController.createBooking(req, res));
hospitalityRouter.get('/hotel-bookings', authenticateToken, (req: Request, res: Response) => hospitalityController.getPassengerBookings(req, res));
hospitalityRouter.get('/hotel-bookings/:bookingReference', authenticateToken, (req: Request, res: Response) =>
  hospitalityController.getBookingByReference(req, res)
);
hospitalityRouter.post('/hotel-bookings/:bookingReference/cancel', authenticateToken, (req: Request, res: Response) =>
  hospitalityController.cancelBooking(req, res)
);

// ============================================================================
// 3. PUBLIC PASSENGER LOUNGE ROUTES
// ============================================================================

hospitalityRouter.get('/lounges', (req: Request, res: Response) => hospitalityController.listLounges(req, res));
hospitalityRouter.get('/lounges/:slugOrId', (req: Request, res: Response) => hospitalityController.getLoungeDetails(req, res));
hospitalityRouter.post('/lounge-reservations', authenticateToken, (req: Request, res: Response) =>
  hospitalityController.createLoungeReservation(req, res)
);
hospitalityRouter.get('/lounge-reservations', authenticateToken, (req: Request, res: Response) =>
  hospitalityController.getPassengerLoungeReservations(req, res)
);

// ============================================================================
// 4. SUPER ADMIN MANAGEMENT ROUTES (PROTECTED BY RBAC)
// ============================================================================

const adminAuth = [authenticateToken, requireRole(['ADMIN', 'SUPER_ADMIN'])];

// Hotels Admin
hospitalityRouter.get('/admin/hotels', adminAuth, (req: Request, res: Response) => hospitalityController.adminListHotels(req, res));
hospitalityRouter.post('/admin/hotels', adminAuth, (req: Request, res: Response) => hospitalityController.adminCreateHotel(req, res));
hospitalityRouter.get('/admin/hotels/:id', adminAuth, (req: Request, res: Response) => hospitalityController.adminGetHotel(req, res));
hospitalityRouter.patch('/admin/hotels/:id', adminAuth, (req: Request, res: Response) => hospitalityController.adminUpdateHotel(req, res));
hospitalityRouter.put('/admin/hotels/:id', adminAuth, (req: Request, res: Response) => hospitalityController.adminUpdateHotel(req, res));
hospitalityRouter.post('/admin/hotels/:id/verify', adminAuth, (req: Request, res: Response) =>
  hospitalityController.adminVerifyHotel(req, res)
);
hospitalityRouter.delete('/admin/hotels/:id', adminAuth, (req: Request, res: Response) => hospitalityController.adminDeleteHotel(req, res));
hospitalityRouter.post('/admin/hotels/:id/publish', adminAuth, (req: Request, res: Response) => hospitalityController.adminPublishHotel(req, res));
hospitalityRouter.post('/admin/hotels/:id/unpublish', adminAuth, (req: Request, res: Response) =>
  hospitalityController.adminUnpublishHotel(req, res)
);
hospitalityRouter.post('/admin/hotels/:id/cover-image', adminAuth, (req: Request, res: Response) =>
  hospitalityController.adminUploadCoverImage(req, res)
);
hospitalityRouter.post('/admin/hotels/:id/images', adminAuth, (req: Request, res: Response) => hospitalityController.adminAddHotelImage(req, res));
hospitalityRouter.delete('/admin/hotels/:id/images/:imageId', adminAuth, (req: Request, res: Response) =>
  hospitalityController.adminDeleteHotelImage(req, res)
);

// Room Types & Rates Admin
hospitalityRouter.post('/admin/hotels/:id/room-types', adminAuth, (req: Request, res: Response) =>
  hospitalityController.adminCreateRoomType(req, res)
);
hospitalityRouter.patch('/admin/hotels/:id/room-types/:roomTypeId', adminAuth, (req: Request, res: Response) =>
  hospitalityController.adminUpdateRoomType(req, res)
);
hospitalityRouter.post('/admin/hotels/:id/room-types/:roomTypeId/rates', adminAuth, (req: Request, res: Response) =>
  hospitalityController.adminCreateRate(req, res)
);
hospitalityRouter.get('/admin/hotels/:id/room-types/:roomTypeId/images', adminAuth, (req: Request, res: Response) =>
  hospitalityController.adminGetRoomImages(req, res)
);
hospitalityRouter.put('/admin/hotels/:id/room-types/:roomTypeId/images', adminAuth, (req: Request, res: Response) =>
  hospitalityController.adminSetRoomImages(req, res)
);
hospitalityRouter.post('/admin/hotels/:id/room-types/:roomTypeId/images', adminAuth, (req: Request, res: Response) =>
  hospitalityController.adminAddRoomImage(req, res)
);
hospitalityRouter.delete('/admin/hotels/:id/room-types/:roomTypeId/images/:imageId', adminAuth, (req: Request, res: Response) =>
  hospitalityController.adminDeleteRoomImage(req, res)
);
hospitalityRouter.delete('/admin/hotels/:id/room-types/:roomTypeId', adminAuth, (req: Request, res: Response) =>
  hospitalityController.adminDeleteRoomType(req, res)
);
hospitalityRouter.get('/admin/hotels/:id/room-types/:roomTypeId/images/upload-signature', adminAuth, (req: Request, res: Response) =>
  hospitalityController.adminGetRoomImageUploadSignature(req, res)
);

// Airport Transfer Rates Admin
hospitalityRouter.get('/admin/hotels/:id/transfer-rates', adminAuth, (req: Request, res: Response) =>
  hospitalityController.adminListTransferRates(req, res)
);
hospitalityRouter.post('/admin/hotels/:id/transfer-rates', adminAuth, (req: Request, res: Response) =>
  hospitalityController.adminCreateTransferRate(req, res)
);
hospitalityRouter.patch('/admin/transfer-rates/:rateId', adminAuth, (req: Request, res: Response) =>
  hospitalityController.adminUpdateTransferRate(req, res)
);
hospitalityRouter.delete('/admin/transfer-rates/:rateId', adminAuth, (req: Request, res: Response) =>
  hospitalityController.adminDeleteTransferRate(req, res)
);

// Bookings Admin
hospitalityRouter.get('/admin/hotel-bookings', adminAuth, (req: Request, res: Response) =>
  hospitalityController.adminListBookings(req, res)
);
hospitalityRouter.get('/admin/hotel-bookings/:id', adminAuth, (req: Request, res: Response) =>
  hospitalityController.adminGetBooking(req, res)
);
hospitalityRouter.post('/admin/hotel-bookings/:id/accept', adminAuth, (req: Request, res: Response) =>
  hospitalityController.adminAcceptBooking(req, res)
);
hospitalityRouter.post('/admin/hotel-bookings/:id/decline', adminAuth, (req: Request, res: Response) =>
  hospitalityController.adminDeclineBooking(req, res)
);
hospitalityRouter.patch('/admin/hotel-bookings/:id/status', adminAuth, (req: Request, res: Response) =>
  hospitalityController.adminUpdateBookingStatus(req, res)
);

// Lounges Admin
hospitalityRouter.post('/admin/lounges', adminAuth, (req: Request, res: Response) => hospitalityController.adminCreateLounge(req, res));
hospitalityRouter.patch('/admin/lounges/:id', adminAuth, (req: Request, res: Response) => hospitalityController.adminUpdateLounge(req, res));
hospitalityRouter.delete('/admin/lounges/:id', adminAuth, (req: Request, res: Response) => hospitalityController.adminDeleteLounge(req, res));
hospitalityRouter.post('/admin/lounges/:id/publish', adminAuth, (req: Request, res: Response) => hospitalityController.adminPublishLounge(req, res));
hospitalityRouter.post('/admin/lounges/:id/unpublish', adminAuth, (req: Request, res: Response) =>
  hospitalityController.adminUnpublishLounge(req, res)
);
