import { Request, Response } from 'express';
import {
  createHeritageSiteSchema,
  updateHeritageSiteSchema,
  searchHeritageSitesSchema,
  createHeritageTourPackageSchema,
  updateHeritageTourPackageSchema,
  tourQuoteRequestSchema,
  createTourBookingSchema,
  updateTourBookingStatusSchema,
  cancelTourBookingSchema,
} from './heritage.types';
import { heritageSiteService } from './site.service';
import { heritageTourPackageService } from './package.service';
import { heritageTourGuideService } from './guide.service';
import { heritageTourVehicleOptionService } from './vehicleOption.service';
import { heritageTourBookingService } from './booking.service';
import { CloudinaryService } from '../../integrations/cloudinary/cloudinary.service';
import { subscribeAdminHeritageEvents, subscribePassengerHeritageEvents } from './heritageEvents';

export class HeritageController {
  // ============================================================================
  // PUBLIC PASSENGER ENDPOINTS
  // ============================================================================

  /**
   * GET /api/v1/heritage/sites
   */
  async listSites(req: Request, res: Response) {
    try {
      const parsed = searchHeritageSitesSchema.parse(req.query);
      const sites = await heritageSiteService.listSites(parsed);
      return res.status(200).json({
        success: true,
        data: sites,
        count: sites.length,
      });
    } catch (err: any) {
      return res.status(400).json({
        success: false,
        message: err.message || 'Failed to list heritage sites',
      });
    }
  }

  async listFeaturedSites(_req: Request, res: Response) {
    try {
      const sites = await heritageSiteService.getFeaturedSites();
      return res.status(200).json({
        success: true,
        data: sites,
        count: sites.length,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: err.message || 'Failed to retrieve featured heritage sites',
      });
    }
  }

  async listAvailableFleetVehicles(req: Request, res: Response) {
    try {
      const date = typeof req.query.date === 'string' ? req.query.date : undefined;
      const passengers = req.query.passengers ? Number(req.query.passengers) : 1;
      const vehicles = await heritageTourVehicleOptionService.listAvailableFleetVehicles({
        date,
        passengers,
      });
      return res.status(200).json({
        success: true,
        data: vehicles,
        count: vehicles.length,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: err.message || 'Failed to retrieve available fleet vehicles',
      });
    }
  }

  async checkAvailability(req: Request, res: Response) {
    try {
      const date = typeof req.query.date === 'string' ? req.query.date : undefined;
      const passengers = req.query.passengers ? Number(req.query.passengers) : 1;
      const vehicles = await heritageTourVehicleOptionService.listAvailableFleetVehicles({
        date,
        passengers,
      });
      return res.status(200).json({
        success: true,
        data: {
          date: date || null,
          passengers,
          availableVehiclesCount: vehicles.length,
          vehicles,
        },
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: err.message || 'Failed to check heritage tour availability',
      });
    }
  }

  publicHeritageEvents(req: Request, res: Response) {
    subscribePassengerHeritageEvents(req, res);
  }

  adminHeritageEvents(req: Request, res: Response) {
    subscribeAdminHeritageEvents(req, res);
  }

  /**
   * GET /api/v1/heritage/sites/:slugOrId
   */
  async getSiteDetails(req: Request, res: Response) {
    try {
      const { slugOrId } = req.params;
      const site = await heritageSiteService.getSiteBySlugOrId(slugOrId);
      if (!site) {
        return res.status(404).json({
          success: false,
          message: `Heritage site '${slugOrId}' not found`,
        });
      }
      return res.status(200).json({
        success: true,
        data: site,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }

  /**
   * GET /api/v1/heritage/packages
   */
  async listPackages(req: Request, res: Response) {
    try {
      const city = req.query.city as string | undefined;
      const featuredOnly = req.query.featured === 'true';
      const packages = await heritageTourPackageService.listPackages({
        city,
        featuredOnly,
      });
      return res.status(200).json({
        success: true,
        data: packages,
        count: packages.length,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }

  /**
   * GET /api/v1/heritage/packages/:slugOrId
   */
  async getPackageDetails(req: Request, res: Response) {
    try {
      const { slugOrId } = req.params;
      const pkg = await heritageTourPackageService.getPackageBySlugOrId(slugOrId);
      if (!pkg) {
        return res.status(404).json({
          success: false,
          message: `Tour package '${slugOrId}' not found`,
        });
      }
      return res.status(200).json({
        success: true,
        data: pkg,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }

  /**
   * GET /api/v1/heritage/vehicle-options
   */
  async listVehicleOptions(_req: Request, res: Response) {
    try {
      const options = await heritageTourVehicleOptionService.listVehicleOptions();
      return res.status(200).json({
        success: true,
        data: options,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }

  /**
   * GET /api/v1/heritage/guides
   */
  async listGuides(req: Request, res: Response) {
    try {
      const language = req.query.language as string | undefined;
      const guides = await heritageTourGuideService.listGuides(language);
      return res.status(200).json({
        success: true,
        data: guides,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }

  /**
   * POST /api/v1/heritage/quotes
   */
  async quoteBooking(req: Request, res: Response) {
    try {
      const parsed = tourQuoteRequestSchema.parse(req.body);
      const quote = await heritageTourBookingService.quoteTour(parsed);
      return res.status(200).json({
        success: true,
        data: quote,
      });
    } catch (err: any) {
      return res.status(400).json({
        success: false,
        message: err.message || 'Failed to calculate tour quote',
      });
    }
  }

  /**
   * POST /api/v1/heritage/bookings
   */
  async createBooking(req: Request, res: Response) {
    try {
      const passengerId = (req as any).user?.sub || (req as any).user?.userId || (req as any).user?.id;
      if (!passengerId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required to create a booking',
        });
      }

      const parsed = createTourBookingSchema.parse(req.body);
      const booking = await heritageTourBookingService.createBooking(passengerId, parsed);

      return res.status(201).json({
        success: true,
        data: booking,
        message: 'Heritage tour booking successfully created',
      });
    } catch (err: any) {
      return res.status(400).json({
        success: false,
        message: err.message || 'Failed to create tour booking',
      });
    }
  }

  /**
   * GET /api/v1/heritage/bookings
   */
  async getPassengerBookings(req: Request, res: Response) {
    try {
      const passengerId = (req as any).user?.sub || (req as any).user?.userId || (req as any).user?.id;
      if (!passengerId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const bookings = await heritageTourBookingService.getPassengerBookings(passengerId);
      return res.status(200).json({
        success: true,
        data: bookings,
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  }

  /**
   * GET /api/v1/heritage/bookings/:bookingReference
   */
  async getBookingByReference(req: Request, res: Response) {
    try {
      const passengerId = (req as any).user?.sub || (req as any).user?.userId || (req as any).user?.id;
      const { bookingReference } = req.params;
      const userRole = (req as any).user?.role;
      const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';

      const booking = await heritageTourBookingService.getBookingByReference(
        passengerId,
        bookingReference,
        isAdmin
      );

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: `Booking '${bookingReference}' not found`,
        });
      }

      return res.status(200).json({
        success: true,
        data: booking,
      });
    } catch (err: any) {
      const status = err.message.includes('Access denied') ? 403 : 500;
      return res.status(status).json({
        success: false,
        message: err.message,
      });
    }
  }

  /**
   * POST /api/v1/heritage/bookings/:bookingReference/cancel
   */
  async cancelBooking(req: Request, res: Response) {
    try {
      const passengerId = (req as any).user?.sub || (req as any).user?.userId || (req as any).user?.id;
      const { bookingReference } = req.params;
      const parsed = cancelTourBookingSchema.parse(req.body);
      const userRole = (req as any).user?.role;
      const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';

      const cancelled = await heritageTourBookingService.cancelBooking(
        passengerId,
        bookingReference,
        parsed.cancellationReason,
        isAdmin
      );

      return res.status(200).json({
        success: true,
        data: cancelled,
        message: 'Heritage tour booking successfully cancelled',
      });
    } catch (err: any) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }
  }

  // ============================================================================
  // SUPER-ADMIN MANAGEMENT ENDPOINTS (PROTECTED BY RBAC)
  // ============================================================================

  async adminListSites(req: Request, res: Response) {
    try {
      const sites = await heritageSiteService.listSites({ isAdmin: true, ...req.query });
      return res.status(200).json({ success: true, data: sites });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async adminCreateSite(req: Request, res: Response) {
    try {
      const adminId = (req as any).user?.sub || (req as any).user?.userId || (req as any).user?.id;
      const parsed = createHeritageSiteSchema.parse(req.body);
      const site = await heritageSiteService.adminCreateSite(parsed, adminId);
      return res.status(201).json({ success: true, data: site });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  async adminGetSite(req: Request, res: Response) {
    try {
      const site = await heritageSiteService.getSiteBySlugOrId(req.params.id, true);
      if (!site) return res.status(404).json({ success: false, message: 'Site not found' });
      return res.status(200).json({ success: true, data: site });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async adminUpdateSite(req: Request, res: Response) {
    try {
      const parsed = updateHeritageSiteSchema.parse(req.body);
      const site = await heritageSiteService.adminUpdateSite(req.params.id, parsed);
      return res.status(200).json({ success: true, data: site });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  async adminDeleteSite(req: Request, res: Response) {
    try {
      await heritageSiteService.adminDeleteSite(req.params.id);
      return res.status(200).json({ success: true, message: 'Site deleted' });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async adminPublishSite(req: Request, res: Response) {
    try {
      const site = await heritageSiteService.adminPublishSite(req.params.id);
      return res.status(200).json({ success: true, data: site });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async adminUnpublishSite(req: Request, res: Response) {
    try {
      const site = await heritageSiteService.adminUnpublishSite(req.params.id);
      return res.status(200).json({ success: true, data: site });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async adminGetSiteImages(req: Request, res: Response) {
    try {
      const images = await heritageSiteService.getSiteImages(req.params.id);
      return res.status(200).json({ success: true, data: images });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async adminSetSiteImages(req: Request, res: Response) {
    try {
      const { images } = req.body;
      const updated = await heritageSiteService.setSiteImages(req.params.id, images);
      return res.status(200).json({ success: true, data: updated });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  async adminGetSiteImageUploadSignature(req: Request, res: Response) {
    try {
      const folder = `kings-taxi/heritage/${req.params.id}`;
      const sig = CloudinaryService.generateUploadSignature(folder, 'dest');
      return res.status(200).json({ success: true, data: sig });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async adminGetDiagnostics(_req: Request, res: Response) {
    try {
      const diagnostics = await heritageSiteService.getDatabaseDiagnostics();
      return res.status(200).json({ success: true, data: diagnostics });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message || 'Database diagnostics failed' });
    }
  }

  async adminListPackages(req: Request, res: Response) {
    try {
      const packages = await heritageTourPackageService.listPackages({ isAdmin: true, ...req.query });
      return res.status(200).json({ success: true, data: packages });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async adminCreatePackage(req: Request, res: Response) {
    try {
      const adminId = (req as any).user?.userId || (req as any).user?.id;
      const parsed = createHeritageTourPackageSchema.parse(req.body);
      const pkg = await heritageTourPackageService.adminCreatePackage(parsed, adminId);
      return res.status(201).json({ success: true, data: pkg });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  async adminGetPackage(req: Request, res: Response) {
    try {
      const pkg = await heritageTourPackageService.getPackageBySlugOrId(req.params.id, true);
      if (!pkg) return res.status(404).json({ success: false, message: 'Package not found' });
      return res.status(200).json({ success: true, data: pkg });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async adminUpdatePackage(req: Request, res: Response) {
    try {
      const parsed = updateHeritageTourPackageSchema.parse(req.body);
      const pkg = await heritageTourPackageService.adminUpdatePackage(req.params.id, parsed);
      return res.status(200).json({ success: true, data: pkg });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  async adminDeletePackage(req: Request, res: Response) {
    try {
      await heritageTourPackageService.adminDeletePackage(req.params.id);
      return res.status(200).json({ success: true, message: 'Package deleted' });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async adminPublishPackage(req: Request, res: Response) {
    try {
      const pkg = await heritageTourPackageService.adminPublishPackage(req.params.id);
      return res.status(200).json({ success: true, data: pkg });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async adminUnpublishPackage(req: Request, res: Response) {
    try {
      const pkg = await heritageTourPackageService.adminUnpublishPackage(req.params.id);
      return res.status(200).json({ success: true, data: pkg });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async adminListGuides(_req: Request, res: Response) {
    try {
      const guides = await heritageTourGuideService.listGuides();
      return res.status(200).json({ success: true, data: guides });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async adminCreateGuide(req: Request, res: Response) {
    try {
      const guide = await heritageTourGuideService.adminCreateGuide(req.body);
      return res.status(201).json({ success: true, data: guide });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  async adminUpdateGuide(req: Request, res: Response) {
    try {
      const guide = await heritageTourGuideService.adminUpdateGuide(req.params.id, req.body);
      return res.status(200).json({ success: true, data: guide });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  async adminListVehicleOptions(_req: Request, res: Response) {
    try {
      const options = await heritageTourVehicleOptionService.listVehicleOptions();
      return res.status(200).json({ success: true, data: options });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async adminCreateVehicleOption(req: Request, res: Response) {
    try {
      const option = await heritageTourVehicleOptionService.adminCreateVehicleOption(req.body);
      return res.status(201).json({ success: true, data: option });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  async adminUpdateVehicleOption(req: Request, res: Response) {
    try {
      const option = await heritageTourVehicleOptionService.adminUpdateVehicleOption(req.params.id, req.body);
      return res.status(200).json({ success: true, data: option });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  async adminListBookings(req: Request, res: Response) {
    try {
      const bookings = await heritageTourBookingService.adminListBookings(req.query as any);
      return res.status(200).json({ success: true, data: bookings });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async adminGetBooking(req: Request, res: Response) {
    try {
      const booking = await heritageTourBookingService.adminGetBooking(req.params.idOrRef);
      if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
      return res.status(200).json({ success: true, data: booking });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async adminAcceptBooking(req: Request, res: Response) {
    try {
      const adminId = req.user?.sub || 'adm_system';
      const { adminNote } = req.body;
      const accepted = await heritageTourBookingService.adminAcceptBooking(
        req.params.idOrRef,
        adminId,
        adminNote
      );
      return res.status(200).json({
        success: true,
        data: accepted,
        message: 'Heritage tour booking accepted and visitor capacity confirmed.',
      });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  async adminDeclineBooking(req: Request, res: Response) {
    try {
      const adminId = req.user?.sub || 'adm_system';
      const { declineReason, adminNote } = req.body || {};
      const finalReason =
        typeof declineReason === 'string' && declineReason.trim()
          ? declineReason.trim()
          : 'Declined by administrator';
      const declined = await heritageTourBookingService.adminDeclineBooking(
        req.params.idOrRef,
        adminId,
        finalReason,
        adminNote
      );
      return res.status(200).json({
        success: true,
        data: declined,
        message: 'Heritage tour booking declined successfully.',
      });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  async adminUpdateSiteStatus(req: Request, res: Response) {
    try {
      const status = String(req.body?.status || '').toUpperCase();
      if (status === 'PUBLISHED') {
        const site = await heritageSiteService.adminPublishSite(req.params.id);
        return res.status(200).json({ success: true, data: site });
      }
      if (status === 'UNPUBLISHED' || status === 'DRAFT') {
        const site = await heritageSiteService.adminUnpublishSite(req.params.id);
        return res.status(200).json({ success: true, data: site });
      }
      const updated = await heritageSiteService.adminUpdateSite(req.params.id, { status });
      return res.status(200).json({ success: true, data: updated });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  async adminCancelBooking(req: Request, res: Response) {
    try {
      const adminId = req.user?.sub || 'adm_system';
      const reason = req.body?.cancellationReason || req.body?.reason || 'Cancelled by administrator';
      const cancelled = await heritageTourBookingService.cancelBooking(
        adminId,
        req.params.idOrRef,
        reason,
        true
      );
      return res.status(200).json({ success: true, data: cancelled });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  async adminGetBookingHistory(req: Request, res: Response) {
    try {
      const history = await heritageTourBookingService.getBookingAuditHistory(req.params.idOrRef);
      return res.status(200).json({ success: true, data: history });
    } catch (err: any) {
      return res.status(404).json({ success: false, message: err.message });
    }
  }

  async adminUpdateBookingStatus(req: Request, res: Response) {
    try {
      const parsed = updateTourBookingStatusSchema.parse(req.body);
      const updated = await heritageTourBookingService.adminUpdateBookingStatus(req.params.idOrRef, parsed);
      return res.status(200).json({ success: true, data: updated });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }
}

export const heritageController = new HeritageController();

