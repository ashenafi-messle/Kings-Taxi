import { prisma } from '../../core/database/prisma';
import { logger } from '../../core/logging/logger';
import { Prisma, VehicleType } from '@prisma/client';
import { CreateAirportTransferRateDto, UpdateAirportTransferRateDto } from './hospitality.types';
import { parseCalendarDate } from './utils/addisDate';

function isDbConnectionError(err: any): boolean {
  if (!err) return false;
  const name = String(err.name || '');
  const msg = String(err.message || '');
  const code = String(err.code || '');

  return (
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
    msg.includes('5433')
  );
}

export class TransferRateService {
  /**
   * Super Admin: Create a fixed-price airport transfer rate for a hotel
   */
  async createTransferRate(hotelId: string, dto: CreateAirportTransferRateDto, adminId?: string) {
    const hotel = await prisma.hotel.findUnique({ where: { id: hotelId } });
    if (!hotel) throw new Error('HOTEL_NOT_FOUND: Hotel does not exist');

    const effectiveFrom = parseCalendarDate(dto.effectiveFrom);
    const effectiveUntil = dto.effectiveUntil ? parseCalendarDate(dto.effectiveUntil) : null;

    if (effectiveUntil && effectiveUntil.getTime() <= effectiveFrom.getTime()) {
      throw new Error('INVALID_DATE_RANGE: effectiveUntil must be after effectiveFrom');
    }

    const vehicleType = dto.vehicleType || VehicleType.STANDARD_SEDAN;
    const originName = dto.originName || 'Atse Tewodros Airport (GDQ), Gondar';
    const destinationName = dto.destinationName || `${hotel.name}, ${hotel.address}`;

    // Deactivate previous conflicting active rate for same hotel, vehicle type, and origin
    await prisma.airportTransferRate.updateMany({
      where: {
        hotelId,
        vehicleType,
        originName,
        isActive: true,
      },
      data: { isActive: false },
    });

    return prisma.airportTransferRate.create({
      data: {
        hotelId,
        originName,
        originType: 'AIRPORT',
        destinationName,
        vehicleType,
        vehicleCapacity: dto.vehicleCapacity || (vehicleType === VehicleType.COMFORT_VAN ? 6 : 4),
        fixedPrice: new Prisma.Decimal(dto.fixedPrice),
        currency: dto.currency || 'ETB',
        effectiveFrom,
        effectiveUntil,
        isActive: true,
        createdByAdminId: adminId,
      },
    });
  }

  /**
   * Super Admin: Update transfer rate
   */
  async updateTransferRate(rateId: string, dto: UpdateAirportTransferRateDto) {
    const rate = await prisma.airportTransferRate.findUnique({ where: { id: rateId } });
    if (!rate) throw new Error('RATE_NOT_FOUND: Airport transfer rate does not exist');

    return prisma.airportTransferRate.update({
      where: { id: rateId },
      data: {
        originName: dto.originName,
        destinationName: dto.destinationName,
        vehicleType: dto.vehicleType,
        vehicleCapacity: dto.vehicleCapacity,
        fixedPrice: dto.fixedPrice !== undefined ? new Prisma.Decimal(dto.fixedPrice) : undefined,
        currency: dto.currency,
        effectiveFrom: dto.effectiveFrom ? parseCalendarDate(dto.effectiveFrom) : undefined,
        effectiveUntil: dto.effectiveUntil ? parseCalendarDate(dto.effectiveUntil) : undefined,
        isActive: dto.isActive,
      },
    });
  }

  /**
   * Public: Get available airport transfer options for a specific hotel
   */
  async getTransferRatesForHotel(hotelId: string, targetDate?: string | Date) {
    try {
      const checkDate = targetDate ? parseCalendarDate(targetDate) : new Date();

      const rates = await prisma.airportTransferRate.findMany({
        where: {
          hotelId,
          isActive: true,
          effectiveFrom: { lte: checkDate },
          OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: checkDate } }],
        },
        orderBy: { fixedPrice: 'asc' },
      });

      if (rates.length > 0) {
        return rates.map((r) => ({
          id: r.id,
          hotelId: r.hotelId,
          originName: r.originName,
          destinationName: r.destinationName,
          vehicleType: r.vehicleType,
          vehicleCapacity: r.vehicleCapacity,
          fixedPrice: Number(r.fixedPrice),
          currency: r.currency,
          isActive: r.isActive,
        }));
      }

      return this.getBuiltinTransferRates(hotelId);
    } catch (err: any) {
      if (isDbConnectionError(err)) {
        logger.warn(
          { err: err.message },
          `[Hospitality] Database unreachable. Serving default transfer rates for hotel ${hotelId}`
        );
        return this.getBuiltinTransferRates(hotelId);
      }
      throw err;
    }
  }

  getBuiltinTransferRates(hotelId: string) {
    return [
      {
        id: 'gdq_sedan',
        hotelId,
        originName: 'Atse Tewodros Airport (GDQ), Gondar',
        destinationName: 'Hotel Entry Gate',
        vehicleType: 'STANDARD_SEDAN',
        vehicleCapacity: 4,
        fixedPrice: 1200,
        currency: 'ETB',
        isActive: true,
      },
      {
        id: 'gdq_van',
        hotelId,
        originName: 'Atse Tewodros Airport (GDQ), Gondar',
        destinationName: 'Hotel Entry Gate',
        vehicleType: 'COMFORT_VAN',
        vehicleCapacity: 6,
        fixedPrice: 1800,
        currency: 'ETB',
        isActive: true,
      },
      {
        id: 'gdq_suv',
        hotelId,
        originName: 'Atse Tewodros Airport (GDQ), Gondar',
        destinationName: 'Hotel Entry Gate',
        vehicleType: 'EXECUTIVE',
        vehicleCapacity: 4,
        fixedPrice: 2000,
        currency: 'ETB',
        isActive: true,
      },
    ];
  }

  /**
   * Super Admin: Delete / deactivate transfer rate
   */
  async deleteTransferRate(rateId: string) {
    return prisma.airportTransferRate.update({
      where: { id: rateId },
      data: { isActive: false },
    });
  }
}

export const transferRateService = new TransferRateService();

