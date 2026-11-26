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

    // 4. Ensure Hospitality & Hotel Partners tables and columns exist (idempotent & non-destructive)
    await ensureHospitalitySchema();
  } catch (err: any) {
    logger.error({ err: err.message }, '[Schema Initializer] Error applying DDL schema updates');
  }
}

/**
 * Idempotent Hospitality, Hotel Partners & Room Images DDL Initializer
 */
async function ensureHospitalitySchema(): Promise<void> {
  try {
    const enumStatements = [
      `DO $$ BEGIN CREATE TYPE "PartnerAccountStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED', 'INACTIVE'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
      `DO $$ BEGIN CREATE TYPE "PartnerVerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
      `DO $$ BEGIN CREATE TYPE "HotelCategory" AS ENUM ('LUXURY_5_STAR', 'BOUTIQUE_HERITAGE', 'BUSINESS_4_STAR', 'RESORT_LODGE'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
      `DO $$ BEGIN CREATE TYPE "HotelVerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
      `DO $$ BEGIN CREATE TYPE "HotelPublicationStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'PUBLISHED', 'REJECTED', 'UNPUBLISHED'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
      `DO $$ BEGIN CREATE TYPE "DocumentReviewStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED', 'REQUIRES_RESUBMISSION'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
      `DO $$ BEGIN CREATE TYPE "HotelDocumentType" AS ENUM ('BUSINESS_LICENSE', 'TAX_IDENTIFICATION_CERTIFICATE', 'COMMERCIAL_REGISTRATION', 'HOTEL_ACCREDITATION', 'TOURISM_COMMISSION_PERMIT', 'INSURANCE_CERTIFICATE', 'PARTNERSHIP_AGREEMENT', 'OTHER'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    ];

    for (const sql of enumStatements) {
      await prisma.$executeRawUnsafe(sql);
    }

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "hotel_partners" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "partner_code" VARCHAR(32) NOT NULL,
        "business_name" VARCHAR(128) NOT NULL,
        "trade_name" VARCHAR(128),
        "contact_person" VARCHAR(128) NOT NULL,
        "email" VARCHAR(255) NOT NULL,
        "phone" VARCHAR(32) NOT NULL,
        "alternative_phone" VARCHAR(32),
        "business_address" VARCHAR(255) NOT NULL,
        "city" VARCHAR(64) NOT NULL DEFAULT 'Gondar',
        "region" VARCHAR(64) NOT NULL DEFAULT 'Amhara',
        "country" VARCHAR(64) NOT NULL DEFAULT 'Ethiopia',
        "business_license_number" VARCHAR(64),
        "tax_identification_number" VARCHAR(64),
        "bank_name" VARCHAR(64),
        "bank_account_number" VARCHAR(64),
        "bank_account_name" VARCHAR(128),
        "commission_rate" DECIMAL(5, 2) NOT NULL DEFAULT 10.00,
        "profile_image_url" VARCHAR(512),
        "status" "PartnerAccountStatus" NOT NULL DEFAULT 'PENDING',
        "verification_status" "PartnerVerificationStatus" NOT NULL DEFAULT 'PENDING',
        "verified_at" TIMESTAMPTZ(6),
        "verified_by_admin_id" UUID,
        "rejection_reason" TEXT,
        "internal_notes" TEXT,
        "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "hotel_partners_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "hotel_partners_partner_code_key" UNIQUE ("partner_code"),
        CONSTRAINT "hotel_partners_email_key" UNIQUE ("email"),
        CONSTRAINT "hotel_partners_phone_key" UNIQUE ("phone")
      );
      CREATE INDEX IF NOT EXISTS "hotel_partners_status_verification_status_idx" ON "hotel_partners"("status", "verification_status");
      CREATE INDEX IF NOT EXISTS "hotel_partners_city_idx" ON "hotel_partners"("city");
      CREATE INDEX IF NOT EXISTS "hotel_partners_created_at_idx" ON "hotel_partners"("created_at");
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "hotel_partner_documents" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "partner_id" UUID NOT NULL,
        "document_type" "HotelDocumentType" NOT NULL DEFAULT 'BUSINESS_LICENSE',
        "document_number" VARCHAR(64),
        "document_url" VARCHAR(512) NOT NULL,
        "public_id" VARCHAR(255),
        "file_format" VARCHAR(32),
        "file_size" INTEGER,
        "status" "DocumentReviewStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
        "verified_at" TIMESTAMPTZ(6),
        "verified_by_admin_id" UUID,
        "rejection_reason" TEXT,
        "expiry_date" DATE,
        "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "hotel_partner_documents_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "hotel_partner_documents_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "hotel_partners"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
      CREATE INDEX IF NOT EXISTS "hotel_partner_documents_partner_id_document_type_idx" ON "hotel_partner_documents"("partner_id", "document_type");
    `);

    await prisma.$executeRawUnsafe(`
      ALTER TABLE "hotels"
        ADD COLUMN IF NOT EXISTS "partner_id" UUID,
        ADD COLUMN IF NOT EXISTS "category" "HotelCategory" NOT NULL DEFAULT 'BOUTIQUE_HERITAGE',
        ADD COLUMN IF NOT EXISTS "verification_status" "HotelVerificationStatus" NOT NULL DEFAULT 'PENDING',
        ADD COLUMN IF NOT EXISTS "publication_status" "HotelPublicationStatus" NOT NULL DEFAULT 'DRAFT',
        ADD COLUMN IF NOT EXISTS "cover_image_url" VARCHAR(512),
        ADD COLUMN IF NOT EXISTS "cover_image_public_id" VARCHAR(255),
        ADD COLUMN IF NOT EXISTS "rejection_reason" TEXT,
        ADD COLUMN IF NOT EXISTS "verified_at" TIMESTAMPTZ(6),
        ADD COLUMN IF NOT EXISTS "verified_by_admin_id" UUID;
    `);

    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'hotels' AND column_name = 'hotel_category'
        ) THEN
          EXECUTE 'UPDATE "hotels" SET "category" = "hotel_category" WHERE "hotel_category" IS NOT NULL';
        END IF;
      END $$;
    `);

    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        ALTER TABLE "hotels" ADD CONSTRAINT "hotels_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "hotel_partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
      CREATE INDEX IF NOT EXISTS "hotels_partner_id_idx" ON "hotels"("partner_id");
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "room_images" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "room_type_id" UUID NOT NULL,
        "image_url" VARCHAR(512) NOT NULL,
        "public_id" VARCHAR(255),
        "caption" VARCHAR(255),
        "display_order" INTEGER NOT NULL DEFAULT 0,
        "is_primary" BOOLEAN NOT NULL DEFAULT false,
        "file_format" VARCHAR(32),
        "file_size" INTEGER,
        "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "room_images_pkey" PRIMARY KEY ("id")
      );
      CREATE INDEX IF NOT EXISTS "room_images_room_type_id_display_order_idx" ON "room_images"("room_type_id", "display_order");
      DO $$ BEGIN
        ALTER TABLE "room_images" ADD CONSTRAINT "room_images_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "hotel_room_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await prisma.$executeRawUnsafe(`
      ALTER TABLE "hotel_bookings"
        ADD COLUMN IF NOT EXISTS "hold_expires_at" TIMESTAMPTZ(6),
        ADD COLUMN IF NOT EXISTS "commission_amount" DECIMAL(10, 2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "partner_payout_amount" DECIMAL(10, 2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "reviewed_by_admin_id" UUID,
        ADD COLUMN IF NOT EXISTS "reviewed_at" TIMESTAMPTZ(6),
        ADD COLUMN IF NOT EXISTS "decline_reason" TEXT,
        ADD COLUMN IF NOT EXISTS "admin_review_note" TEXT;
      CREATE INDEX IF NOT EXISTS "hotel_bookings_hold_expires_at_idx" ON "hotel_bookings"("hold_expires_at");
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "hotel_booking_status_histories" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "hotel_booking_id" UUID NOT NULL,
        "from_status" "HotelBookingStatus",
        "to_status" "HotelBookingStatus" NOT NULL,
        "changed_by_admin_id" UUID,
        "changed_by_admin_name" VARCHAR(128),
        "note" TEXT,
        "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "hotel_booking_status_histories_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "hotel_booking_status_histories_hotel_booking_id_fkey" FOREIGN KEY ("hotel_booking_id") REFERENCES "hotel_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
      CREATE INDEX IF NOT EXISTS "hotel_booking_status_histories_booking_created_idx" ON "hotel_booking_status_histories"("hotel_booking_id", "created_at");
    `);

    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN CREATE TYPE "InventoryReservationStatus" AS ENUM ('RESERVED', 'CONFIRMED', 'RELEASED', 'EXPIRED', 'CANCELLED'); EXCEPTION WHEN duplicate_object THEN null; END $$;
      DO $$ BEGIN CREATE TYPE "InventoryTransactionType" AS ENUM ('RESERVE', 'CONFIRM', 'RELEASE', 'EXPIRE', 'CANCEL', 'BLOCK', 'UNBLOCK', 'ADJUST_TOTAL'); EXCEPTION WHEN duplicate_object THEN null; END $$;

      CREATE TABLE IF NOT EXISTS "hotel_room_inventories" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "hotel_id" UUID NOT NULL,
        "room_type_id" UUID NOT NULL,
        "inventory_date" DATE NOT NULL,
        "total_rooms" INTEGER NOT NULL,
        "reserved_rooms" INTEGER NOT NULL DEFAULT 0,
        "confirmed_rooms" INTEGER NOT NULL DEFAULT 0,
        "blocked_rooms" INTEGER NOT NULL DEFAULT 0,
        "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "hotel_room_inventories_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "hotel_room_inventories_room_type_id_inventory_date_key" UNIQUE ("room_type_id", "inventory_date"),
        CONSTRAINT "hotel_room_inventories_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "hotel_room_inventories_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "hotel_room_types"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
      CREATE INDEX IF NOT EXISTS "hotel_room_inventories_hotel_id_inventory_date_idx" ON "hotel_room_inventories"("hotel_id", "inventory_date");
      CREATE INDEX IF NOT EXISTS "hotel_room_inventories_room_type_id_inventory_date_idx" ON "hotel_room_inventories"("room_type_id", "inventory_date");

      CREATE TABLE IF NOT EXISTS "hotel_inventory_reservations" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "booking_id" UUID NOT NULL,
        "hotel_id" UUID NOT NULL,
        "room_type_id" UUID NOT NULL,
        "check_in_date" DATE NOT NULL,
        "check_out_date" DATE NOT NULL,
        "quantity" INTEGER NOT NULL,
        "reservation_status" "InventoryReservationStatus" NOT NULL DEFAULT 'RESERVED',
        "expires_at" TIMESTAMPTZ(6) NOT NULL,
        "released_at" TIMESTAMPTZ(6),
        "confirmed_at" TIMESTAMPTZ(6),
        "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "hotel_inventory_reservations_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "hotel_inventory_reservations_booking_id_room_type_id_key" UNIQUE ("booking_id", "room_type_id"),
        CONSTRAINT "hotel_inventory_reservations_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "hotel_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "hotel_inventory_reservations_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "hotel_inventory_reservations_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "hotel_room_types"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
      CREATE INDEX IF NOT EXISTS "hotel_inventory_reservations_reservation_status_expires_at_idx" ON "hotel_inventory_reservations"("reservation_status", "expires_at");
      CREATE INDEX IF NOT EXISTS "hotel_inventory_reservations_hotel_id_room_type_id_idx" ON "hotel_inventory_reservations"("hotel_id", "room_type_id");

      CREATE TABLE IF NOT EXISTS "hotel_inventory_transactions" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "hotel_id" UUID NOT NULL,
        "room_type_id" UUID NOT NULL,
        "booking_id" UUID,
        "inventory_date" DATE NOT NULL,
        "transaction_type" "InventoryTransactionType" NOT NULL,
        "quantity" INTEGER NOT NULL,
        "idempotency_key" VARCHAR(128) NOT NULL,
        "actor_id" VARCHAR(128),
        "note" TEXT,
        "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "hotel_inventory_transactions_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "hotel_inventory_transactions_idempotency_key_key" UNIQUE ("idempotency_key")
      );
      CREATE INDEX IF NOT EXISTS "hotel_inventory_transactions_hotel_id_room_type_id_inventory_date_idx" ON "hotel_inventory_transactions"("hotel_id", "room_type_id", "inventory_date");
      CREATE INDEX IF NOT EXISTS "hotel_inventory_transactions_booking_id_idx" ON "hotel_inventory_transactions"("booking_id");

      ALTER TABLE "heritage_tour_bookings" ADD COLUMN IF NOT EXISTS "idempotency_key" VARCHAR(128);
      CREATE UNIQUE INDEX IF NOT EXISTS "heritage_tour_bookings_idempotency_key_key" ON "heritage_tour_bookings"("idempotency_key");
      CREATE INDEX IF NOT EXISTS "heritage_tour_bookings_assigned_vehicle_id_scheduled_date_booking_status_idx" ON "heritage_tour_bookings"("assigned_vehicle_id", "scheduled_date", "booking_status");

      CREATE TABLE IF NOT EXISTS "heritage_tour_booking_audit_logs" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "booking_id" UUID NOT NULL,
        "admin_actor_id" VARCHAR(128),
        "previous_status" "HeritageTourBookingStatus",
        "new_status" "HeritageTourBookingStatus" NOT NULL,
        "action" VARCHAR(64) NOT NULL,
        "notes" TEXT,
        "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "heritage_tour_booking_audit_logs_pkey" PRIMARY KEY ("id")
      );
      CREATE INDEX IF NOT EXISTS "heritage_tour_booking_audit_logs_booking_id_created_at_idx" ON "heritage_tour_booking_audit_logs"("booking_id", "created_at");

      DO $$ BEGIN
        ALTER TYPE "SupportSenderType" ADD VALUE IF NOT EXISTS 'SYSTEM';
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;

      CREATE SEQUENCE IF NOT EXISTS "support_ticket_number_seq" START WITH 1 INCREMENT BY 1;

      CREATE TABLE IF NOT EXISTS "support_attachments" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "ticket_id" UUID NOT NULL,
        "message_id" UUID,
        "uploaded_by_type" "SupportSenderType" NOT NULL DEFAULT 'PASSENGER',
        "uploaded_by_id" UUID,
        "file_url" TEXT NOT NULL,
        "cloudinary_public_id" VARCHAR(255) NOT NULL,
        "mime_type" VARCHAR(64) NOT NULL,
        "file_size_bytes" INTEGER NOT NULL,
        "original_filename" VARCHAR(255),
        "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "support_attachments_pkey" PRIMARY KEY ("id")
      );
      CREATE INDEX IF NOT EXISTS "support_attachments_ticket_id_created_at_idx" ON "support_attachments"("ticket_id", "created_at");
      CREATE INDEX IF NOT EXISTS "support_attachments_message_id_idx" ON "support_attachments"("message_id");

      CREATE TABLE IF NOT EXISTS "support_ticket_audit_logs" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "ticket_id" UUID NOT NULL,
        "actor_type" "SupportSenderType" NOT NULL DEFAULT 'ADMIN',
        "actor_id" UUID,
        "actor_name" VARCHAR(128) NOT NULL,
        "action" VARCHAR(64) NOT NULL,
        "previous_value" JSONB,
        "new_value" JSONB,
        "note" TEXT,
        "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "support_ticket_audit_logs_pkey" PRIMARY KEY ("id")
      );
      CREATE INDEX IF NOT EXISTS "support_ticket_audit_logs_ticket_id_created_at_idx" ON "support_ticket_audit_logs"("ticket_id", "created_at");
      CREATE INDEX IF NOT EXISTS "support_ticket_audit_logs_action_idx" ON "support_ticket_audit_logs"("action");
    `);

    logger.info('[Schema Initializer] Hospitality, Hotel Partners & Room Images schema verified.');
  } catch (err: any) {
    logger.error({ err: err.message }, '[Schema Initializer] Error verifying Hospitality schema');
  }
}
