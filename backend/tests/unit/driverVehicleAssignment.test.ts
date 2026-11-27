import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  AccountStatus,
  DriverAvailabilityStatus,
  DriverVerificationStatus,
  VehicleOperationalStatus,
  VehicleVerificationStatus,
} from '@prisma/client';

const { mockPrisma, mockIo } = vi.hoisted(() => {
  const io = {
    to: vi.fn(() => ({ emit: vi.fn() })),
    emit: vi.fn(),
  };

  const mock: any = {
    vehicle: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    driver: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    vehicleAssignment: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    booking: {
      count: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  };
  mock.$transaction = vi.fn((cb: any) => cb(mock));

  return { mockPrisma: mock, mockIo: io };
});

vi.mock('../../src/core/database/prisma', () => ({
  prisma: mockPrisma,
}));

vi.mock('../../src/core/audit/audit.service', () => ({
  auditService: {
    record: vi.fn(),
  },
}));

import { AdminVehicleService } from '../../src/modules/vehicles/adminVehicle.service';
import { DriverService } from '../../src/modules/drivers/driver.service';
import { setRideSocketServer } from '../../src/modules/realtime/rideSocket';

const DRIVER_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_DRIVER_ID = '22222222-2222-4222-8222-222222222222';
const VEHICLE_ID = '33333333-3333-4333-8333-333333333333';
const NEW_VEHICLE_ID = '44444444-4444-4444-8444-444444444444';
const ASSIGNMENT_ID = '55555555-5555-4555-8555-555555555555';

describe('Driver-to-Vehicle Assignment Integration', () => {
  const adminVehicleService = new AdminVehicleService();
  const driverService = new DriverService();

  beforeEach(() => {
    vi.clearAllMocks();
    setRideSocketServer(mockIo as any);
  });

  it('assigns an eligible vehicle to an eligible driver transactionally with audit log', async () => {
    mockPrisma.vehicle.findUnique.mockResolvedValue({
      id: VEHICLE_ID,
      plateNumber: '3-A12345',
      isActive: true,
      deletedAt: null,
      verificationStatus: VehicleVerificationStatus.VERIFIED,
      status: VehicleOperationalStatus.AVAILABLE,
      driverId: null,
    });
    mockPrisma.vehicleAssignment.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    mockPrisma.driver.findUnique.mockResolvedValue({
      id: DRIVER_ID,
      deletedAt: null,
      verificationStatus: DriverVerificationStatus.APPROVED,
      accountStatus: AccountStatus.ACTIVE,
    });
    mockPrisma.vehicleAssignment.create.mockResolvedValue({
      id: ASSIGNMENT_ID,
      vehicleId: VEHICLE_ID,
      driverId: DRIVER_ID,
      isActive: true,
    });
    mockPrisma.vehicle.update.mockResolvedValue({
      id: VEHICLE_ID,
      driverId: DRIVER_ID,
      status: VehicleOperationalStatus.ASSIGNED,
    });
    mockPrisma.auditLog.create.mockResolvedValue({});

    const res = await adminVehicleService.assignDriverToVehicle(
      VEHICLE_ID,
      DRIVER_ID,
      'admin@kingstaxi.et',
      'Initial assignment',
      { allowReplaceDriverVehicle: false, actorId: 'admin-1' }
    );

    expect(res.driverId).toBe(DRIVER_ID);
    expect(res.status).toBe(VehicleOperationalStatus.ASSIGNED);
    expect(mockPrisma.vehicleAssignment.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'DRIVER_VEHICLE_ASSIGNED',
          driverId: DRIVER_ID,
        }),
      })
    );
  });

  it('rejects assigning an inactive or unverified vehicle', async () => {
    mockPrisma.vehicle.findUnique.mockResolvedValue({
      id: VEHICLE_ID,
      isActive: false,
      deletedAt: null,
      verificationStatus: VehicleVerificationStatus.PENDING,
      status: VehicleOperationalStatus.AVAILABLE,
    });

    await expect(
      adminVehicleService.assignDriverToVehicle(VEHICLE_ID, DRIVER_ID, 'admin@kingstaxi.et')
    ).rejects.toThrow(/inactive/i);
  });

  it('rejects assigning a vehicle already assigned to another driver', async () => {
    mockPrisma.vehicle.findUnique.mockResolvedValue({
      id: VEHICLE_ID,
      isActive: true,
      deletedAt: null,
      verificationStatus: VehicleVerificationStatus.VERIFIED,
      status: VehicleOperationalStatus.AVAILABLE,
      driverId: OTHER_DRIVER_ID,
    });
    mockPrisma.vehicleAssignment.findFirst.mockResolvedValue({
      id: ASSIGNMENT_ID,
      vehicleId: VEHICLE_ID,
      driverId: OTHER_DRIVER_ID,
      isActive: true,
    });

    await expect(
      adminVehicleService.assignDriverToVehicle(VEHICLE_ID, DRIVER_ID, 'admin@kingstaxi.et')
    ).rejects.toThrow(/already assigned to another driver/i);
  });

  it('rejects strict assign when driver already has an active vehicle', async () => {
    mockPrisma.vehicle.findUnique.mockResolvedValue({
      id: NEW_VEHICLE_ID,
      isActive: true,
      deletedAt: null,
      verificationStatus: VehicleVerificationStatus.VERIFIED,
      status: VehicleOperationalStatus.AVAILABLE,
      driverId: null,
    });
    mockPrisma.vehicleAssignment.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: ASSIGNMENT_ID,
        vehicleId: VEHICLE_ID,
        driverId: DRIVER_ID,
        isActive: true,
      });
    mockPrisma.driver.findUnique.mockResolvedValue({
      id: DRIVER_ID,
      deletedAt: null,
      verificationStatus: DriverVerificationStatus.APPROVED,
      accountStatus: AccountStatus.ACTIVE,
    });

    await expect(
      adminVehicleService.assignDriverToVehicle(
        NEW_VEHICLE_ID,
        DRIVER_ID,
        'admin@kingstaxi.et',
        undefined,
        { allowReplaceDriverVehicle: false }
      )
    ).rejects.toThrow(/already has an active vehicle assignment/i);
  });

  it('changes driver vehicle transactionally when driver has no active ride', async () => {
    mockPrisma.vehicle.findUnique.mockResolvedValue({
      id: NEW_VEHICLE_ID,
      plateNumber: '3-B99887',
      isActive: true,
      deletedAt: null,
      verificationStatus: VehicleVerificationStatus.VERIFIED,
      status: VehicleOperationalStatus.AVAILABLE,
      driverId: null,
    });
    mockPrisma.vehicleAssignment.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: ASSIGNMENT_ID,
        vehicleId: VEHICLE_ID,
        driverId: DRIVER_ID,
        isActive: true,
      });
    mockPrisma.driver.findUnique.mockResolvedValue({
      id: DRIVER_ID,
      deletedAt: null,
      verificationStatus: DriverVerificationStatus.APPROVED,
      accountStatus: AccountStatus.ACTIVE,
    });
    mockPrisma.booking.count.mockResolvedValue(0);
    mockPrisma.vehicleAssignment.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.vehicle.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.vehicleAssignment.create.mockResolvedValue({
      id: '66666666-6666-4666-8666-666666666666',
      vehicleId: NEW_VEHICLE_ID,
      driverId: DRIVER_ID,
      isActive: true,
    });
    mockPrisma.vehicle.update.mockResolvedValue({
      id: NEW_VEHICLE_ID,
      driverId: DRIVER_ID,
      status: VehicleOperationalStatus.ASSIGNED,
    });
    mockPrisma.auditLog.create.mockResolvedValue({});

    const res = await adminVehicleService.changeDriverVehicle(
      DRIVER_ID,
      NEW_VEHICLE_ID,
      'admin@kingstaxi.et',
      'Upgrade vehicle'
    );

    expect(res.id).toBe(NEW_VEHICLE_ID);
    expect(mockPrisma.vehicleAssignment.updateMany).toHaveBeenCalledTimes(1);
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'DRIVER_VEHICLE_CHANGED' }),
      })
    );
  });

  it('prevents unassigning a driver who has an active ride or pending request', async () => {
    mockPrisma.driver.findFirst.mockResolvedValue({
      id: DRIVER_ID,
      deletedAt: null,
      subcities: [],
    });
    mockPrisma.booking.count.mockResolvedValue(1);

    await expect(
      adminVehicleService.unassignDriverVehicle(DRIVER_ID, 'admin@kingstaxi.et')
    ).rejects.toThrow(/active ride or pending ride request/i);
  });

  it('unassigns driver vehicle, sets online driver offline, and emits availability update', async () => {
    mockPrisma.driver.findFirst.mockResolvedValue({
      id: DRIVER_ID,
      deletedAt: null,
      availabilityStatus: DriverAvailabilityStatus.AVAILABLE,
      primarySubcityId: null,
      subcities: [{ subcityId: 'sub-1' }],
    });
    mockPrisma.booking.count.mockResolvedValue(0);
    mockPrisma.vehicleAssignment.findFirst.mockResolvedValue({
      id: ASSIGNMENT_ID,
      vehicleId: VEHICLE_ID,
      vehicle: { id: VEHICLE_ID, plateNumber: '3-A12345' },
    });
    mockPrisma.vehicleAssignment.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.vehicle.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.driver.update.mockResolvedValue({});
    mockPrisma.auditLog.create.mockResolvedValue({});

    const res = await adminVehicleService.unassignDriverVehicle(
      DRIVER_ID,
      'admin@kingstaxi.et',
      'Shift ended'
    );

    expect(res.wentOffline).toBe(true);
    expect(mockIo.emit).toHaveBeenCalledWith(
      'driver:availability:changed',
      expect.objectContaining({
        driverId: DRIVER_ID,
        availabilityStatus: DriverAvailabilityStatus.OFFLINE,
      })
    );
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'DRIVER_VEHICLE_UNASSIGNED' }),
      })
    );
  });

  it('blocks driver without vehicle assignment from going online', async () => {
    mockPrisma.driver.findFirst.mockResolvedValue({
      id: DRIVER_ID,
      accountStatus: AccountStatus.ACTIVE,
      verificationStatus: DriverVerificationStatus.APPROVED,
      vehicles: [],
      vehicleAssignments: [],
      subcities: [{ subcityId: 'sub-1' }],
      assignedBookings: [],
    });

    await expect(driverService.goOnline(DRIVER_ID)).rejects.toThrow(
      /active verified vehicle assignment is required/i
    );
  });
});
