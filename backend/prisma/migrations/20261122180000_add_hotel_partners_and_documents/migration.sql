-- Safe and Non-Destructive Migration: Add Hotel Partners, Documents, Verification & Booking Status History

-- 1. Create Enums Safely
DO $$ BEGIN
    CREATE TYPE "PartnerAccountStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED', 'INACTIVE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "PartnerVerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "HotelCategory" AS ENUM ('LUXURY_5_STAR', 'BOUTIQUE_HERITAGE', 'BUSINESS_4_STAR', 'RESORT_LODGE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "HotelVerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "HotelPublicationStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'PUBLISHED', 'REJECTED', 'UNPUBLISHED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "HotelDocumentType" AS ENUM (
        'BUSINESS_LICENSE',
        'TAX_IDENTIFICATION_CERTIFICATE',
        'COMMERCIAL_REGISTRATION',
        'HOTEL_ACCREDITATION',
        'TOURISM_COMMISSION_PERMIT',
        'INSURANCE_CERTIFICATE',
        'PARTNERSHIP_AGREEMENT',
        'OTHER'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create Hotel Partners Table
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

-- 3. Create Hotel Partner Documents Table
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

-- 4. Alter Hotels Table with Partner & Publication Columns
ALTER TABLE "hotels"
    ADD COLUMN IF NOT EXISTS "partner_id" UUID,
    ADD COLUMN IF NOT EXISTS "hotel_category" "HotelCategory" NOT NULL DEFAULT 'BOUTIQUE_HERITAGE',
    ADD COLUMN IF NOT EXISTS "verification_status" "HotelVerificationStatus" NOT NULL DEFAULT 'PENDING',
    ADD COLUMN IF NOT EXISTS "publication_status" "HotelPublicationStatus" NOT NULL DEFAULT 'DRAFT',
    ADD COLUMN IF NOT EXISTS "cover_image_url" VARCHAR(512),
    ADD COLUMN IF NOT EXISTS "rejection_reason" TEXT,
    ADD COLUMN IF NOT EXISTS "verified_at" TIMESTAMPTZ(6),
    ADD COLUMN IF NOT EXISTS "verified_by_admin_id" UUID;

DO $$ BEGIN
    ALTER TABLE "hotels" ADD CONSTRAINT "hotels_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "hotel_partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "hotels_partner_id_idx" ON "hotels"("partner_id");

-- 5. Alter Hotel Bookings Table with Hold Expiration & Financials
ALTER TABLE "hotel_bookings"
    ADD COLUMN IF NOT EXISTS "hold_expires_at" TIMESTAMPTZ(6),
    ADD COLUMN IF NOT EXISTS "commission_amount" DECIMAL(10, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "partner_payout_amount" DECIMAL(10, 2) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "hotel_bookings_hold_expires_at_idx" ON "hotel_bookings"("hold_expires_at");

-- 6. Create Hotel Booking Status Histories Table
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
