import crypto from 'crypto';
import { Prisma, PaymentMethod, PaymentStatus } from '@prisma/client';
import { prisma } from '../../core/database/prisma';
import { logger } from '../../core/logging/logger';
import {
  TourQuoteResponseDTO,
  HeritageTourBookingStatus,
} from './heritage.types';
import { validateTourBookingDate, getAddisAbabaTodayDate } from './utils/date.utils';
import { heritageSiteService } from './site.service';
import { heritageTourPackageService } from './package.service';
import { heritageTourGuideService } from './guide.service';
import { heritageTourVehicleOptionService } from './vehicleOption.service';
import { heritageTourPricingService } from './pricing.service';

// In-memory fallback cache for development/offline test resiliency
const fallbackBookingsCache: Map<string, any> = new Map();

export class HeritageTourBookingService {
  /**
   * Calculate transparent itemized quote without persisting
   */
  async quoteTour(dto: {
    packageId?: string;
    siteIds?: string[];
    scheduledDate: string;
    preferredStartTime?: string;
    adults: number;
    children: number;
    vehicleOptionId?: string;
    requestGuide?: boolean;
    preferredGuideLanguage?: string;
    selectedGuideId?: string;
  }): Promise<TourQuoteResponseDTO> {
    const totalPassengers = dto.adults + (dto.children || 0);
    if (totalPassengers < 1) {
      throw new Error('At least 1 passenger is required.');
    }

    // 1. Validate Schedule Date
    const dateValidation = validateTourBookingDate(
      dto.scheduledDate,
      dto.preferredStartTime || '09:00',
      6
    );
    if (!dateValidation.valid) {
      throw new Error(dateValidation.error);
    }

    // 2. Resolve Package & Visited Sites
    let packageName: string | undefined;
    let basePrice = 0;
    let sitesToVisit: Array<{
      id: string;
      name: string;
      entryFeeETB: number;
      requiresBoatTransport: boolean;
    }> = [];

    if (dto.packageId) {
      const pkg = await heritageTourPackageService.getPackageBySlugOrId(dto.packageId);
      if (!pkg) {
        throw new Error(`Tour package with ID or slug '${dto.packageId}' not found.`);
      }
      packageName = pkg.name;
      basePrice = Number(pkg.basePrice);

      if ((pkg as any).sites && (pkg as any).sites.length > 0) {
        sitesToVisit = (pkg as any).sites.map((s: any) => ({
          id: s.siteId,
          name: s.siteName,
          entryFeeETB: Number(s.entryFeeETB || 0),
          requiresBoatTransport: Boolean(s.requiresBoatTransport),
        }));
      } else if ((pkg as any).packageSites && (pkg as any).packageSites.length > 0) {
        sitesToVisit = (pkg as any).packageSites.map((ps: any) => ({
          id: ps.site.id,
          name: ps.site.name,
          entryFeeETB: Number(ps.site.entryFeeETB || 0),
          requiresBoatTransport: Boolean(ps.site.requiresBoatTransport),
        }));
      }
    } else if (dto.siteIds && dto.siteIds.length > 0) {
      for (const siteId of dto.siteIds) {
        const site = await heritageSiteService.getSiteBySlugOrId(siteId);
        if (site) {
          sitesToVisit.push({
            id: site.id,
            name: site.name,
            entryFeeETB: Number(site.entryFeeETB || 0),
            requiresBoatTransport: Boolean(site.requiresBoatTransport),
          });
        }
      }
      basePrice = 1000; // Custom tour base rate
    } else {
      throw new Error('Either packageId or siteIds must be provided.');
    }

    // 3. Resolve & Validate Vehicle Option
    let vehicleOption: any = null;
    if (dto.vehicleOptionId) {
      vehicleOption = await heritageTourVehicleOptionService.getVehicleOptionById(dto.vehicleOptionId);
      if (!vehicleOption) {
        throw new Error(`Vehicle option with ID '${dto.vehicleOptionId}' not found.`);
      }
      const capacityCheck = heritageTourVehicleOptionService.validateVehicleCapacity(
        vehicleOption,
        totalPassengers
      );
      if (!capacityCheck.valid) {
        throw new Error(capacityCheck.error);
      }
    } else {
      // Default to Standard Sedan or Minivan depending on passengers
      const options = await heritageTourVehicleOptionService.listVehicleOptions();
      vehicleOption = options.find((o) => o.seatingCapacity >= totalPassengers) || options[0];
    }

    // 4. Resolve Tour Guide
    let guide: any = null;
    const requestGuide = Boolean(dto.requestGuide || dto.selectedGuideId);
    if (requestGuide) {
      if (dto.selectedGuideId) {
        guide = await heritageTourGuideService.getGuideById(dto.selectedGuideId);
        if (!guide) {
          throw new Error(`Guide with ID '${dto.selectedGuideId}' not found.`);
        }
        const available = await heritageTourGuideService.checkGuideAvailability(
          guide.id,
          dto.scheduledDate
        );
        if (!available) {
          throw new Error(`Guide '${guide.fullName}' is already booked on ${dto.scheduledDate}.`);
        }
      }
    }

    // 5. Calculate Pricing
    const pricing = heritageTourPricingService.calculatePricing({
      packageName,
      basePrice,
      sites: sitesToVisit,
      totalPassengers,
      vehicleOption,
      guideRequested: requestGuide,
      guide,
    });

    const quoteRef = `HTQ-${dto.scheduledDate.replace(/-/g, '')}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    return {
      quoteReference: quoteRef,
      packageName,
      scheduledDate: dto.scheduledDate,
      preferredStartTime: dto.preferredStartTime || '09:00',
      totalPassengers,
      adults: dto.adults,
      children: dto.children || 0,
      requiresBoatTransport: sitesToVisit.some((s) => s.requiresBoatTransport),
      pricing,
      vehicleOption: vehicleOption
        ? {
            id: vehicleOption.id,
            displayName: vehicleOption.displayName,
            seatingCapacity: vehicleOption.seatingCapacity,
          }
        : undefined,
      guideRequested: requestGuide,
      guideLanguage: dto.preferredGuideLanguage || 'English',
    };
  }

  /**
   * Create authoritative tour booking with immutable snapshots
   */
  async createBooking(
    passengerId: string,
    dto: {
      packageId?: string;
      siteIds?: string[];
      scheduledDate: string;
      preferredStartTime?: string;
      adults: number;
      children: number;
      vehicleOptionId?: string;
      requestGuide?: boolean;
      preferredGuideLanguage?: string;
      selectedGuideId?: string;
      pickupLocation: string;
      pickupLatitude?: number;
      pickupLongitude?: number;
      specialRequests?: string;
      paymentMethod?: string;
    }
  ) {
    if (!passengerId) {
      throw new Error('Passenger authentication is required.');
    }

    // 1. Get authoritative quote
    const quote = await this.quoteTour(dto);

    // 2. Generate unique booking reference
    const today = getAddisAbabaTodayDate().replace(/-/g, '');
    const randCode = crypto.randomBytes(3).toString('hex').toUpperCase();
    const bookingReference = `HTB-${today}-${randCode}`;

    // 3. Resolve visited sites for site snapshots
    let sitesToVisit: Array<{
      id: string;
      name: string;
      entryFeeETB: number;
      requiresBoatTransport: boolean;
    }> = [];

    if (dto.packageId) {
      const pkg = await heritageTourPackageService.getPackageBySlugOrId(dto.packageId);
      if (pkg && (pkg as any).sites) {
        sitesToVisit = (pkg as any).sites.map((s: any) => ({
          id: s.siteId,
          name: s.siteName,
          entryFeeETB: Number(s.entryFeeETB || 0),
          requiresBoatTransport: Boolean(s.requiresBoatTransport),
        }));
      } else if (pkg && (pkg as any).packageSites) {
        sitesToVisit = (pkg as any).packageSites.map((ps: any) => ({
          id: ps.site.id,
          name: ps.site.name,
          entryFeeETB: Number(ps.site.entryFeeETB || 0),
          requiresBoatTransport: Boolean(ps.site.requiresBoatTransport),
        }));
      }
    } else if (dto.siteIds) {
      for (const siteId of dto.siteIds) {
        const site = await heritageSiteService.getSiteBySlugOrId(siteId);
        if (site) {
          sitesToVisit.push({
            id: site.id,
            name: site.name,
            entryFeeETB: Number(site.entryFeeETB || 0),
            requiresBoatTransport: Boolean(site.requiresBoatTransport),
          });
        }
      }
    }

    const bookingId = crypto.randomUUID();
    const paymentRef = `TX-HTB-${today}-${randCode}`;

    try {
      await prisma.$transaction(async (tx) => {
        // A. Insert Booking Record
        const booking = await tx.heritageTourBooking.create({
          data: {
            id: bookingId,
            bookingReference,
            passengerId,
            packageId: dto.packageId || null,
            vehicleOptionId: quote.vehicleOption?.id || null,
            assignedGuideId: dto.selectedGuideId || null,
            bookingStatus: 'REQUESTED',
            paymentStatus: 'PENDING',
            scheduledDate: new Date(dto.scheduledDate),
            preferredStartTime: dto.preferredStartTime || '09:00',
            adults: dto.adults,
            children: dto.children || 0,
            pickupLocation: dto.pickupLocation,
            pickupLatitude: dto.pickupLatitude || null,
            pickupLongitude: dto.pickupLongitude || null,
            specialRequests: dto.specialRequests || null,
            baseAmount: new Prisma.Decimal(quote.pricing.baseAmount),
            vehicleAmount: new Prisma.Decimal(quote.pricing.vehicleAmount),
            guideAmount: new Prisma.Decimal(quote.pricing.guideAmount),
            entranceFeesAmount: new Prisma.Decimal(quote.pricing.entranceFeesAmount),
            boatTransportAmount: new Prisma.Decimal(quote.pricing.boatTransportAmount),
            taxAmount: new Prisma.Decimal(quote.pricing.taxAmount),
            totalAmount: new Prisma.Decimal(quote.pricing.totalAmount),
            currency: quote.pricing.currency,
            pricingSnapshot: quote.pricing as any,
          },
        });

        // B. Insert Visited Site Snapshots
        if (sitesToVisit.length > 0) {
          await tx.heritageTourBookingSite.createMany({
            data: sitesToVisit.map((s, index) => ({
              bookingId,
              siteId: s.id,
              siteNameSnapshot: s.name,
              visitOrder: index + 1,
              entryFeeSnapshot: new Prisma.Decimal(s.entryFeeETB),
              requiresBoatSnapshot: s.requiresBoatTransport,
            })),
          });
        }

        // C. Insert Itemized Price Breakdowns
        if (quote.pricing.breakdown.length > 0) {
          await tx.heritageTourBookingPriceItem.createMany({
            data: quote.pricing.breakdown.map((item) => ({
              bookingId,
              componentName: item.componentName,
              componentType: item.componentType as any,
              pricingMethod: item.pricingMethod as any,
              unitPrice: new Prisma.Decimal(item.unitPrice),
              quantity: item.quantity,
              totalPrice: new Prisma.Decimal(item.totalPrice),
              description: item.description || null,
            })),
          });
        }

        // D. Guide Request if requested
        if (quote.guideRequested) {
          await tx.heritageTourGuideRequest.create({
            data: {
              bookingId,
              preferredLanguage: quote.guideLanguage || 'English',
              assignedGuideId: dto.selectedGuideId || null,
              status: dto.selectedGuideId ? 'ASSIGNED' : 'REQUESTED',
            },
          });
        }

        // E. Create Initial Payment Entry
        await tx.payment.create({
          data: {
            heritageTourBookingId: bookingId,
            passengerId,
            paymentType: 'HERITAGE_TOUR',
            amount: new Prisma.Decimal(quote.pricing.totalAmount),
            currency: quote.pricing.currency,
            paymentMethod: (dto.paymentMethod as PaymentMethod) || PaymentMethod.CASH,
            paymentStatus: PaymentStatus.PENDING,
            transactionReference: paymentRef,
          },
        });

        return booking;
      });

      return this.getBookingByReference(passengerId, bookingReference, true);
    } catch (err: any) {
      if (process.env.NODE_ENV === 'production') {
        logger.error(
          { err: err.message, passengerId },
          '[HeritageTourBookingService] Database transaction failed in production mode. Aborting booking.'
        );
        throw new Error(`TOUR_BOOKING_PERSISTENCE_FAILED: Failed to persist tour booking to database: ${err.message}`);
      }

      logger.warn(
        { err: err.message, passengerId },
        '[HeritageTourBookingService] Database write failed. Using offline fallback.'
      );
      // In development or if database schema migration is pending, persist to resilient in-memory fallback
      const fallbackBooking = {
        id: bookingId,
        bookingReference,
        passengerId,
        packageId: dto.packageId || null,
        packageName: quote.packageName,
        bookingStatus: 'REQUESTED',
        paymentStatus: 'PENDING',
        scheduledDate: dto.scheduledDate,
        preferredStartTime: dto.preferredStartTime || '09:00',
        adults: dto.adults,
        children: dto.children || 0,
        pickupLocation: dto.pickupLocation,
        pickupLatitude: dto.pickupLatitude || null,
        pickupLongitude: dto.pickupLongitude || null,
        specialRequests: dto.specialRequests || null,
        totalAmount: quote.pricing.totalAmount,
        currency: quote.pricing.currency,
        pricing: quote.pricing,
        vehicleOption: quote.vehicleOption,
        guideRequested: quote.guideRequested,
        guideLanguage: quote.guideLanguage,
        sites: sitesToVisit,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      fallbackBookingsCache.set(bookingReference, fallbackBooking);
      return fallbackBooking;
    }
  }

  /**
   * Get all bookings for a passenger
   */
  async getPassengerBookings(passengerId: string) {
    try {
      const dbBookings = await prisma.heritageTourBooking.findMany({
        where: { passengerId },
        include: {
          package: true,
          vehicleOption: true,
          assignedGuide: true,
          bookingSites: true,
          priceItems: true,
          payment: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (dbBookings.length > 0) {
        return dbBookings;
      }
    } catch {
      // Fallback
    }

    const fallbacks: any[] = [];
    fallbackBookingsCache.forEach((booking) => {
      if (booking.passengerId === passengerId) {
        fallbacks.push(booking);
      }
    });
    return fallbacks.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Get single booking by reference with passenger isolation
   */
  async getBookingByReference(
    passengerId: string,
    bookingReference: string,
    isAdmin: boolean = false
  ) {
    try {
      const booking = await prisma.heritageTourBooking.findUnique({
        where: { bookingReference },
        include: {
          package: true,
          vehicleOption: true,
          assignedGuide: true,
          assignedVehicle: true,
          assignedDriver: true,
          bookingSites: true,
          priceItems: true,
          guideRequests: true,
          payment: true,
        },
      });

      if (booking) {
        if (!isAdmin && booking.passengerId !== passengerId) {
          throw new Error('Access denied: You cannot view bookings belonging to another passenger.');
        }
        return booking;
      }
    } catch (err: any) {
      if (err.message.includes('Access denied')) throw err;
    }

    const fallback = fallbackBookingsCache.get(bookingReference);
    if (fallback) {
      if (!isAdmin && fallback.passengerId !== passengerId) {
        throw new Error('Access denied: You cannot view bookings belonging to another passenger.');
      }
      return fallback;
    }

    return null;
  }

  /**
   * Cancel booking
   */
  async cancelBooking(
    passengerId: string,
    bookingReference: string,
    reason: string,
    isAdmin: boolean = false
  ) {
    const booking = await this.getBookingByReference(passengerId, bookingReference, isAdmin);
    if (!booking) {
      throw new Error(`Booking '${bookingReference}' not found.`);
    }

    if (['COMPLETED', 'CANCELLED', 'REJECTED'].includes(booking.bookingStatus)) {
      throw new Error(`Cannot cancel booking with current status '${booking.bookingStatus}'.`);
    }

    try {
      return await prisma.heritageTourBooking.update({
        where: { bookingReference },
        data: {
          bookingStatus: 'CANCELLED',
          cancellationReason: reason,
          cancelledAt: new Date(),
        },
      });
    } catch {
      booking.bookingStatus = 'CANCELLED';
      booking.cancellationReason = reason;
      booking.cancelledAt = new Date().toISOString();
      fallbackBookingsCache.set(bookingReference, booking);
      return booking;
    }
  }

  /**
   * Super-admin: List all bookings
   */
  async adminListBookings(query?: {
    status?: HeritageTourBookingStatus;
    scheduledDate?: string;
  }) {
    try {
      const where: any = {};
      if (query?.status) where.bookingStatus = query.status;
      if (query?.scheduledDate) where.scheduledDate = new Date(query.scheduledDate);

      const dbList = await prisma.heritageTourBooking.findMany({
        where,
        include: {
          passenger: {
            select: { id: true, fullName: true, phoneNumber: true, email: true },
          },
          package: true,
          assignedGuide: true,
          payment: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (dbList.length > 0) return dbList;
    } catch {
      // Fallback
    }

    const list: any[] = [];
    fallbackBookingsCache.forEach((b) => {
      if (!query?.status || b.bookingStatus === query.status) {
        list.push(b);
      }
    });
    return list;
  }

  /**
   * Super-admin: Update booking status & assignments
   */
  async adminUpdateBookingStatus(
    idOrRef: string,
    data: {
      status: HeritageTourBookingStatus;
      assignedGuideId?: string;
      assignedVehicleId?: string;
      assignedDriverId?: string;
      notes?: string;
    }
  ) {
    try {
      return await prisma.heritageTourBooking.update({
        where: idOrRef.startsWith('HTB-') ? { bookingReference: idOrRef } : { id: idOrRef },
        data: {
          bookingStatus: data.status,
          ...(data.assignedGuideId ? { assignedGuideId: data.assignedGuideId } : {}),
          ...(data.assignedVehicleId ? { assignedVehicleId: data.assignedVehicleId } : {}),
          ...(data.assignedDriverId ? { assignedDriverId: data.assignedDriverId } : {}),
        },
      });
    } catch {
      let b = fallbackBookingsCache.get(idOrRef);
      if (!b) {
        for (const item of fallbackBookingsCache.values()) {
          if (item.id === idOrRef) {
            b = item;
            break;
          }
        }
      }
      if (b) {
        b.bookingStatus = data.status;
        if (data.assignedGuideId) b.assignedGuideId = data.assignedGuideId;
        return b;
      }
      throw new Error(`Booking '${idOrRef}' not found.`);
    }
  }
}

export const heritageTourBookingService = new HeritageTourBookingService();
