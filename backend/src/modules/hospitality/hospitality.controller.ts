import { Request, Response } from 'express';
import { hotelService } from './hotel.service';
import { roomService } from './room.service';
import { transferRateService } from './transferRate.service';
import { hospitalityBookingService } from './booking.service';
import { loungeService } from './lounge.service';
import { ApiResponse } from '../../core/response/apiResponse';
import { logger } from '../../core/logging/logger';
import { HotelBookingStatus } from '@prisma/client';

function handleHospitalityError(res: Response, err: any, fallbackMessage: string) {
  const name = String(err?.name || '');
  const msg = String(err?.message || '');
  const code = String(err?.code || '');

  const isDbDown =
    name.includes('PrismaClient') ||
    code.startsWith('P1') ||
    code === 'ECONNREFUSED' ||
    code === 'ETIMEDOUT' ||
    code === 'EADDRNOTAVAIL' ||
    code === 'EHOSTUNREACH' ||
    msg.includes("Can't reach database server") ||
    msg.includes('connection timed out') ||
    msg.includes('Connection refused') ||
    msg.includes('connect ECONNREFUSED') ||
    msg.includes('connect ETIMEDOUT') ||
    msg.includes('database') ||
    msg.includes('5433');

  if (isDbDown) {
    ApiResponse.error(
      res,
      'DEPENDENCY_UNAVAILABLE',
      'PostgreSQL database server at 127.0.0.1:5433 is unreachable. Ensure the SSH tunnel is active: ssh -N -L 5433:172.18.0.7:5432 ambelu@196.188.250.186',
      503
    );
    return;
  }

  ApiResponse.serverError(res, msg || fallbackMessage);
}

export class HospitalityController {
  // ============================================================================
  // PUBLIC PASSENGER HOTEL ENDPOINTS
  // ============================================================================

  /**
   * GET /api/v1/hotels
   */
  async listHotels(req: Request, res: Response) {
    try {
      const { city, search, starRating, featured, page, limit } = req.query;
      const result = await hotelService.listPublishedHotels({
        city: city as string,
        search: search as string,
        starRating: starRating ? Number(starRating) : undefined,
        featured: featured === 'true' ? true : featured === 'false' ? false : undefined,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 10,
      });
      ApiResponse.success(res, result, 'Published hotels retrieved successfully');
    } catch (err: any) {
      logger.error({ err }, 'Error listing hotels');
      handleHospitalityError(res, err, 'Unable to retrieve hotels');
    }
  }

  /**
   * GET /api/v1/hotels/featured
   */
  async getFeaturedHotels(_req: Request, res: Response) {
    try {
      const result = await hotelService.listPublishedHotels({ featured: true, limit: 5 });
      ApiResponse.success(res, result.hotels, 'Featured hotels retrieved successfully');
    } catch (err: any) {
      logger.error({ err }, 'Error retrieving featured hotels');
      handleHospitalityError(res, err, 'Unable to retrieve featured hotels');
    }
  }

  /**
   * GET /api/v1/hotels/:slugOrId
   */
  async getHotelDetails(req: Request, res: Response) {
    try {
      const { slugOrId } = req.params;
      const hotel = await hotelService.getHotelDetails(slugOrId, true);
      if (!hotel) {
        ApiResponse.notFound(res, 'Hotel not found');
        return;
      }
      ApiResponse.success(res, hotel, 'Hotel details retrieved successfully');
    } catch (err: any) {
      logger.error({ err }, 'Error retrieving hotel details');
      handleHospitalityError(res, err, 'Unable to retrieve hotel details');
    }
  }

  /**
   * GET /api/v1/hotels/:hotelId/availability
   */
  async checkAvailability(req: Request, res: Response) {
    try {
      const { hotelId } = req.params;
      const { checkInDate, checkOutDate, guests, rooms } = req.query;

      if (!checkInDate || !checkOutDate) {
        ApiResponse.badRequest(res, 'checkInDate and checkOutDate (YYYY-MM-DD) are required query parameters');
        return;
      }

      const availability = await roomService.checkHotelAvailability(
        hotelId,
        checkInDate as string,
        checkOutDate as string,
        guests ? Number(guests) : 2,
        rooms ? Number(rooms) : 1
      );

      ApiResponse.success(res, availability, 'Hotel room availability checked successfully');
    } catch (err: any) {
      logger.error({ err }, 'Error checking hotel availability');
      const msg = err.message || '';
      if (
        msg.startsWith('PAST_CHECKIN_DATE') ||
        msg.startsWith('INVALID_CHECKOUT_DATE') ||
        msg.startsWith('MINIMUM_STAY_NOT_MET') ||
        msg.startsWith('MAXIMUM_STAY_EXCEEDED') ||
        msg.startsWith('INVALID_DATE')
      ) {
        ApiResponse.badRequest(res, msg.split(': ')[1] || msg);
        return;
      }
      handleHospitalityError(res, err, 'Unable to check availability');
    }
  }

  /**
   * GET /api/v1/hotels/:hotelId/transfer-rates
   */
  async getTransferRates(req: Request, res: Response) {
    try {
      const { hotelId } = req.params;
      const { date } = req.query;
      const rates = await transferRateService.getTransferRatesForHotel(hotelId, date as string);
      ApiResponse.success(res, rates, 'Airport transfer options retrieved successfully');
    } catch (err: any) {
      logger.error({ err }, 'Error retrieving transfer rates');
      handleHospitalityError(res, err, 'Unable to retrieve airport transfer rates');
    }
  }

  // ============================================================================
  // HOTEL BOOKING ENDPOINTS
  // ============================================================================

  /**
   * POST /api/v1/hotel-bookings/quote
   */
  async quoteBooking(req: Request, res: Response) {
    try {
      const quote = await hospitalityBookingService.calculateQuote(req.body);
      ApiResponse.success(res, quote, 'Hotel booking quote calculated successfully');
    } catch (err: any) {
      logger.error({ err }, 'Error calculating booking quote');
      const msg = err.message || '';
      if (
        msg.startsWith('PAST_CHECKIN_DATE') ||
        msg.startsWith('INVALID_CHECKOUT_DATE') ||
        msg.startsWith('CAPACITY_EXCEEDED') ||
        msg.startsWith('TRANSFER_RATE_UNAVAILABLE') ||
        msg.startsWith('INVALID_DATE')
      ) {
        ApiResponse.badRequest(res, msg.split(': ')[1] || msg);
        return;
      }
      if (msg.startsWith('HOTEL_NOT_FOUND') || msg.startsWith('ROOM_TYPE_NOT_FOUND')) {
        ApiResponse.notFound(res, msg.split(': ')[1] || msg);
        return;
      }
      handleHospitalityError(res, err, 'Unable to calculate quote');
    }
  }

  /**
   * POST /api/v1/hotel-bookings
   */
  async createBooking(req: Request, res: Response) {
    try {
      const passengerId = req.user?.sub;
      if (!passengerId) {
        ApiResponse.unauthorized(res, 'Passenger authentication required');
        return;
      }

      const booking = await hospitalityBookingService.createBooking(passengerId, req.body);
      ApiResponse.created(res, booking, 'Hotel reservation confirmed successfully');
    } catch (err: any) {
      logger.error({ err }, 'Error creating hotel booking');
      const msg = err.message || '';
      if (
        msg.startsWith('INSUFFICIENT_INVENTORY') ||
        msg.startsWith('CAPACITY_EXCEEDED') ||
        msg.startsWith('PAST_CHECKIN_DATE') ||
        msg.startsWith('INVALID_CHECKOUT_DATE') ||
        msg.startsWith('TRANSFER_RATE_UNAVAILABLE')
      ) {
        ApiResponse.badRequest(res, msg.split(': ')[1] || msg);
        return;
      }
      if (msg.startsWith('HOTEL_NOT_FOUND') || msg.startsWith('ROOM_TYPE_NOT_FOUND')) {
        ApiResponse.notFound(res, msg.split(': ')[1] || msg);
        return;
      }
      ApiResponse.serverError(res, err.message || 'Unable to confirm booking');
    }
  }

  /**
   * GET /api/v1/hotel-bookings
   */
  async getPassengerBookings(req: Request, res: Response) {
    try {
      const passengerId = req.user?.sub;
      if (!passengerId) {
        ApiResponse.unauthorized(res, 'Passenger authentication required');
        return;
      }

      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 20;

      const result = await hospitalityBookingService.getPassengerBookings(passengerId, page, limit);
      ApiResponse.success(res, result, 'Passenger hotel bookings retrieved successfully');
    } catch (err: any) {
      logger.error({ err }, 'Error retrieving passenger bookings');
      ApiResponse.serverError(res, 'Unable to retrieve hotel bookings');
    }
  }

  /**
   * GET /api/v1/hotel-bookings/:bookingReference
   */
  async getBookingByReference(req: Request, res: Response) {
    try {
      const passengerId = req.user?.sub;
      if (!passengerId) {
        ApiResponse.unauthorized(res, 'Authentication required');
        return;
      }

      const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN';
      const booking = await hospitalityBookingService.getBookingByReference(
        req.params.bookingReference,
        passengerId,
        isAdmin
      );

      if (!booking) {
        ApiResponse.notFound(res, 'Booking not found');
        return;
      }

      ApiResponse.success(res, booking, 'Booking details retrieved successfully');
    } catch (err: any) {
      logger.error({ err }, 'Error retrieving booking by reference');
      if (err.message?.startsWith('FORBIDDEN')) {
        ApiResponse.forbidden(res, 'You do not have access to this reservation');
        return;
      }
      ApiResponse.serverError(res, 'Unable to retrieve booking details');
    }
  }

  /**
   * POST /api/v1/hotel-bookings/:bookingReference/cancel
   */
  async cancelBooking(req: Request, res: Response) {
    try {
      const passengerId = req.user?.sub;
      if (!passengerId) {
        ApiResponse.unauthorized(res, 'Passenger authentication required');
        return;
      }

      const cancelled = await hospitalityBookingService.cancelBooking(
        req.params.bookingReference,
        passengerId
      );
      ApiResponse.success(res, cancelled, 'Hotel reservation cancelled successfully');
    } catch (err: any) {
      logger.error({ err }, 'Error cancelling booking');
      const msg = err.message || '';
      if (msg.startsWith('BOOKING_NOT_FOUND')) {
        ApiResponse.notFound(res, msg.split(': ')[1] || msg);
        return;
      }
      if (msg.startsWith('FORBIDDEN')) {
        ApiResponse.forbidden(res, msg.split(': ')[1] || msg);
        return;
      }
      if (msg.startsWith('CANNOT_CANCEL')) {
        ApiResponse.badRequest(res, msg.split(': ')[1] || msg);
        return;
      }
      ApiResponse.serverError(res, 'Unable to cancel booking');
    }
  }

  // ============================================================================
  // PUBLIC PASSENGER LOUNGE ENDPOINTS
  // ============================================================================

  /**
   * GET /api/v1/lounges
   */
  async listLounges(req: Request, res: Response) {
    try {
      const { city, search, featured, page, limit } = req.query;
      const result = await loungeService.listPublishedLounges({
        city: city as string,
        search: search as string,
        featured: featured === 'true' ? true : featured === 'false' ? false : undefined,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 10,
      });
      ApiResponse.success(res, result, 'Published lounges retrieved successfully');
    } catch (err: any) {
      logger.error({ err }, 'Error listing lounges');
      handleHospitalityError(res, err, 'Unable to retrieve lounges');
    }
  }

  /**
   * GET /api/v1/lounges/:slugOrId
   */
  async getLoungeDetails(req: Request, res: Response) {
    try {
      const lounge = await loungeService.getLoungeDetails(req.params.slugOrId, true);
      if (!lounge) {
        ApiResponse.notFound(res, 'Lounge not found');
        return;
      }
      ApiResponse.success(res, lounge, 'Lounge details retrieved successfully');
    } catch (err: any) {
      logger.error({ err }, 'Error retrieving lounge details');
      handleHospitalityError(res, err, 'Unable to retrieve lounge');
    }
  }

  /**
   * POST /api/v1/lounge-reservations
   */
  async createLoungeReservation(req: Request, res: Response) {
    try {
      const passengerId = req.user?.sub;
      if (!passengerId) {
        ApiResponse.unauthorized(res, 'Passenger authentication required');
        return;
      }

      const resv = await loungeService.createReservation(passengerId, req.body);
      ApiResponse.created(res, resv, 'Lounge reservation confirmed successfully');
    } catch (err: any) {
      logger.error({ err }, 'Error creating lounge reservation');
      ApiResponse.badRequest(res, err.message || 'Unable to create lounge reservation');
    }
  }

  /**
   * GET /api/v1/lounge-reservations
   */
  async getPassengerLoungeReservations(req: Request, res: Response) {
    try {
      const passengerId = req.user?.sub;
      if (!passengerId) {
        ApiResponse.unauthorized(res, 'Passenger authentication required');
        return;
      }

      const list = await loungeService.getPassengerReservations(passengerId);
      ApiResponse.success(res, list, 'Lounge reservations retrieved successfully');
    } catch (err: any) {
      logger.error({ err }, 'Error retrieving lounge reservations');
      ApiResponse.serverError(res, 'Unable to retrieve reservations');
    }
  }

  // ============================================================================
  // SUPER ADMIN MANAGEMENT ENDPOINTS
  // ============================================================================

  async adminListHotels(req: Request, res: Response) {
    try {
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 20;
      const result = await hotelService.listAdminHotels(page, limit);
      ApiResponse.success(res, result, 'Admin hotels retrieved successfully');
    } catch (err: any) {
      logger.error({ err }, 'Error in adminListHotels');
      ApiResponse.serverError(res, 'Unable to list hotels');
    }
  }

  async adminCreateHotel(req: Request, res: Response) {
    try {
      const adminId = req.user?.sub;
      const hotel = await hotelService.createHotel(req.body, adminId);
      ApiResponse.created(res, hotel, 'Hotel created successfully in DRAFT status');
    } catch (err: any) {
      logger.error({ err }, 'Error in adminCreateHotel');
      ApiResponse.badRequest(res, err.message || 'Unable to create hotel');
    }
  }

  async adminGetHotel(req: Request, res: Response) {
    try {
      const hotel = await hotelService.getHotelDetails(req.params.id, false);
      if (!hotel) {
        ApiResponse.notFound(res, 'Hotel not found');
        return;
      }
      ApiResponse.success(res, hotel, 'Hotel retrieved successfully');
    } catch (err: any) {
      ApiResponse.serverError(res, 'Unable to retrieve hotel');
    }
  }

  async adminUpdateHotel(req: Request, res: Response) {
    try {
      const adminId = req.user?.sub;
      const updated = await hotelService.updateHotel(req.params.id, req.body, adminId);
      ApiResponse.success(res, updated, 'Hotel updated successfully');
    } catch (err: any) {
      ApiResponse.badRequest(res, err.message || 'Unable to update hotel');
    }
  }

  async adminDeleteHotel(req: Request, res: Response) {
    try {
      const deleted = await hotelService.deleteHotel(req.params.id);
      ApiResponse.success(res, deleted, 'Hotel deleted or archived successfully');
    } catch (err: any) {
      ApiResponse.badRequest(res, err.message || 'Unable to delete hotel');
    }
  }

  async adminPublishHotel(req: Request, res: Response) {
    try {
      const adminId = req.user?.sub;
      const published = await hotelService.publishHotel(req.params.id, adminId);
      ApiResponse.success(res, published, 'Hotel published successfully to mobile passenger app');
    } catch (err: any) {
      ApiResponse.badRequest(res, err.message || 'Unable to publish hotel');
    }
  }

  async adminUnpublishHotel(req: Request, res: Response) {
    try {
      const adminId = req.user?.sub;
      const unpublished = await hotelService.unpublishHotel(req.params.id, adminId);
      ApiResponse.success(res, unpublished, 'Hotel unpublished successfully');
    } catch (err: any) {
      ApiResponse.badRequest(res, err.message || 'Unable to unpublish hotel');
    }
  }

  async adminAddHotelImage(req: Request, res: Response) {
    try {
      const image = await hotelService.addImage(req.params.id, req.body);
      ApiResponse.created(res, image, 'Hotel image added successfully');
    } catch (err: any) {
      ApiResponse.badRequest(res, err.message || 'Unable to add image');
    }
  }

  async adminDeleteHotelImage(req: Request, res: Response) {
    try {
      await hotelService.deleteImage(req.params.imageId);
      ApiResponse.success(res, { deleted: true }, 'Hotel image deleted successfully');
    } catch (err: any) {
      ApiResponse.badRequest(res, err.message || 'Unable to delete image');
    }
  }

  async adminCreateRoomType(req: Request, res: Response) {
    try {
      const room = await roomService.createRoomType(req.params.id, req.body);
      ApiResponse.created(res, room, 'Room type created successfully');
    } catch (err: any) {
      ApiResponse.badRequest(res, err.message || 'Unable to create room type');
    }
  }

  async adminUpdateRoomType(req: Request, res: Response) {
    try {
      const updated = await roomService.updateRoomType(req.params.roomTypeId, req.body);
      ApiResponse.success(res, updated, 'Room type updated successfully');
    } catch (err: any) {
      ApiResponse.badRequest(res, err.message || 'Unable to update room type');
    }
  }

  async adminCreateRate(req: Request, res: Response) {
    try {
      const rate = await roomService.createRate(req.params.roomTypeId, req.body);
      ApiResponse.created(res, rate, 'Seasonal room rate created successfully');
    } catch (err: any) {
      ApiResponse.badRequest(res, err.message || 'Unable to create rate');
    }
  }

  async adminListTransferRates(req: Request, res: Response) {
    try {
      const rates = await transferRateService.getTransferRatesForHotel(req.params.id);
      ApiResponse.success(res, rates, 'Airport transfer rates retrieved successfully');
    } catch (err: any) {
      ApiResponse.serverError(res, 'Unable to retrieve transfer rates');
    }
  }

  async adminCreateTransferRate(req: Request, res: Response) {
    try {
      const adminId = req.user?.sub;
      const rate = await transferRateService.createTransferRate(req.params.id, req.body, adminId);
      ApiResponse.created(res, rate, 'Fixed airport transfer rate created successfully');
    } catch (err: any) {
      ApiResponse.badRequest(res, err.message || 'Unable to create transfer rate');
    }
  }

  async adminUpdateTransferRate(req: Request, res: Response) {
    try {
      const updated = await transferRateService.updateTransferRate(req.params.rateId, req.body);
      ApiResponse.success(res, updated, 'Airport transfer rate updated successfully');
    } catch (err: any) {
      ApiResponse.badRequest(res, err.message || 'Unable to update transfer rate');
    }
  }

  async adminDeleteTransferRate(req: Request, res: Response) {
    try {
      await transferRateService.deleteTransferRate(req.params.rateId);
      ApiResponse.success(res, { deleted: true }, 'Airport transfer rate deactivated');
    } catch (err: any) {
      ApiResponse.badRequest(res, err.message || 'Unable to delete transfer rate');
    }
  }

  async adminListBookings(req: Request, res: Response) {
    try {
      const { hotelId, status, page, limit } = req.query;
      const result = await hospitalityBookingService.adminListBookings({
        hotelId: hotelId as string,
        status: status as HotelBookingStatus,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
      });
      ApiResponse.success(res, result, 'Admin hotel bookings retrieved successfully');
    } catch (err: any) {
      ApiResponse.serverError(res, 'Unable to retrieve bookings');
    }
  }

  async adminUpdateBookingStatus(req: Request, res: Response) {
    try {
      const updated = await hospitalityBookingService.adminUpdateBookingStatus(
        req.params.id,
        req.body.status
      );
      ApiResponse.success(res, updated, 'Booking status updated successfully');
    } catch (err: any) {
      ApiResponse.badRequest(res, err.message || 'Unable to update status');
    }
  }

  async adminCreateLounge(req: Request, res: Response) {
    try {
      const adminId = req.user?.sub;
      const lounge = await loungeService.createLounge(req.body, adminId);
      ApiResponse.created(res, lounge, 'Lounge created successfully in DRAFT status');
    } catch (err: any) {
      ApiResponse.badRequest(res, err.message || 'Unable to create lounge');
    }
  }

  async adminUpdateLounge(req: Request, res: Response) {
    try {
      const adminId = req.user?.sub;
      const updated = await loungeService.updateLounge(req.params.id, req.body, adminId);
      ApiResponse.success(res, updated, 'Lounge updated successfully');
    } catch (err: any) {
      ApiResponse.badRequest(res, err.message || 'Unable to update lounge');
    }
  }

  async adminDeleteLounge(req: Request, res: Response) {
    try {
      await loungeService.deleteLounge(req.params.id);
      ApiResponse.success(res, { deleted: true }, 'Lounge deleted successfully');
    } catch (err: any) {
      ApiResponse.badRequest(res, err.message || 'Unable to delete lounge');
    }
  }

  async adminPublishLounge(req: Request, res: Response) {
    try {
      const published = await loungeService.publishLounge(req.params.id);
      ApiResponse.success(res, published, 'Lounge published successfully');
    } catch (err: any) {
      ApiResponse.badRequest(res, err.message || 'Unable to publish lounge');
    }
  }

  async adminUnpublishLounge(req: Request, res: Response) {
    try {
      const unpublished = await loungeService.unpublishLounge(req.params.id);
      ApiResponse.success(res, unpublished, 'Lounge unpublished successfully');
    } catch (err: any) {
      ApiResponse.badRequest(res, err.message || 'Unable to unpublish lounge');
    }
  }
}

export const hospitalityController = new HospitalityController();
