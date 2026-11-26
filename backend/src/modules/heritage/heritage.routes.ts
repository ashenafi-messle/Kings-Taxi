import { Router, Request, Response, NextFunction } from 'express';
import { heritageController } from './heritage.controller';
import { authenticateToken, requireRole } from '../../core/middleware/auth.middleware';

export const heritageRouter = Router();

// ============================================================================
// 1. PUBLIC PASSENGER DESTINATIONS & PACKAGES ROUTES
// ============================================================================

// Destination Sites
heritageRouter.get(['/heritage/sites/featured', '/sites/featured'], (req: Request, res: Response) =>
  heritageController.listFeaturedSites(req, res)
);
heritageRouter.get(['/heritage/sites', '/sites'], (req: Request, res: Response) =>
  heritageController.listSites(req, res)
);
heritageRouter.get(['/heritage/sites/:slugOrId', '/sites/:slugOrId'], (req: Request, res: Response) =>
  heritageController.getSiteDetails(req, res)
);

// Fleet Vehicle Availability & Real-Time Heritage SSE
heritageRouter.get('/heritage/vehicles/available', (req: Request, res: Response) =>
  heritageController.listAvailableFleetVehicles(req, res)
);
heritageRouter.get('/heritage/availability', (req: Request, res: Response) =>
  heritageController.checkAvailability(req, res)
);
heritageRouter.get(
  '/heritage/events',
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.headers.authorization && typeof req.query.token === 'string' && req.query.token.trim()) {
      req.headers.authorization = `Bearer ${req.query.token.trim()}`;
    }
    next();
  },
  (req: Request, res: Response, next: NextFunction) => {
    if (req.headers.authorization) {
      return authenticateToken(req, res, next);
    }
    next();
  },
  (req: Request, res: Response) => heritageController.publicHeritageEvents(req, res)
);

// Tour Packages
heritageRouter.get(['/heritage/packages', '/packages'], (req: Request, res: Response) =>
  heritageController.listPackages(req, res)
);
heritageRouter.get(['/heritage/packages/:slugOrId', '/packages/:slugOrId'], (req: Request, res: Response) =>
  heritageController.getPackageDetails(req, res)
);

// Transportation Options & Guides Catalog
heritageRouter.get(['/heritage/vehicle-options', '/vehicle-options'], (req: Request, res: Response) =>
  heritageController.listVehicleOptions(req, res)
);
heritageRouter.get(['/heritage/guides', '/guides'], (req: Request, res: Response) =>
  heritageController.listGuides(req, res)
);

// Quotes Calculation (Public or Passenger)
heritageRouter.post(['/heritage/quotes', '/quotes'], (req: Request, res: Response) =>
  heritageController.quoteBooking(req, res)
);

// ============================================================================
// 2. PASSENGER TOUR BOOKINGS (AUTHENTICATED)
// ============================================================================

heritageRouter.post(['/heritage/bookings', '/bookings'], authenticateToken, (req: Request, res: Response) =>
  heritageController.createBooking(req, res)
);
heritageRouter.get(['/heritage/bookings/my', '/heritage/bookings', '/bookings'], authenticateToken, (req: Request, res: Response) =>
  heritageController.getPassengerBookings(req, res)
);
heritageRouter.get(['/heritage/bookings/:bookingReference', '/bookings/:bookingReference'], authenticateToken, (req: Request, res: Response) =>
  heritageController.getBookingByReference(req, res)
);
heritageRouter.post(['/heritage/bookings/:bookingReference/cancel', '/bookings/:bookingReference/cancel'], authenticateToken, (req: Request, res: Response) =>
  heritageController.cancelBooking(req, res)
);

// ============================================================================
// 3. SUPER ADMIN MANAGEMENT ROUTES (PROTECTED BY RBAC)
// ============================================================================

const adminAuth = [authenticateToken, requireRole(['ADMIN', 'SUPER_ADMIN'])];

// Admin Sites
heritageRouter.get('/admin/heritage/sites', adminAuth, (req: Request, res: Response) =>
  heritageController.adminListSites(req, res)
);
heritageRouter.post('/admin/heritage/sites', adminAuth, (req: Request, res: Response) =>
  heritageController.adminCreateSite(req, res)
);
heritageRouter.get('/admin/heritage/sites/:id', adminAuth, (req: Request, res: Response) =>
  heritageController.adminGetSite(req, res)
);
heritageRouter.patch('/admin/heritage/sites/:id', adminAuth, (req: Request, res: Response) =>
  heritageController.adminUpdateSite(req, res)
);
heritageRouter.delete('/admin/heritage/sites/:id', adminAuth, (req: Request, res: Response) =>
  heritageController.adminDeleteSite(req, res)
);
heritageRouter.post('/admin/heritage/sites/:id/publish', adminAuth, (req: Request, res: Response) =>
  heritageController.adminPublishSite(req, res)
);
heritageRouter.post('/admin/heritage/sites/:id/unpublish', adminAuth, (req: Request, res: Response) =>
  heritageController.adminUnpublishSite(req, res)
);
heritageRouter.get('/admin/heritage/sites/:id/images', adminAuth, (req: Request, res: Response) =>
  heritageController.adminGetSiteImages(req, res)
);
heritageRouter.put('/admin/heritage/sites/:id/images', adminAuth, (req: Request, res: Response) =>
  heritageController.adminSetSiteImages(req, res)
);
heritageRouter.get('/admin/heritage/sites/:id/images/upload-signature', adminAuth, (req: Request, res: Response) =>
  heritageController.adminGetSiteImageUploadSignature(req, res)
);

// Admin Packages
heritageRouter.get('/admin/heritage/packages', adminAuth, (req: Request, res: Response) =>
  heritageController.adminListPackages(req, res)
);
heritageRouter.post('/admin/heritage/packages', adminAuth, (req: Request, res: Response) =>
  heritageController.adminCreatePackage(req, res)
);
heritageRouter.get('/admin/heritage/packages/:id', adminAuth, (req: Request, res: Response) =>
  heritageController.adminGetPackage(req, res)
);
heritageRouter.patch('/admin/heritage/packages/:id', adminAuth, (req: Request, res: Response) =>
  heritageController.adminUpdatePackage(req, res)
);
heritageRouter.delete('/admin/heritage/packages/:id', adminAuth, (req: Request, res: Response) =>
  heritageController.adminDeletePackage(req, res)
);
heritageRouter.post('/admin/heritage/packages/:id/publish', adminAuth, (req: Request, res: Response) =>
  heritageController.adminPublishPackage(req, res)
);
heritageRouter.post('/admin/heritage/packages/:id/unpublish', adminAuth, (req: Request, res: Response) =>
  heritageController.adminUnpublishPackage(req, res)
);

// Admin Guides & Vehicle Options
heritageRouter.get('/admin/heritage/guides', adminAuth, (req: Request, res: Response) =>
  heritageController.adminListGuides(req, res)
);
heritageRouter.post('/admin/heritage/guides', adminAuth, (req: Request, res: Response) =>
  heritageController.adminCreateGuide(req, res)
);
heritageRouter.patch('/admin/heritage/guides/:id', adminAuth, (req: Request, res: Response) =>
  heritageController.adminUpdateGuide(req, res)
);

heritageRouter.get('/admin/heritage/vehicle-options', adminAuth, (req: Request, res: Response) =>
  heritageController.adminListVehicleOptions(req, res)
);
heritageRouter.post('/admin/heritage/vehicle-options', adminAuth, (req: Request, res: Response) =>
  heritageController.adminCreateVehicleOption(req, res)
);
heritageRouter.patch('/admin/heritage/vehicle-options/:id', adminAuth, (req: Request, res: Response) =>
  heritageController.adminUpdateVehicleOption(req, res)
);

// Admin Bookings & Assignments
heritageRouter.get(
  '/admin/heritage/events',
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.headers.authorization && typeof req.query.token === 'string' && req.query.token.trim()) {
      req.headers.authorization = `Bearer ${req.query.token.trim()}`;
    }
    next();
  },
  adminAuth,
  (req: Request, res: Response) => heritageController.adminHeritageEvents(req, res)
);
heritageRouter.patch('/admin/heritage/sites/:id/status', adminAuth, (req: Request, res: Response) =>
  heritageController.adminUpdateSiteStatus(req, res)
);
heritageRouter.get('/admin/heritage/bookings', adminAuth, (req: Request, res: Response) =>
  heritageController.adminListBookings(req, res)
);
heritageRouter.get('/admin/heritage/bookings/:idOrRef', adminAuth, (req: Request, res: Response) =>
  heritageController.adminGetBooking(req, res)
);
heritageRouter.get('/admin/heritage/bookings/:idOrRef/history', adminAuth, (req: Request, res: Response) =>
  heritageController.adminGetBookingHistory(req, res)
);
heritageRouter.post('/admin/heritage/bookings/:idOrRef/accept', adminAuth, (req: Request, res: Response) =>
  heritageController.adminAcceptBooking(req, res)
);
heritageRouter.patch('/admin/heritage/bookings/:idOrRef/confirm', adminAuth, (req: Request, res: Response) =>
  heritageController.adminAcceptBooking(req, res)
);
heritageRouter.post('/admin/heritage/bookings/:idOrRef/decline', adminAuth, (req: Request, res: Response) =>
  heritageController.adminDeclineBooking(req, res)
);
heritageRouter.patch('/admin/heritage/bookings/:idOrRef/decline', adminAuth, (req: Request, res: Response) =>
  heritageController.adminDeclineBooking(req, res)
);
heritageRouter.patch('/admin/heritage/bookings/:idOrRef/cancel', adminAuth, (req: Request, res: Response) =>
  heritageController.adminCancelBooking(req, res)
);
heritageRouter.patch('/admin/heritage/bookings/:idOrRef/status', adminAuth, (req: Request, res: Response) =>
  heritageController.adminUpdateBookingStatus(req, res)
);

