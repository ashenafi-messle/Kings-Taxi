import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockPrismaClient } = vi.hoisted(() => {
  const mock: any = {
    driver: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    vehicle: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      groupBy: vi.fn(),
    },
    vehicleAssignment: {
      create: vi.fn(),
      updateMany: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    vehicleMaintenance: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    driverStatusHistory: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    driverDocument: {
      createMany: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    vehicleDocument: {
      createMany: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    trip: {
      count: vi.fn(),
    },
  };
  mock.$transaction = vi.fn((cb: any) => cb(mock));
  return { mockPrismaClient: mock };
});

vi.mock('../../src/core/database/prisma', () => ({
  prisma: mockPrismaClient,
}));

import { adminDriverService } from '../../src/modules/drivers/adminDriver.service';
import { adminVehicleService } from '../../src/modules/vehicles/adminVehicle.service';

const prismaMock = mockPrismaClient;

describe('Admin Drivers & Fleet Management Service Unit Tests', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    prismaMock.$transaction.mockImplementation((cb: any) => cb(prismaMock));
    prismaMock.trip = { count: vi.fn().mockResolvedValue(0) };
  });

  describe('Admin Driver Management Service', () => {
    it('1. retrieves paginated drivers list with filters and search query', async () => {
      const mockDrivers = [
        {
          id: 'drv-uuid-1',
          driverId: 'DRV-1001',
          fullName: 'Tewodros Kassahun',
          phoneNumber: '+251918112233',
          email: 'teddy@kings-taxi.com',
          city: 'Gondar',
          address: 'Piasa Piazza Area',
          licenseNumber: 'ETH-DRV-78451',
          licenseExpiry: new Date('2028-05-15'),
          verificationStatus: 'APPROVED',
          accountStatus: 'ACTIVE',
          availabilityStatus: 'ONLINE',
          gender: 'MALE',
          rating: 4.95,
          totalTrips: 350,
          completedTrips: 345,
          cancelledTrips: 5,
          totalEarnings: 48500,
          createdAt: new Date(),
          updatedAt: new Date(),
          vehicleAssignments: [],
          vehicles: [
            {
              id: 'veh-uuid-1',
              plateNumber: '3-A42159-ET',
              make: 'Toyota',
              vehicleModel: 'Corolla Executive',
            },
          ],
          documents: [],
        },
      ];

      prismaMock.driver.findMany.mockResolvedValueOnce(mockDrivers);
      prismaMock.driver.count.mockResolvedValueOnce(1);

      const result = await adminDriverService.getDrivers({
        search: 'Tewodros',
        verificationStatus: 'APPROVED',
        availabilityStatus: 'ONLINE',
        city: 'Gondar',
        page: 1,
        limit: 10,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].fullName).toBe('Tewodros Kassahun');
      expect(result.items[0].assignedVehiclePlate).toBe('3-A42159-ET');
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(prismaMock.driver.findMany).toHaveBeenCalledTimes(1);
    });

    it('2. calculates comprehensive driver statistics', async () => {
      prismaMock.driver.count
        .mockResolvedValueOnce(45) // total
        .mockResolvedValueOnce(35) // approved
        .mockResolvedValueOnce(5)  // pending
        .mockResolvedValueOnce(2)  // rejected
        .mockResolvedValueOnce(3)  // suspended
        .mockResolvedValueOnce(20) // online
        .mockResolvedValueOnce(8)  // on trip
        .mockResolvedValueOnce(14); // offline

      const stats = await adminDriverService.getDriverStatistics();

      expect(stats.totalDrivers).toBe(45);
      expect(stats.approvedDrivers).toBe(35);
      expect(stats.pendingVerification).toBe(5);
      expect(stats.onlineDrivers).toBe(20);
      expect(stats.driversOnTrip).toBe(8);
      expect(stats.suspendedDrivers).toBe(3);
    });

    it('3. returns assignment candidates who are approved and without assigned vehicle', async () => {
      const mockCandidates = [
        {
          id: 'cand-1',
          driverId: 'DRV-1002',
          fullName: 'Abebe Bikila',
          phoneNumber: '+251911002233',
          city: 'Gondar',
          verificationStatus: 'APPROVED',
          accountStatus: 'ACTIVE',
          availabilityStatus: 'OFFLINE',
          rating: 4.8,
          totalTrips: 120,
          vehicleAssignments: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      prismaMock.driver.findMany.mockResolvedValueOnce(mockCandidates);

      const candidates = await adminDriverService.getAssignmentCandidates();

      expect(candidates).toHaveLength(1);
      expect(candidates[0].fullName).toBe('Abebe Bikila');
      expect(prismaMock.driver.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            verificationStatus: 'APPROVED',
            accountStatus: 'ACTIVE',
          }),
        })
      );
    });

    it('4. registers a new driver with normalized phone and unique driver identifier', async () => {
      const createdDriverRecord = {
        id: 'new-driver-id',
        driverId: 'DRV-8492',
        fullName: 'Solomon Gebre',
        phoneNumber: '+251912345678',
        email: 'solomon@kings-taxi.com',
        city: 'Gondar',
        address: 'Maraki Campus Gate',
        licenseNumber: 'ETH-DRV-99901',
        licenseExpiry: new Date('2029-01-01'),
        verificationStatus: 'PENDING',
        accountStatus: 'ACTIVE',
        availabilityStatus: 'OFFLINE',
        rating: 5.0,
        totalTrips: 0,
        completedTrips: 0,
        cancelledTrips: 0,
        totalEarnings: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        vehicleAssignments: [],
        vehicles: [],
        documents: [],
        statusHistory: [],
        trips: [],
      };

      // 1. check unique phone
      prismaMock.driver.findUnique.mockResolvedValueOnce(null);
      // 2. check unique email
      prismaMock.driver.findUnique.mockResolvedValueOnce(null);
      // 3. create
      prismaMock.driver.create.mockResolvedValueOnce(createdDriverRecord);
      // 4. getDriverById calls findFirst
      prismaMock.driver.findFirst.mockResolvedValueOnce(createdDriverRecord);

      const newDriver = await adminDriverService.createDriver({
        fullName: 'Solomon Gebre',
        phone: '0912 34 56 78',
        email: 'solomon@kings-taxi.com',
        city: 'Gondar',
        address: 'Maraki Campus Gate',
        licenseNumber: 'ETH-DRV-99901',
        licenseExpiry: '2029-01-01',
      });

      expect(newDriver).toBeDefined();
      expect(newDriver.phone).toBe('+251912345678');
      expect(prismaMock.driver.create).toHaveBeenCalledTimes(1);
    });

    it('5. updates driver verification status with audit history', async () => {
      const driverRecord = {
        id: 'drv-uuid-1',
        driverId: 'DRV-1001',
        fullName: 'Tewodros Kassahun',
        phoneNumber: '+251918112233',
        verificationStatus: 'PENDING',
        accountStatus: 'ACTIVE',
        availabilityStatus: 'ONLINE',
        rating: 5.0,
        totalTrips: 0,
        completedTrips: 0,
        cancelledTrips: 0,
        totalEarnings: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        vehicleAssignments: [],
        vehicles: [],
        documents: [],
        statusHistory: [],
        trips: [],
      };

      // 1st findUnique for validation in updateDriverVerification
      prismaMock.driver.findUnique.mockResolvedValueOnce(driverRecord);

      // update inside tx
      prismaMock.driver.update.mockResolvedValueOnce({
        ...driverRecord,
        verificationStatus: 'APPROVED',
      });

      // 2nd findFirst in this.getDriverById(driverId)
      prismaMock.driver.findFirst.mockResolvedValueOnce({
        ...driverRecord,
        verificationStatus: 'APPROVED',
      });

      const updated = await adminDriverService.updateVerificationStatus(
        'drv-uuid-1',
        'APPROVED',
        'Commercial driver documents verified successfully',
        'admin@kings-taxi.com'
      );

      expect(updated.verificationStatus).toBe('APPROVED');
      expect(prismaMock.driver.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'drv-uuid-1' },
          data: expect.objectContaining({
            verificationStatus: 'APPROVED',
            verifiedBy: 'admin@kings-taxi.com',
          }),
        })
      );
    });
  });

  describe('Admin Fleet & Vehicle Management Service', () => {
    it('6. retrieves paginated fleet vehicles list', async () => {
      const mockVehicles = [
        {
          id: 'veh-1',
          plateNumber: '3-A42159-ET',
          vinNumber: 'VIN-TOYOTA-987213',
          make: 'Toyota',
          vehicleModel: 'Corolla Executive',
          manufacturingYear: 2024,
          vehicleColor: 'Royal White',
          vehicleType: 'LUXURY_VIP',
          categoryName: 'Luxury VIP',
          seatingCapacity: 4,
          status: 'ACTIVE',
          mileageKm: 14500,
          fuelType: 'PETROL',
          insuranceExpiry: new Date('2027-08-30'),
          inspectionExpiry: new Date('2027-04-15'),
          isVerified: true,
          verificationStatus: 'VERIFIED',
          createdAt: new Date(),
          updatedAt: new Date(),
          assignments: [],
          maintenances: [],
          driver: {
            id: 'drv-1',
            fullName: 'Tewodros Kassahun',
            phoneNumber: '+251918112233',
          },
          documents: [],
          maintenanceRecords: [],
        },
      ];

      prismaMock.vehicle.findMany.mockResolvedValueOnce(mockVehicles);
      prismaMock.vehicle.count.mockResolvedValueOnce(1);

      const result = await adminVehicleService.getVehicles({
        category: 'LUXURY_VIP',
        status: 'ACTIVE',
        page: 1,
        limit: 10,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].plateNumber).toBe('3-A42159-ET');
      expect(result.items[0].assignedDriverName).toBe('Tewodros Kassahun');
      expect(result.total).toBe(1);
    });

    it('7. calculates comprehensive fleet statistics', async () => {
      prismaMock.vehicle.count
        .mockResolvedValueOnce(30) // total
        .mockResolvedValueOnce(25) // active
        .mockResolvedValueOnce(10) // available
        .mockResolvedValueOnce(15) // assigned
        .mockResolvedValueOnce(3)  // maintenance
        .mockResolvedValueOnce(2)  // pending
        .mockResolvedValueOnce(0); // suspended

      const stats = await adminVehicleService.getFleetStatistics();

      expect(stats.totalVehicles).toBe(30);
      expect(stats.activeVehicles).toBe(25);
      expect(stats.availableVehicles).toBe(10);
      expect(stats.assignedVehicles).toBe(15);
      expect(stats.underMaintenance).toBe(3);
    });

    it('8. executes atomic driver-vehicle pairing with mutual exclusivity', async () => {
      const mockVehicle = {
        id: 'veh-1',
        plateNumber: '3-A42159-ET',
        driverId: null,
        status: 'AVAILABLE',
      };

      const mockDriver = {
        id: 'drv-2',
        fullName: 'Yared Hailu',
        phoneNumber: '+251914556677',
        verificationStatus: 'APPROVED',
        accountStatus: 'ACTIVE',
        vehicleAssignments: [],
      };

      // 1. tx.vehicle.findUnique
      prismaMock.vehicle.findUnique.mockResolvedValueOnce(mockVehicle);
      // 2. tx.driver.findUnique
      prismaMock.driver.findUnique.mockResolvedValueOnce(mockDriver);

      // In transaction:
      prismaMock.vehicleAssignment.updateMany.mockResolvedValueOnce({ count: 0 });
      prismaMock.vehicle.updateMany.mockResolvedValueOnce({ count: 0 });
      prismaMock.vehicleAssignment.create.mockResolvedValueOnce({ id: 'asgn-1' });
      prismaMock.vehicle.update.mockResolvedValueOnce({ ...mockVehicle, driverId: 'drv-2', status: 'ASSIGNED' });
      prismaMock.driver.update.mockResolvedValueOnce({ ...mockDriver, availabilityStatus: 'ONLINE' });
      prismaMock.driverStatusHistory.create.mockResolvedValueOnce({ id: 'hist-1' });

      // Final retrieval in this.getVehicleById(vehicleId)
      prismaMock.vehicle.findUnique.mockResolvedValueOnce({
        ...mockVehicle,
        driverId: 'drv-2',
        driver: mockDriver,
        documents: [],
        maintenanceRecords: [],
        assignments: [],
      });

      const updatedVehicle = await adminVehicleService.assignDriverToVehicle(
        'veh-1',
        'drv-2',
        'admin@kings-taxi.com',
        'Assigned for Gondar historic circuit routes'
      );

      expect(updatedVehicle).toBeDefined();
      expect(prismaMock.vehicleAssignment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            vehicleId: 'veh-1',
            driverId: 'drv-2',
            assignedBy: 'admin@kings-taxi.com',
          }),
        })
      );
      expect(prismaMock.vehicle.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'veh-1' },
          data: expect.objectContaining({
            driverId: 'drv-2',
            status: 'ASSIGNED',
          }),
        })
      );
    });

    it('9. executes atomic driver unassignment releasing both vehicle and operator', async () => {
      const mockAssignedVehicle = {
        id: 'veh-1',
        plateNumber: '3-A42159-ET',
        driverId: 'drv-2',
        status: 'ASSIGNED',
      };

      // tx.vehicle.findUnique
      prismaMock.vehicle.findUnique.mockResolvedValueOnce(mockAssignedVehicle);

      // In transaction:
      prismaMock.vehicleAssignment.updateMany.mockResolvedValueOnce({ count: 1 });
      prismaMock.driver.update.mockResolvedValueOnce({ id: 'drv-2', availabilityStatus: 'OFFLINE' });
      prismaMock.driverStatusHistory.create.mockResolvedValueOnce({ id: 'hist-2' });
      prismaMock.vehicle.update.mockResolvedValueOnce({ ...mockAssignedVehicle, driverId: null, status: 'AVAILABLE' });

      const unassignedVehicle = await adminVehicleService.unassignDriverFromVehicle(
        'veh-1',
        'admin@kings-taxi.com',
        'Vehicle scheduled for routine oil service'
      );

      expect(unassignedVehicle).toBeDefined();
      expect(prismaMock.vehicleAssignment.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            vehicleId: 'veh-1',
            isActive: true,
          },
        })
      );
      expect(prismaMock.vehicle.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'veh-1' },
          data: expect.objectContaining({
            driverId: null,
            status: 'AVAILABLE',
          }),
        })
      );
    });

    it('10. logs maintenance event and sets vehicle status to UNDER_MAINTENANCE', async () => {
      const mockVehicle = {
        id: 'veh-1',
        plateNumber: '3-A42159-ET',
        driverId: null,
        status: 'AVAILABLE',
      };

      prismaMock.vehicle.findUnique.mockResolvedValueOnce(mockVehicle);

      prismaMock.vehicleMaintenance.create.mockResolvedValueOnce({
        id: 'maint-1',
        vehicleId: 'veh-1',
        maintenanceType: 'BRAKE_OVERHAUL',
        description: 'Front disc pad replacement',
        costETB: 3200,
        serviceCenter: 'Gondar Central Garage',
        status: 'IN_PROGRESS',
        startDate: new Date(),
      });

      prismaMock.vehicle.update.mockResolvedValueOnce({
        ...mockVehicle,
        status: 'UNDER_MAINTENANCE',
      });

      const record = await adminVehicleService.addVehicleMaintenance(
        'veh-1',
        {
          maintenanceType: 'BRAKE_OVERHAUL',
          description: 'Front disc pad replacement',
          costETB: 3200,
          serviceCenter: 'Gondar Central Garage',
          serviceDate: new Date().toISOString(),
          status: 'IN_PROGRESS',
        },
        'admin@kings-taxi.com'
      );

      expect(record).toBeDefined();
      expect(record.description).toBe('Front disc pad replacement');
      expect(prismaMock.vehicleMaintenance.create).toHaveBeenCalledTimes(1);
      expect(prismaMock.vehicle.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'veh-1' },
          data: { status: 'UNDER_MAINTENANCE' },
        })
      );
    });

    it('11. registers vehicle with LUXURY_VIP category and normalizes vehicleType', async () => {
      const mockCreated = {
        id: 'veh-luxury-1',
        plateNumber: '3-A99881-ET',
        vinNumber: 'VIN-LUX-001',
        make: 'Mercedes-Benz',
        vehicleModel: 'E-Class',
        manufacturingYear: 2024,
        vehicleColor: 'Black',
        vehicleType: 'LUXURY_VIP',
        categoryName: 'Luxury VIP',
        seatingCapacity: 4,
        status: 'AVAILABLE',
        verificationStatus: 'PENDING',
        isActive: true,
        fuelType: 'PETROL',
        transmission: 'AUTOMATIC',
        mileageKm: 5000,
        imageUrl: null,
        insurancePolicyNumber: null,
        insuranceExpiry: null,
        inspectionExpiry: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        driver: null,
        assignments: [],
        documents: [],
        maintenances: [],
        trips: [],
      };

      // 1. plate uniqueness
      prismaMock.vehicle.findUnique.mockResolvedValueOnce(null);
      // 2. vin uniqueness
      prismaMock.vehicle.findUnique.mockResolvedValueOnce(null);
      // 3. tx.vehicle.create
      prismaMock.vehicle.create.mockResolvedValueOnce(mockCreated);
      // 4. getVehicleById
      prismaMock.vehicle.findUnique.mockResolvedValueOnce(mockCreated);

      const vehicle = await adminVehicleService.createVehicle(
        {
          plateNumber: '3-A99881-ET',
          vinNumber: 'VIN-LUX-001',
          make: 'Mercedes-Benz',
          model: 'E-Class',
          year: 2024,
          color: 'Black',
          category: 'LUXURY_VIP' as any,
          capacity: 4,
        },
        'admin@kings-taxi.com'
      );

      expect(vehicle).toBeDefined();
      expect(vehicle.category).toBe('LUXURY_VIP');
      expect(vehicle.categoryName).toBe('Luxury VIP');
      expect(prismaMock.vehicle.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            vehicleType: 'LUXURY_VIP',
            categoryName: 'Luxury VIP',
          }),
        })
      );
    });

    it('12. normalizes legacy synonym LUXURY_EXECUTIVE to LUXURY_VIP', async () => {
      const mockCreated = {
        id: 'veh-synonym-1',
        plateNumber: '3-A99882-ET',
        vinNumber: null,
        make: 'Lexus',
        vehicleModel: 'ES 350',
        manufacturingYear: 2023,
        vehicleColor: 'Silver',
        vehicleType: 'LUXURY_VIP',
        categoryName: 'Luxury VIP',
        seatingCapacity: 4,
        status: 'AVAILABLE',
        verificationStatus: 'PENDING',
        isActive: true,
        fuelType: 'PETROL',
        transmission: 'AUTOMATIC',
        mileageKm: 12000,
        imageUrl: null,
        insurancePolicyNumber: null,
        insuranceExpiry: null,
        inspectionExpiry: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        driver: null,
        assignments: [],
        documents: [],
        maintenances: [],
        trips: [],
      };

      // 1. plate uniqueness
      prismaMock.vehicle.findUnique.mockResolvedValueOnce(null);
      // 2. tx.vehicle.create
      prismaMock.vehicle.create.mockResolvedValueOnce(mockCreated);
      // 3. getVehicleById
      prismaMock.vehicle.findUnique.mockResolvedValueOnce(mockCreated);

      const vehicle = await adminVehicleService.createVehicle(
        {
          plateNumber: '3-A99882-ET',
          make: 'Lexus',
          model: 'ES 350',
          category: 'LUXURY_EXECUTIVE' as any,
        },
        'admin@kings-taxi.com'
      );

      expect(vehicle).toBeDefined();
      expect(vehicle.category).toBe('LUXURY_VIP');
      expect(prismaMock.vehicle.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            vehicleType: 'LUXURY_VIP',
          }),
        })
      );
    });

    it('13. rejects unknown vehicle category with HTTP 400 validation error', async () => {
      await expect(
        adminVehicleService.createVehicle(
          {
            plateNumber: '3-A99883-ET',
            model: 'Flying Car',
            category: 'HOVERCRAFT_SUBMARINE' as any,
          },
          'admin@kings-taxi.com'
        )
      ).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringContaining('Invalid vehicle category "HOVERCRAFT_SUBMARINE"'),
      });
    });
  });
});
