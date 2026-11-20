-- ==============================================================================
-- Kings Taxi — Migration: Add Admin Users, Approval Workflow, and Mandatory Password Change
-- ==============================================================================

-- 1. AlterEnum HotelBookingStatus
ALTER TYPE "HotelBookingStatus" ADD VALUE IF NOT EXISTS 'DECLINED';
ALTER TYPE "HotelBookingStatus" ADD VALUE IF NOT EXISTS 'CHECKED_IN';
ALTER TYPE "HotelBookingStatus" ADD VALUE IF NOT EXISTS 'CHECKED_OUT';

-- 2. AlterEnum HeritageTourBookingStatus
ALTER TYPE "HeritageTourBookingStatus" ADD VALUE IF NOT EXISTS 'PENDING';
ALTER TYPE "HeritageTourBookingStatus" ADD VALUE IF NOT EXISTS 'DECLINED';
ALTER TYPE "HeritageTourBookingStatus" ADD VALUE IF NOT EXISTS 'UPCOMING';

-- 3. CreateTable admin_users
CREATE TABLE IF NOT EXISTS "admin_users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "full_name" VARCHAR(128) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone_number" VARCHAR(32),
    "password_hash" VARCHAR(255) NOT NULL,
    "password_salt" VARCHAR(64),
    "role" "UserRoleType" NOT NULL DEFAULT 'SUPER_ADMIN',
    "avatar_url" VARCHAR(512),
    "department" VARCHAR(128),
    "account_status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "must_change_password" BOOLEAN NOT NULL DEFAULT false,
    "last_login_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- Unique index on email
CREATE UNIQUE INDEX IF NOT EXISTS "admin_users_email_key" ON "admin_users"("email");
CREATE INDEX IF NOT EXISTS "admin_users_email_idx" ON "admin_users"("email");
CREATE INDEX IF NOT EXISTS "admin_users_role_account_status_idx" ON "admin_users"("role", "account_status");

-- 4. AlterTable refresh_tokens
ALTER TABLE "refresh_tokens" ADD COLUMN IF NOT EXISTS "admin_id" UUID;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'refresh_tokens_admin_id_fkey') THEN
        ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- 5. AlterTable hotel_bookings
ALTER TABLE "hotel_bookings" ADD COLUMN IF NOT EXISTS "reviewed_by_admin_id" UUID;
ALTER TABLE "hotel_bookings" ADD COLUMN IF NOT EXISTS "reviewed_at" TIMESTAMPTZ(6);
ALTER TABLE "hotel_bookings" ADD COLUMN IF NOT EXISTS "decline_reason" TEXT;
ALTER TABLE "hotel_bookings" ADD COLUMN IF NOT EXISTS "admin_review_note" TEXT;

-- 6. AlterTable heritage_tour_bookings
ALTER TABLE "heritage_tour_bookings" ADD COLUMN IF NOT EXISTS "reviewed_by_admin_id" UUID;
ALTER TABLE "heritage_tour_bookings" ADD COLUMN IF NOT EXISTS "reviewed_at" TIMESTAMPTZ(6);
ALTER TABLE "heritage_tour_bookings" ADD COLUMN IF NOT EXISTS "confirmed_at" TIMESTAMPTZ(6);
ALTER TABLE "heritage_tour_bookings" ADD COLUMN IF NOT EXISTS "decline_reason" TEXT;
ALTER TABLE "heritage_tour_bookings" ADD COLUMN IF NOT EXISTS "admin_review_note" TEXT;
