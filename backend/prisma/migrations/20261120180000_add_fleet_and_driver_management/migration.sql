-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "VehicleOperationalStatus" AS ENUM ('ACTIVE', 'AVAILABLE', 'ASSIGNED', 'ON_TRIP', 'UNDER_MAINTENANCE', 'INACTIVE', 'SUSPENDED', 'RETIRED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable Driver
ALTER TABLE "drivers" 
ADD COLUMN IF NOT EXISTS "account_status" "AccountStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
ADD COLUMN IF NOT EXISTS "license_number" VARCHAR(64),
ADD COLUMN IF NOT EXISTS "license_expiry" DATE,
ADD COLUMN IF NOT EXISTS "city" VARCHAR(64) NOT NULL DEFAULT 'Gondar',
ADD COLUMN IF NOT EXISTS "address" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "date_of_birth" DATE,
ADD COLUMN IF NOT EXISTS "gender" VARCHAR(16),
ADD COLUMN IF NOT EXISTS "emergency_contact_name" VARCHAR(128),
ADD COLUMN IF NOT EXISTS "emergency_contact_phone" VARCHAR(32),
ADD COLUMN IF NOT EXISTS "emergency_contact_relationship" VARCHAR(64),
ADD COLUMN IF NOT EXISTS "rejection_reason" TEXT,
ADD COLUMN IF NOT EXISTS "suspension_reason" TEXT,
ADD COLUMN IF NOT EXISTS "suspended_at" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS "verified_at" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS "verified_by" VARCHAR(128);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "drivers_account_status_idx" ON "drivers"("account_status");
CREATE INDEX IF NOT EXISTS "drivers_email_idx" ON "drivers"("email");

-- AlterTable Vehicle
ALTER TABLE "vehicles" 
ALTER COLUMN "driver_id" DROP NOT NULL,
ADD COLUMN IF NOT EXISTS "vin_number" VARCHAR(64),
ADD COLUMN IF NOT EXISTS "make" VARCHAR(64) NOT NULL DEFAULT 'Toyota',
ADD COLUMN IF NOT EXISTS "manufacturing_year" SMALLINT NOT NULL DEFAULT 2022,
ADD COLUMN IF NOT EXISTS "category_name" VARCHAR(64),
ADD COLUMN IF NOT EXISTS "status" "VehicleOperationalStatus" NOT NULL DEFAULT 'AVAILABLE',
ADD COLUMN IF NOT EXISTS "fuel_type" VARCHAR(32) NOT NULL DEFAULT 'PETROL',
ADD COLUMN IF NOT EXISTS "transmission" VARCHAR(32) NOT NULL DEFAULT 'AUTOMATIC',
ADD COLUMN IF NOT EXISTS "mileage_km" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "image_url" VARCHAR(512),
ADD COLUMN IF NOT EXISTS "insurance_policy_number" VARCHAR(64),
ADD COLUMN IF NOT EXISTS "insurance_expiry" DATE,
ADD COLUMN IF NOT EXISTS "inspection_expiry" DATE,
ADD COLUMN IF NOT EXISTS "rejection_reason" TEXT,
ADD COLUMN IF NOT EXISTS "suspension_reason" TEXT,
ADD COLUMN IF NOT EXISTS "verified_at" TIMESTAMPTZ(6),
ADD COLUMN IF NOT EXISTS "verified_by" VARCHAR(128);

-- Update foreign key on vehicles to SET NULL when driver deleted
ALTER TABLE "vehicles" DROP CONSTRAINT IF EXISTS "vehicles_driver_id_fkey";
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "vehicles_vin_number_key" ON "vehicles"("vin_number");
CREATE INDEX IF NOT EXISTS "vehicles_status_idx" ON "vehicles"("status");
CREATE INDEX IF NOT EXISTS "vehicles_created_at_idx" ON "vehicles"("created_at");

-- CreateTable VehicleAssignment
CREATE TABLE IF NOT EXISTS "vehicle_assignments" (
    "id" UUID NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "driver_id" UUID NOT NULL,
    "assigned_by" VARCHAR(128),
    "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassigned_by" VARCHAR(128),
    "unassigned_at" TIMESTAMPTZ(6),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_assignments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "vehicle_assignments_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "vehicle_assignments_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "vehicle_assignments_vehicle_id_is_active_idx" ON "vehicle_assignments"("vehicle_id", "is_active");
CREATE INDEX IF NOT EXISTS "vehicle_assignments_driver_id_is_active_idx" ON "vehicle_assignments"("driver_id", "is_active");
CREATE INDEX IF NOT EXISTS "vehicle_assignments_assigned_at_idx" ON "vehicle_assignments"("assigned_at");

-- CreateTable VehicleMaintenance
CREATE TABLE IF NOT EXISTS "vehicle_maintenances" (
    "id" UUID NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "maintenance_type" VARCHAR(64) NOT NULL,
    "description" TEXT NOT NULL,
    "service_center" VARCHAR(128),
    "cost_etb" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "mileage_km" DOUBLE PRECISION,
    "service_date" DATE NOT NULL,
    "next_service_date" DATE,
    "status" VARCHAR(32) NOT NULL DEFAULT 'COMPLETED',
    "performed_by" VARCHAR(128),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_maintenances_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "vehicle_maintenances_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "vehicle_maintenances_vehicle_id_idx" ON "vehicle_maintenances"("vehicle_id");
CREATE INDEX IF NOT EXISTS "vehicle_maintenances_service_date_idx" ON "vehicle_maintenances"("service_date");

-- CreateTable DriverStatusHistory
CREATE TABLE IF NOT EXISTS "driver_status_history" (
    "id" UUID NOT NULL,
    "driver_id" UUID NOT NULL,
    "status_type" VARCHAR(32) NOT NULL,
    "from_status" VARCHAR(64),
    "to_status" VARCHAR(64) NOT NULL,
    "reason" TEXT,
    "changed_by" VARCHAR(128),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "driver_status_history_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "driver_status_history_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "driver_status_history_driver_id_idx" ON "driver_status_history"("driver_id");
CREATE INDEX IF NOT EXISTS "driver_status_history_created_at_idx" ON "driver_status_history"("created_at");
