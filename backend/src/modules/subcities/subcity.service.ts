import { prisma } from '../../core/database/prisma';

export interface CreateSubcityDto {
  name: string;
  slug?: string;
  city?: string;
  centerLatitude: number;
  centerLongitude: number;
  radiusKm?: number;
}

export interface UpdateSubcityDto {
  name?: string;
  isActive?: boolean;
  centerLatitude?: number;
  centerLongitude?: number;
  radiusKm?: number;
}

export class SubcityService {
  /**
   * List all active subcities for passenger discovery & ride booking
   */
  async listActiveSubcities() {
    return prisma.subcity.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        city: true,
        centerLatitude: true,
        centerLongitude: true,
        radiusKm: true,
      },
    });
  }

  /**
   * Get single subcity by ID
   */
  async getSubcityById(id: string) {
    return prisma.subcity.findUnique({
      where: { id },
      include: {
        driverAssignments: {
          include: {
            driver: {
              select: {
                id: true,
                fullName: true,
                availabilityStatus: true,
                verificationStatus: true,
                rating: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Create new subcity (Admin)
   */
  async createSubcity(dto: CreateSubcityDto) {
    const slug = dto.slug || dto.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    return prisma.subcity.create({
      data: {
        name: dto.name,
        slug,
        city: dto.city || 'Gondar',
        centerLatitude: dto.centerLatitude,
        centerLongitude: dto.centerLongitude,
        radiusKm: dto.radiusKm || 5.0,
      },
    });
  }

  /**
   * Update subcity (Admin)
   */
  async updateSubcity(id: string, dto: UpdateSubcityDto) {
    return prisma.subcity.update({
      where: { id },
      data: dto,
    });
  }

  /**
   * Assign driver to subcity (Admin)
   */
  async assignDriver(subcityId: string, driverId: string, isPrimary: boolean = false) {
    return prisma.driverSubcity.upsert({
      where: {
        driverId_subcityId: { driverId, subcityId },
      },
      update: { isPrimary },
      create: { driverId, subcityId, isPrimary },
    });
  }

  /**
   * Remove driver from subcity (Admin)
   */
  async removeDriver(subcityId: string, driverId: string) {
    return prisma.driverSubcity.deleteMany({
      where: { driverId, subcityId },
    });
  }
}

export const subcityService = new SubcityService();
