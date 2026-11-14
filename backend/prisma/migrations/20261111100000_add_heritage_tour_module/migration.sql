-- ==============================================================================
-- KINGS TAXI PLATFORM — HERITAGE TOUR MODULE MIGRATION
-- Additive Schema Migration for Heritage Destinations, Tour Packages,
-- Itinerary Ordering, Price Components, Certified Guides, Vehicle Options,
-- Authoritative Bookings, and Historical Snapshotting.
-- ==============================================================================

-- 1. Extend PaymentType Enum
ALTER TYPE "PaymentType" ADD VALUE IF NOT EXISTS 'HERITAGE_TOUR';

-- 2. Create Heritage Module Enums
DO $$ BEGIN
    CREATE TYPE "HeritageDestinationType" AS ENUM (
        'HISTORICAL_PALACE',
        'RELIGIOUS_MONASTERY',
        'ANCIENT_RUIN',
        'NATURAL_LANDMARK',
        'CULTURAL_VILLAGE'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "HeritageTourBookingStatus" AS ENUM (
        'DRAFT',
        'REQUESTED',
        'UNDER_REVIEW',
        'CONFIRMED',
        'GUIDE_ASSIGNED',
        'VEHICLE_ASSIGNED',
        'IN_PROGRESS',
        'COMPLETED',
        'CANCELLED',
        'REJECTED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "TourComponentType" AS ENUM (
        'TOUR_BASE',
        'VEHICLE_TRANSPORT',
        'TOUR_GUIDE',
        'ENTRANCE_FEE',
        'BOAT_TRANSPORT',
        'PARKING',
        'ADDITIONAL_SERVICE'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "TourPricingMethod" AS ENUM (
        'FIXED_PER_BOOKING',
        'PER_PASSENGER',
        'PER_VEHICLE',
        'PER_HOUR',
        'PER_DAY'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "GuideAvailabilityStatus" AS ENUM (
        'AVAILABLE',
        'ASSIGNED',
        'ON_LEAVE',
        'INACTIVE'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Extend Payments Table
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "heritage_tour_booking_id" UUID;

-- 4. Create heritage_sites Table
CREATE TABLE IF NOT EXISTS "heritage_sites" (
    "id" UUID NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "slug" VARCHAR(128) NOT NULL,
    "short_description" VARCHAR(255) NOT NULL,
    "full_description" TEXT NOT NULL,
    "region" VARCHAR(64) NOT NULL DEFAULT 'Amhara Region',
    "city" VARCHAR(64) NOT NULL DEFAULT 'Gondar',
    "specific_location" VARCHAR(255) NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "destination_type" "HeritageDestinationType" NOT NULL DEFAULT 'HISTORICAL_PALACE',
    "estimated_visit_duration_minutes" INTEGER NOT NULL DEFAULT 120,
    "historical_information" TEXT,
    "cultural_information" TEXT,
    "visiting_rules" TEXT,
    "cover_image_url" VARCHAR(512) NOT NULL,
    "gallery_images" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "highlights" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "entry_fee_etb" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "requires_boat_transport" BOOLEAN NOT NULL DEFAULT false,
    "unesco_designated" BOOLEAN NOT NULL DEFAULT false,
    "unesco_year" INTEGER,
    "status" "HotelStatus" NOT NULL DEFAULT 'DRAFT',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "published_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by_admin_id" UUID,

    CONSTRAINT "heritage_sites_pkey" PRIMARY KEY ("id")
);

-- 5. Create heritage_tour_packages Table
CREATE TABLE IF NOT EXISTS "heritage_tour_packages" (
    "id" UUID NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "slug" VARCHAR(128) NOT NULL,
    "description" TEXT NOT NULL,
    "itinerary" JSONB,
    "estimated_duration_minutes" INTEGER NOT NULL DEFAULT 240,
    "region" VARCHAR(64) NOT NULL DEFAULT 'Amhara Region',
    "city" VARCHAR(64) NOT NULL DEFAULT 'Gondar',
    "base_price" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(8) NOT NULL DEFAULT 'ETB',
    "minimum_passengers" INTEGER NOT NULL DEFAULT 1,
    "maximum_passengers" INTEGER NOT NULL DEFAULT 20,
    "includes_guide" BOOLEAN NOT NULL DEFAULT false,
    "includes_transport" BOOLEAN NOT NULL DEFAULT true,
    "includes_boat" BOOLEAN NOT NULL DEFAULT false,
    "status" "HotelStatus" NOT NULL DEFAULT 'DRAFT',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "requires_advance_booking" BOOLEAN NOT NULL DEFAULT true,
    "minimum_advance_hours" INTEGER NOT NULL DEFAULT 6,
    "cancellation_policy" TEXT,
    "published_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by_admin_id" UUID,

    CONSTRAINT "heritage_tour_packages_pkey" PRIMARY KEY ("id")
);

-- 6. Create heritage_tour_package_sites Table
CREATE TABLE IF NOT EXISTS "heritage_tour_package_sites" (
    "id" UUID NOT NULL,
    "package_id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "visit_order" INTEGER NOT NULL DEFAULT 1,
    "estimated_visit_duration_minutes" INTEGER NOT NULL DEFAULT 60,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "heritage_tour_package_sites_pkey" PRIMARY KEY ("id")
);

-- 7. Create heritage_tour_price_components Table
CREATE TABLE IF NOT EXISTS "heritage_tour_price_components" (
    "id" UUID NOT NULL,
    "package_id" UUID,
    "name" VARCHAR(128) NOT NULL,
    "component_type" "TourComponentType" NOT NULL,
    "pricing_method" "TourPricingMethod" NOT NULL,
    "rate" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(8) NOT NULL DEFAULT 'ETB',
    "is_mandatory" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "heritage_tour_price_components_pkey" PRIMARY KEY ("id")
);

-- 8. Create heritage_tour_guides Table
CREATE TABLE IF NOT EXISTS "heritage_tour_guides" (
    "id" UUID NOT NULL,
    "full_name" VARCHAR(128) NOT NULL,
    "languages" TEXT[] NOT NULL DEFAULT ARRAY['English', 'Amharic']::TEXT[],
    "qualifications" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "specialties" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "daily_rate" DECIMAL(10,2) NOT NULL DEFAULT 1500.00,
    "hourly_rate" DECIMAL(10,2),
    "phone" VARCHAR(32) NOT NULL,
    "email" VARCHAR(255),
    "profile_image_url" VARCHAR(512),
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "total_tours_led" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "availability_status" "GuideAvailabilityStatus" NOT NULL DEFAULT 'AVAILABLE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "heritage_tour_guides_pkey" PRIMARY KEY ("id")
);

-- 9. Create heritage_tour_vehicle_options Table
CREATE TABLE IF NOT EXISTS "heritage_tour_vehicle_options" (
    "id" UUID NOT NULL,
    "vehicle_type" "VehicleType" NOT NULL,
    "display_name" VARCHAR(64) NOT NULL,
    "seating_capacity" SMALLINT NOT NULL,
    "luggage_capacity" SMALLINT NOT NULL DEFAULT 2,
    "base_rate" DECIMAL(10,2) NOT NULL,
    "per_hour_rate" DECIMAL(10,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "features" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "heritage_tour_vehicle_options_pkey" PRIMARY KEY ("id")
);

-- 10. Create heritage_tour_bookings Table
CREATE TABLE IF NOT EXISTS "heritage_tour_bookings" (
    "id" UUID NOT NULL,
    "booking_reference" VARCHAR(64) NOT NULL,
    "passenger_id" UUID NOT NULL,
    "package_id" UUID,
    "vehicle_option_id" UUID,
    "assigned_vehicle_id" UUID,
    "assigned_driver_id" UUID,
    "assigned_guide_id" UUID,
    "booking_status" "HeritageTourBookingStatus" NOT NULL DEFAULT 'REQUESTED',
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "scheduled_date" DATE NOT NULL,
    "preferred_time" VARCHAR(16) NOT NULL DEFAULT '09:00',
    "adults" INTEGER NOT NULL DEFAULT 1,
    "children" INTEGER NOT NULL DEFAULT 0,
    "pickup_location" VARCHAR(255) NOT NULL,
    "pickup_latitude" DOUBLE PRECISION,
    "pickup_longitude" DOUBLE PRECISION,
    "special_requests" TEXT,
    "cancellation_reason" TEXT,
    "cancelled_at" TIMESTAMPTZ(6),
    "base_amount" DECIMAL(10,2) NOT NULL,
    "vehicle_amount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "guide_amount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "entrance_fees_amount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "boat_transport_amount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "discount_amount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "tax_amount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(8) NOT NULL DEFAULT 'ETB',
    "pricing_snapshot" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "heritage_tour_bookings_pkey" PRIMARY KEY ("id")
);

-- 11. Create heritage_tour_booking_sites Table
CREATE TABLE IF NOT EXISTS "heritage_tour_booking_sites" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "site_name_snapshot" VARCHAR(128) NOT NULL,
    "visit_order" INTEGER NOT NULL DEFAULT 1,
    "entry_fee_snapshot" DECIMAL(10,2) NOT NULL,
    "requires_boat_snapshot" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "heritage_tour_booking_sites_pkey" PRIMARY KEY ("id")
);

-- 12. Create heritage_tour_booking_price_items Table
CREATE TABLE IF NOT EXISTS "heritage_tour_booking_price_items" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "component_name" VARCHAR(128) NOT NULL,
    "component_type" "TourComponentType" NOT NULL,
    "pricing_method" "TourPricingMethod" NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "total_price" DECIMAL(10,2) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "heritage_tour_booking_price_items_pkey" PRIMARY KEY ("id")
);

-- 13. Create heritage_tour_guide_requests Table
CREATE TABLE IF NOT EXISTS "heritage_tour_guide_requests" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "preferred_language" VARCHAR(64) NOT NULL DEFAULT 'English',
    "specialization" VARCHAR(128),
    "status" VARCHAR(32) NOT NULL DEFAULT 'REQUESTED',
    "assigned_guide_id" UUID,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "heritage_tour_guide_requests_pkey" PRIMARY KEY ("id")
);

-- 14. Unique Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "heritage_sites_slug_key" ON "heritage_sites"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "heritage_tour_packages_slug_key" ON "heritage_tour_packages"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "heritage_tour_package_sites_package_id_site_id_key" ON "heritage_tour_package_sites"("package_id", "site_id");
CREATE UNIQUE INDEX IF NOT EXISTS "heritage_tour_bookings_booking_reference_key" ON "heritage_tour_bookings"("booking_reference");
CREATE UNIQUE INDEX IF NOT EXISTS "payments_heritage_tour_booking_id_key" ON "payments"("heritage_tour_booking_id");

-- 15. Operational Indexes
CREATE INDEX IF NOT EXISTS "heritage_sites_city_status_idx" ON "heritage_sites"("city", "status");
CREATE INDEX IF NOT EXISTS "heritage_sites_region_status_idx" ON "heritage_sites"("region", "status");
CREATE INDEX IF NOT EXISTS "heritage_sites_featured_status_idx" ON "heritage_sites"("featured", "status");
CREATE INDEX IF NOT EXISTS "heritage_sites_slug_idx" ON "heritage_sites"("slug");

CREATE INDEX IF NOT EXISTS "heritage_tour_packages_city_status_idx" ON "heritage_tour_packages"("city", "status");
CREATE INDEX IF NOT EXISTS "heritage_tour_packages_featured_status_idx" ON "heritage_tour_packages"("featured", "status");
CREATE INDEX IF NOT EXISTS "heritage_tour_packages_slug_idx" ON "heritage_tour_packages"("slug");

CREATE INDEX IF NOT EXISTS "heritage_tour_package_sites_package_id_visit_order_idx" ON "heritage_tour_package_sites"("package_id", "visit_order");
CREATE INDEX IF NOT EXISTS "heritage_tour_price_components_package_id_component_type_idx" ON "heritage_tour_price_components"("package_id", "component_type");
CREATE INDEX IF NOT EXISTS "heritage_tour_guides_availability_status_is_active_idx" ON "heritage_tour_guides"("availability_status", "is_active");
CREATE INDEX IF NOT EXISTS "heritage_tour_vehicle_options_vehicle_type_is_active_idx" ON "heritage_tour_vehicle_options"("vehicle_type", "is_active");

CREATE INDEX IF NOT EXISTS "heritage_tour_bookings_passenger_id_booking_status_idx" ON "heritage_tour_bookings"("passenger_id", "booking_status");
CREATE INDEX IF NOT EXISTS "heritage_tour_bookings_scheduled_date_booking_status_idx" ON "heritage_tour_bookings"("scheduled_date", "booking_status");
CREATE INDEX IF NOT EXISTS "heritage_tour_bookings_package_id_idx" ON "heritage_tour_bookings"("package_id");
CREATE INDEX IF NOT EXISTS "heritage_tour_bookings_booking_reference_idx" ON "heritage_tour_bookings"("booking_reference");

CREATE INDEX IF NOT EXISTS "heritage_tour_booking_sites_booking_id_visit_order_idx" ON "heritage_tour_booking_sites"("booking_id", "visit_order");
CREATE INDEX IF NOT EXISTS "heritage_tour_booking_price_items_booking_id_component_type_idx" ON "heritage_tour_booking_price_items"("booking_id", "component_type");
CREATE INDEX IF NOT EXISTS "heritage_tour_guide_requests_booking_id_idx" ON "heritage_tour_guide_requests"("booking_id");

-- 16. Foreign Keys
DO $$ BEGIN
    ALTER TABLE "heritage_tour_package_sites" ADD CONSTRAINT "heritage_tour_package_sites_package_id_fkey"
    FOREIGN KEY ("package_id") REFERENCES "heritage_tour_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "heritage_tour_package_sites" ADD CONSTRAINT "heritage_tour_package_sites_site_id_fkey"
    FOREIGN KEY ("site_id") REFERENCES "heritage_sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "heritage_tour_price_components" ADD CONSTRAINT "heritage_tour_price_components_package_id_fkey"
    FOREIGN KEY ("package_id") REFERENCES "heritage_tour_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "heritage_tour_bookings" ADD CONSTRAINT "heritage_tour_bookings_passenger_id_fkey"
    FOREIGN KEY ("passenger_id") REFERENCES "passengers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "heritage_tour_bookings" ADD CONSTRAINT "heritage_tour_bookings_package_id_fkey"
    FOREIGN KEY ("package_id") REFERENCES "heritage_tour_packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "heritage_tour_bookings" ADD CONSTRAINT "heritage_tour_bookings_vehicle_option_id_fkey"
    FOREIGN KEY ("vehicle_option_id") REFERENCES "heritage_tour_vehicle_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "heritage_tour_bookings" ADD CONSTRAINT "heritage_tour_bookings_assigned_vehicle_id_fkey"
    FOREIGN KEY ("assigned_vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "heritage_tour_bookings" ADD CONSTRAINT "heritage_tour_bookings_assigned_driver_id_fkey"
    FOREIGN KEY ("assigned_driver_id") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "heritage_tour_bookings" ADD CONSTRAINT "heritage_tour_bookings_assigned_guide_id_fkey"
    FOREIGN KEY ("assigned_guide_id") REFERENCES "heritage_tour_guides"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "heritage_tour_booking_sites" ADD CONSTRAINT "heritage_tour_booking_sites_booking_id_fkey"
    FOREIGN KEY ("booking_id") REFERENCES "heritage_tour_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "heritage_tour_booking_sites" ADD CONSTRAINT "heritage_tour_booking_sites_site_id_fkey"
    FOREIGN KEY ("site_id") REFERENCES "heritage_sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "heritage_tour_booking_price_items" ADD CONSTRAINT "heritage_tour_booking_price_items_booking_id_fkey"
    FOREIGN KEY ("booking_id") REFERENCES "heritage_tour_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "heritage_tour_guide_requests" ADD CONSTRAINT "heritage_tour_guide_requests_booking_id_fkey"
    FOREIGN KEY ("booking_id") REFERENCES "heritage_tour_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "heritage_tour_guide_requests" ADD CONSTRAINT "heritage_tour_guide_requests_assigned_guide_id_fkey"
    FOREIGN KEY ("assigned_guide_id") REFERENCES "heritage_tour_guides"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "payments" ADD CONSTRAINT "payments_heritage_tour_booking_id_fkey"
    FOREIGN KEY ("heritage_tour_booking_id") REFERENCES "heritage_tour_bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

