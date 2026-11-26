import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';

const { mockPrismaClient, resetDb, db } = vi.hoisted(() => {
  const store: {
    sites: Map<string, any>;
    siteImages: Map<string, any[]>;
    vehicles: Map<string, any>;
    bookings: Map<string, any>;
    auditLogs: any[];
    packages: Map<string, any>;
  } = {
    sites: new Map(),
    siteImages: new Map(),
    vehicles: new Map(),
    bookings: new Map(),
    auditLogs: [],
    packages: new Map(),
  };

  const mock: any = {
    heritageSite: {
      findMany: vi.fn(async ({ where }: any = {}) => {
        const list = Array.from(store.sites.values()).filter((s) => {
          if (where?.status && s.status !== where.status) return false;
          if (where?.featured !== undefined && s.featured !== where.featured) return false;
          return true;
        });
        return list.map((s) => ({
          ...s,
          destinationImages: store.siteImages.get(s.id) || [],
        }));
      }),
      findFirst: vi.fn(async ({ where }: any) => {
        for (const s of store.sites.values()) {
          if (where?.status && s.status !== where.status) continue;
          if (where?.OR) {
            const matched = where.OR.some((c: any) => (c.id && s.id === c.id) || (c.slug && s.slug === c.slug));
            if (!matched) continue;
          }
          return {
            ...s,
            destinationImages: store.siteImages.get(s.id) || [],
          };
        }
        return null;
      }),
      findUnique: vi.fn(async ({ where }: any) => store.sites.get(where.id) || null),
      create: vi.fn(async ({ data }: any) => {
        const id = data.id || `site_${store.sites.size + 1}`;
        const rec = { id, status: 'DRAFT', featured: false, galleryImages: [], ...data };
        store.sites.set(id, rec);
        return rec;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const cur = store.sites.get(where.id);
        if (!cur) throw new Error('SITE_NOT_FOUND');
        const next = { ...cur, ...data };
        store.sites.set(where.id, next);
        return next;
      }),
      delete: vi.fn(async ({ where }: any) => {
        const cur = store.sites.get(where.id);
        store.sites.delete(where.id);
        return cur;
      }),
    },
    heritageDestinationImage: {
      findMany: vi.fn(async ({ where }: any) => store.siteImages.get(where.siteId) || []),
      deleteMany: vi.fn(async ({ where }: any) => {
        store.siteImages.set(where.siteId, []);
        return { count: 0 };
      }),
      create: vi.fn(async ({ data }: any) => {
        const list = store.siteImages.get(data.siteId) || [];
        const rec = { id: `img_${list.length + 1}`, ...data };
        list.push(rec);
        store.siteImages.set(data.siteId, list);
        return rec;
      }),
    },
    heritageTourPackage: {
      findMany: vi.fn(async () => Array.from(store.packages.values())),
      findFirst: vi.fn(async () => null),
    },
    heritageTourVehicleOption: {
      findMany: vi.fn(async () => []),
      findUnique: vi.fn(async () => null),
    },
    heritageTourGuide: {
      findMany: vi.fn(async () => []),
    },
    vehicle: {
      findMany: vi.fn(async ({ where }: any) => {
        return Array.from(store.vehicles.values()).filter((v) => {
          if (where?.status?.in && !where.status.in.includes(v.status)) return false;
          if (where?.verificationStatus && v.verificationStatus !== where.verificationStatus) return false;
          if (where?.isActive !== undefined && v.isActive !== where.isActive) return false;
          if (where?.seatingCapacity?.gte && v.seatingCapacity < where.seatingCapacity.gte) return false;
          return true;
        });
      }),
      findUnique: vi.fn(async ({ where }: any) => store.vehicles.get(where.id) || null),
    },
    heritageTourBooking: {
      findUnique: vi.fn(async ({ where }: any) => {
        if (where?.idempotencyKey) {
          for (const b of store.bookings.values()) {
            if (b.idempotencyKey === where.idempotencyKey) return b;
          }
        }
        if (where?.bookingReference) {
          for (const b of store.bookings.values()) {
            if (b.bookingReference === where.bookingReference) return b;
          }
        }
        if (where?.id) return store.bookings.get(where.id) || null;
        return null;
      }),
      findFirst: vi.fn(async ({ where }: any) => {
        for (const b of store.bookings.values()) {
          if (where?.id && typeof where.id === 'string' && b.id !== where.id) continue;
          if (where?.id?.not && b.id === where.id.not) continue;
          if (where?.bookingReference && b.bookingReference !== where.bookingReference) continue;
          if (where?.assignedVehicleId && b.assignedVehicleId !== where.assignedVehicleId) continue;
          if (where?.scheduledDate && new Date(b.scheduledDate).getTime() !== new Date(where.scheduledDate).getTime()) continue;
          if (where?.bookingStatus?.in && !where.bookingStatus.in.includes(b.bookingStatus)) continue;
          return b;
        }
        return null;
      }),
      findMany: vi.fn(async ({ where }: any) => {
        return Array.from(store.bookings.values()).filter((b) => {
          if (where?.scheduledDate && new Date(b.scheduledDate).getTime() !== new Date(where.scheduledDate).getTime()) return false;
          if (where?.bookingStatus?.in && !where.bookingStatus.in.includes(b.bookingStatus)) return false;
          return true;
        });
      }),
      create: vi.fn(async ({ data }: any) => {
        const rec = { ...data, createdAt: new Date(), updatedAt: new Date() };
        store.bookings.set(rec.id, rec);
        return rec;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const cur = store.bookings.get(where.id);
        const next = { ...cur, ...data };
        store.bookings.set(where.id, next);
        return next;
      }),
    },
    heritageTourBookingSite: {
      count: vi.fn(async () => 0),
      createMany: vi.fn(async () => ({ count: 1 })),
    },
    heritageTourBookingPriceItem: {
      createMany: vi.fn(async () => ({ count: 1 })),
    },
    heritageTourGuideRequest: {
      create: vi.fn(async () => ({})),
    },
    heritageTourBookingAuditLog: {
      create: vi.fn(async ({ data }: any) => {
        const rec = { id: `audit_${store.auditLogs.length + 1}`, createdAt: new Date(), ...data };
        store.auditLogs.push(rec);
        return rec;
      }),
      findMany: vi.fn(async ({ where }: any) => store.auditLogs.filter((l) => l.bookingId === where.bookingId)),
    },
    payment: {
      create: vi.fn(async ({ data }: any) => data),
    },
  };

  mock.$transaction = vi.fn(async (cb: any) => cb(mock));

  const reset = () => {
    store.sites.clear();
    store.siteImages.clear();
    store.vehicles.clear();
    store.bookings.clear();
    store.auditLogs.length = 0;
    store.packages.clear();
    vi.clearAllMocks();
  };

  return { mockPrismaClient: mock, resetDb: reset, db: store };
});

vi.mock('../../src/core/database/prisma', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/core/database/prisma')>();
  return {
    ...actual,
    prisma: mockPrismaClient,
  };
});

vi.mock('../../src/core/audit/audit.service', () => ({
  auditService: { record: vi.fn(async () => undefined) },
}));

vi.mock('../../src/modules/notifications/notification.service', () => ({
  notificationService: {
    sendHeritageBookingAcceptedNotification: vi.fn(async () => undefined),
    sendHeritageBookingDeclinedNotification: vi.fn(async () => undefined),
  },
}));

import { heritageSiteService } from '../../src/modules/heritage/site.service';
import { heritageTourVehicleOptionService } from '../../src/modules/heritage/vehicleOption.service';
import { heritageTourBookingService } from '../../src/modules/heritage/booking.service';
import { heritageEventBus, subscribePassengerHeritageEvents } from '../../src/modules/heritage/heritageEvents';
import { normalizeBookingStatus } from '../../src/modules/passengers/passengerBookingHistory.service';

describe('Heritage Sites & Heritage Tours End-to-End Module', () => {
  beforeEach(() => {
    resetDb();
  });

  it('creates, publishes, features, orders gallery images, and safely archives sites with bookings', async () => {
    const events: string[] = [];
    const listener = (e: any) => events.push(e.type);
    heritageEventBus.on('heritage:sync', listener);

    try {
      const site = await heritageSiteService.adminCreateSite(
        {
          name: 'Fasil Ghebbi Royal Enclosure',
          slug: 'fasil-ghebbi',
          shortDescription: '17th-century castles',
          fullDescription: 'Full historical compound',
          latitude: 12.6078,
          longitude: 37.4705,
        },
        'adm_1'
      );
      expect(site.status).toBe('DRAFT');

      // Draft site is hidden from public featured list
      const draftCheck = await heritageSiteService.getSiteBySlugOrId(site.id, false);
      expect(draftCheck).toBeNull();

      await heritageSiteService.adminPublishSite(site.id);
      await heritageSiteService.adminUpdateSite(site.id, { featured: true });

      await heritageSiteService.setSiteImages(site.id, [
        { imageUrl: 'https://res.cloudinary.com/demo/image/upload/castle1.jpg', isPrimary: true },
        { imageUrl: 'https://res.cloudinary.com/demo/image/upload/castle2.jpg', isPrimary: false },
      ]);

      const featured = await heritageSiteService.getFeaturedSites();
      expect(featured.some((s: any) => s.id === site.id)).toBe(true);
      expect(featured[0].galleryImages).toHaveLength(2);

      // Safe archive when bookings reference this site
      mockPrismaClient.heritageTourBookingSite.count.mockResolvedValueOnce(2);
      const archived: any = await heritageSiteService.adminDeleteSite(site.id);
      expect(archived.status).toBe('ARCHIVED');

      expect(events).toContain('heritage.site.created');
      expect(events).toContain('heritage.site.published');
      expect(events).toContain('heritage.site.updated');
      expect(events).toContain('heritage.site.unpublished');
    } finally {
      heritageEventBus.off('heritage:sync', listener);
    }
  });

  it('validates registered fleet vehicle eligibility, capacity, maintenance, and scheduling conflicts', async () => {
    db.vehicles.set('veh_active', {
      id: 'veh_active',
      make: 'Toyota',
      vehicleModel: 'Toyota HiAce',
      vehicleType: 'MINIVAN_TOUR',
      plateNumber: 'ET-3-12345',
      seatingCapacity: 7,
      vehicleColor: 'White',
      manufacturingYear: 2023,
      status: 'ACTIVE',
      verificationStatus: 'VERIFIED',
      isActive: true,
    });
    db.vehicles.set('veh_maint', {
      id: 'veh_maint',
      make: 'Toyota',
      vehicleModel: 'Land Cruiser',
      vehicleType: 'SUV',
      plateNumber: 'ET-3-99999',
      seatingCapacity: 5,
      status: 'UNDER_MAINTENANCE',
      verificationStatus: 'VERIFIED',
      isActive: true,
    });

    const available = await heritageTourVehicleOptionService.listAvailableFleetVehicles({
      date: '2026-12-15',
      passengers: 6,
    });
    expect(available).toHaveLength(1);
    expect(available[0].id).toBe('veh_active');

    // Capacity exceeded
    await expect(
      heritageTourVehicleOptionService.validateFleetVehicleEligibility(mockPrismaClient, {
        vehicleId: 'veh_active',
        scheduledDate: new Date('2026-12-15'),
        totalPassengers: 10,
      })
    ).rejects.toThrow('VEHICLE_CAPACITY_EXCEEDED');

    // Under maintenance
    await expect(
      heritageTourVehicleOptionService.validateFleetVehicleEligibility(mockPrismaClient, {
        vehicleId: 'veh_maint',
        scheduledDate: new Date('2026-12-15'),
        totalPassengers: 2,
      })
    ).rejects.toThrow('VEHICLE_UNDER_MAINTENANCE');
  });

  it('creates bookings idempotently, prevents vehicle double-booking, records audit logs, and syncs passenger statuses', async () => {
    db.sites.set('site_1', {
      id: 'site_1',
      name: 'Fasil Ghebbi',
      slug: 'fasil-ghebbi',
      entryFeeETB: 2000,
      requiresBoatTransport: false,
      status: 'PUBLISHED',
    });
    db.vehicles.set('veh_1', {
      id: 'veh_1',
      make: 'Toyota',
      vehicleModel: 'Toyota HiAce',
      vehicleType: 'MINIVAN_TOUR',
      plateNumber: 'ET-3-55555',
      seatingCapacity: 7,
      status: 'ACTIVE',
      verificationStatus: 'VERIFIED',
      isActive: true,
    });

    const booking1: any = await heritageTourBookingService.createBooking('pax_1', {
      siteIds: ['site_1'],
      scheduledDate: '2026-12-20',
      preferredStartTime: '09:00',
      adults: 2,
      children: 0,
      assignedVehicleId: 'veh_1',
      idempotencyKey: 'idem-key-123',
      pickupLocation: 'Goha Hotel',
    });

    expect(booking1.bookingStatus).toBe('PENDING');

    // Duplicate retry with same idempotencyKey returns same booking without creating a second one
    const bookingDup: any = await heritageTourBookingService.createBooking('pax_1', {
      siteIds: ['site_1'],
      scheduledDate: '2026-12-20',
      preferredStartTime: '09:00',
      adults: 2,
      children: 0,
      assignedVehicleId: 'veh_1',
      idempotencyKey: 'idem-key-123',
      pickupLocation: 'Goha Hotel',
    });
    expect(bookingDup.id).toBe(booking1.id);
    expect(db.bookings.size).toBe(1);

    // Concurrent booking for same vehicle & date must fail with conflict
    await expect(
      heritageTourBookingService.createBooking('pax_2', {
        siteIds: ['site_1'],
        scheduledDate: '2026-12-20',
        preferredStartTime: '10:00',
        adults: 2,
        children: 0,
        assignedVehicleId: 'veh_1',
        pickupLocation: 'Piazza',
      })
    ).rejects.toThrow('VEHICLE_SCHEDULING_CONFLICT');

    // Admin confirms booking & audit log is created
    const confirmed: any = await heritageTourBookingService.adminAcceptBooking(booking1.id, 'adm_1', 'Approved');
    expect(confirmed.bookingStatus).toBe('CONFIRMED');

    // Duplicate confirmation rejected cleanly
    await expect(
      heritageTourBookingService.adminAcceptBooking(booking1.id, 'adm_1')
    ).rejects.toThrow('already been accepted and confirmed');

    const auditLogs = await heritageTourBookingService.getBookingAuditHistory(booking1.id);
    expect(auditLogs.map((l: any) => l.action)).toEqual(['BOOKING_CREATED', 'ADMIN_CONFIRM']);

    // Passenger booking history status normalization
    expect(normalizeBookingStatus('HERITAGE', 'PENDING')).toBe('PENDING');
    expect(normalizeBookingStatus('HERITAGE', 'CONFIRMED')).toBe('CONFIRMED');
    expect(normalizeBookingStatus('HERITAGE', 'DECLINED')).toBe('DECLINED');
    expect(normalizeBookingStatus('HERITAGE', 'CANCELLED')).toBe('CANCELLED');
    expect(normalizeBookingStatus('HERITAGE', 'COMPLETED')).toBe('COMPLETED');
  });

  it('isolates passenger SSE booking events so Passenger A never receives Passenger B events', () => {
    const written: string[] = [];
    const req: any = { user: { sub: 'pax_A' }, on: vi.fn() };
    const res: any = {
      setHeader: vi.fn(),
      flushHeaders: vi.fn(),
      write: vi.fn((chunk: string) => written.push(chunk)),
    };

    subscribePassengerHeritageEvents(req as Request, res as Response);

    heritageEventBus.emitHeritage({
      type: 'heritage.booking.confirmed',
      bookingId: 'b_other',
      passengerId: 'pax_B',
      status: 'CONFIRMED',
    });
    heritageEventBus.emitHeritage({
      type: 'heritage.booking.confirmed',
      bookingId: 'b_mine',
      passengerId: 'pax_A',
      status: 'CONFIRMED',
    });

    const combined = written.join('');
    expect(combined).toContain('b_mine');
    expect(combined).not.toContain('b_other');
  });
});
