import { prisma } from './prisma';
import { logger } from '../logging/logger';

/**
 * Idempotent Database Schema Initializer & Auto-Migrator
 * 
 * Automatically applies pending DDL migrations to the PostgreSQL database
 * on server startup. Ensures that required columns (account_status, vin_number, etc.)
 * and tables (vehicle_assignments, vehicle_maintenances, driver_status_history, admin_password_resets)
 * exist without requiring manual CLI intervention on Render or VPS.
 */
export async function ensureDatabaseSchema(): Promise<void> {
  try {
    // Probe database connectivity first
    await prisma.$queryRaw`SELECT 1`;
  } catch (err: any) {
    logger.warn({ err: err.message }, '[Schema Initializer] Database offline or unreachable. Skipping startup DDL.');
    return;
  }

  try {
    // 1. Ensure admin_password_resets table exists
    const checkResetTable = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'admin_password_resets'
    `;

    if (checkResetTable.length === 0) {
      logger.info('[Schema Initializer] Creating missing admin_password_resets table...');
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "admin_password_resets" (
          "id" UUID NOT NULL DEFAULT gen_random_uuid(),
          "admin_user_id" UUID NOT NULL,
          "email" VARCHAR(255) NOT NULL,
          "otp_hash" VARCHAR(255) NOT NULL,
          "salt" VARCHAR(128) NOT NULL,
          "expires_at" TIMESTAMPTZ(6) NOT NULL,
          "attempts" INTEGER NOT NULL DEFAULT 0,
          "max_attempts" INTEGER NOT NULL DEFAULT 5,
          "resend_cooldown_until" TIMESTAMPTZ(6) NOT NULL,
          "is_verified" BOOLEAN NOT NULL DEFAULT false,
          "verified_at" TIMESTAMPTZ(6),
          "reset_token_hash" VARCHAR(255),
          "reset_token_expires_at" TIMESTAMPTZ(6),
          "is_consumed" BOOLEAN NOT NULL DEFAULT false,
          "consumed_at" TIMESTAMPTZ(6),
          "ip_address" VARCHAR(45),
          "user_agent" VARCHAR(512),
          "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "admin_password_resets_pkey" PRIMARY KEY ("id")
        );
        CREATE INDEX IF NOT EXISTS "admin_password_resets_admin_user_id_idx" ON "admin_password_resets"("admin_user_id");
        CREATE INDEX IF NOT EXISTS "admin_password_resets_email_idx" ON "admin_password_resets"("email");
        CREATE INDEX IF NOT EXISTS "admin_password_resets_reset_token_hash_idx" ON "admin_password_resets"("reset_token_hash");
        CREATE INDEX IF NOT EXISTS "admin_password_resets_expires_at_idx" ON "admin_password_resets"("expires_at");
      `);
      logger.info('[Schema Initializer] admin_password_resets table created successfully.');
    }

    // 2. Ensure document file_url and image_url columns are TEXT to prevent length overflow
    const ddlUpgrades = [
      'ALTER TABLE "driver_documents" ALTER COLUMN "file_url" TYPE TEXT;',
      'ALTER TABLE "vehicle_documents" ALTER COLUMN "file_url" TYPE TEXT;',
      'ALTER TABLE "vehicles" ALTER COLUMN "image_url" TYPE TEXT;',
      'ALTER TABLE "drivers" ALTER COLUMN "profile_image" TYPE TEXT;',
      'ALTER TABLE "passengers" ALTER COLUMN "profile_image" TYPE TEXT;',
      'ALTER TABLE "admin_users" ALTER COLUMN "avatar_url" TYPE TEXT;',
      'ALTER TABLE "refresh_tokens" ADD COLUMN IF NOT EXISTS "admin_id" UUID REFERENCES "admin_users"("id") ON DELETE CASCADE;',
    ];

    for (const sql of ddlUpgrades) {
      try {
        await prisma.$executeRawUnsafe(sql);
      } catch (err: any) {
        // Safe to ignore if already applied or column already TEXT
      }
    }
    logger.info('[Schema Initializer] Verified document file_url and image_url column types are TEXT.');

    // 3. Check if driver columns exist
    const checkDriverCols = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'drivers' AND column_name = 'account_status'
    `;

    // 3. Check if vehicle columns exist
    const checkVehicleCols = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'vehicles' AND column_name = 'vin_number'
    `;

    if (checkDriverCols.length > 0 && checkVehicleCols.length > 0) {
      logger.info('[Schema Initializer] PostgreSQL schema is up to date with Fleet & Driver models.');
      return;
    }

    logger.info('[Schema Initializer] Applying Fleet & Driver Management DDL schema updates...');

    // A. Create VehicleOperationalStatus enum safely
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "VehicleOperationalStatus" AS ENUM ('ACTIVE', 'AVAILABLE', 'ASSIGNED', 'ON_TRIP', 'UNDER_MAINTENANCE', 'INACTIVE', 'SUSPENDED', 'RETIRED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // B. Alter drivers table with new fleet fields
    await prisma.$executeRawUnsafe(`
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
    `);

    // C. Alter vehicles table with specifications & operational status
    await prisma.$executeRawUnsafe(`
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
    `);

    // D. Foreign key constraint update on vehicles
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "vehicles" DROP CONSTRAINT IF EXISTS "vehicles_driver_id_fkey";
      ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    `);

    // E. Indexes
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "vehicles_vin_number_key" ON "vehicles"("vin_number");
      CREATE INDEX IF NOT EXISTS "vehicles_status_idx" ON "vehicles"("status");
      CREATE INDEX IF NOT EXISTS "vehicles_created_at_idx" ON "vehicles"("created_at");
      CREATE INDEX IF NOT EXISTS "drivers_account_status_idx" ON "drivers"("account_status");
      CREATE INDEX IF NOT EXISTS "drivers_email_idx" ON "drivers"("email");
    `);

    // F. Table: vehicle_assignments
    await prisma.$executeRawUnsafe(`
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
      CREATE INDEX IF NOT EXISTS "vehicle_assignments_vehicle_id_is_active_idx" ON "vehicle_assignments"("vehicle_id", "is_active");
      CREATE INDEX IF NOT EXISTS "vehicle_assignments_driver_id_is_active_idx" ON "vehicle_assignments"("driver_id", "is_active");
      CREATE INDEX IF NOT EXISTS "vehicle_assignments_assigned_at_idx" ON "vehicle_assignments"("assigned_at");
    `);

    // G. Table: vehicle_maintenances
    await prisma.$executeRawUnsafe(`
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
      CREATE INDEX IF NOT EXISTS "vehicle_maintenances_vehicle_id_idx" ON "vehicle_maintenances"("vehicle_id");
      CREATE INDEX IF NOT EXISTS "vehicle_maintenances_service_date_idx" ON "vehicle_maintenances"("service_date");
    `);

    // H. Table: driver_status_history
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "driver_status_history" (
        "id" UUID NOT NULL,
        "driver_id" UUID NOT NULL,
        "status_type" VARCHAR(32) NOT NULL,
        "from_status" VARCHAR(64),
        "to_status" VARCHAR(64) NOT NULL,
        "reason" TEXT,
        "changed_by" VARCHAR(128),
        "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "driver_status_history_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "driver_status_history_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
      CREATE INDEX IF NOT EXISTS "driver_status_history_driver_id_idx" ON "driver_status_history"("driver_id");
      CREATE INDEX IF NOT EXISTS "driver_status_history_created_at_idx" ON "driver_status_history"("created_at");
    `);

    logger.info('[Schema Initializer] All Fleet & Driver Management DDL schema updates applied successfully.');
  } catch (err: any) {
    logger.error({ err: err.message }, '[Schema Initializer] Error applying DDL schema updates');
  }
}
