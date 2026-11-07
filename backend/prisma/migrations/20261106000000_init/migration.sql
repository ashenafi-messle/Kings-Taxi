-- ==============================================================================
-- Migration: 20261106000000_init
-- Target: PostgreSQL 14 - 18+ (kings_taxi_dev)
-- Kings Taxi Central Transportation Platform — Baseline Database Foundation
-- ==============================================================================

-- Create Enums
CREATE TYPE "AccountStatus" AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'DELETED');
CREATE TYPE "DriverVerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');
CREATE TYPE "DriverAvailabilityStatus" AS ENUM ('OFFLINE', 'ONLINE', 'BUSY', 'ON_TRIP');
CREATE TYPE "VehicleVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');
CREATE TYPE "VehicleType" AS ENUM ('STANDARD_SEDAN', 'COMFORT_VAN', 'EXECUTIVE', 'MINIVAN_TOUR');
CREATE TYPE "SupportedLanguage" AS ENUM ('EN', 'AM', 'TI', 'OR');
CREATE TYPE "AuthProvider" AS ENUM ('EMAIL', 'TELEGRAM', 'PHONE');
CREATE TYPE "OtpChannel" AS ENUM ('EMAIL', 'TELEGRAM', 'SMS');
CREATE TYPE "OtpPurpose" AS ENUM ('REGISTRATION', 'LOGIN', 'PASSWORD_RESET', 'IDENTITY_VERIFICATION', 'CHANGE_PHONE', 'CHANGE_EMAIL');
CREATE TYPE "ClientPlatform" AS ENUM ('ANDROID', 'IOS', 'WEB', 'UNKNOWN');
CREATE TYPE "BookingServiceType" AS ENUM ('RIDE_HAILING', 'HOTEL_TRANSPORT', 'HERITAGE_TOUR', 'FULL_CONTRACT');
CREATE TYPE "BookingStatus" AS ENUM ('DRAFT', 'REQUESTED', 'SEARCHING_DRIVER', 'DRIVER_ASSIGNED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED', 'TRIP_STARTED', 'TRIP_COMPLETED', 'CANCELLED');
CREATE TYPE "TripStatus" AS ENUM ('ACCEPTED', 'ARRIVED_AT_PICKUP', 'IN_TRANSIT', 'COMPLETED', 'ABORTED');
CREATE TYPE "PaymentMethod" AS ENUM ('TELEBIRR', 'CBE_BIRR', 'CHAPA', 'CASH');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'REFUNDED');
CREATE TYPE "RecipientType" AS ENUM ('PASSENGER', 'DRIVER', 'ADMIN');
CREATE TYPE "NotificationType" AS ENUM ('TRIP_UPDATE', 'PAYMENT_RECEIPT', 'SECURITY_ALERT', 'SYSTEM_NOTICE');
CREATE TYPE "SupportStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'RESOLVED', 'CLOSED');
CREATE TYPE "SupportPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
CREATE TYPE "CancellationActor" AS ENUM ('PASSENGER', 'DRIVER', 'SYSTEM', 'ADMIN');
CREATE TYPE "UserRoleType" AS ENUM ('PASSENGER', 'DRIVER', 'ADMIN', 'SUPER_ADMIN');
CREATE TYPE "ActorType" AS ENUM ('PASSENGER', 'DRIVER', 'ADMIN', 'SYSTEM');

-- 1. CreateTable: passengers
CREATE TABLE "passengers" (
    "id" UUID NOT NULL,
    "full_name" VARCHAR(128) NOT NULL,
    "email" VARCHAR(255),
    "phone_number" VARCHAR(32),
    "password_hash" VARCHAR(255) NOT NULL,
    "profile_image" VARCHAR(512),
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "account_status" "AccountStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "preferred_language" "SupportedLanguage" NOT NULL DEFAULT 'EN',
    "city" VARCHAR(64) NOT NULL DEFAULT 'Gondar',
    "emergency_contact_name" VARCHAR(128),
    "emergency_contact_phone" VARCHAR(32),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "passengers_pkey" PRIMARY KEY ("id")
);

-- 2. CreateTable: passenger_auth_identities
CREATE TABLE "passenger_auth_identities" (
    "id" UUID NOT NULL,
    "passenger_id" UUID NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "provider_id" VARCHAR(255) NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" TIMESTAMPTZ(6),
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "passenger_auth_identities_pkey" PRIMARY KEY ("id")
);

-- 3. CreateTable: drivers
CREATE TABLE "drivers" (
    "id" UUID NOT NULL,
    "full_name" VARCHAR(128) NOT NULL,
    "email" VARCHAR(255),
    "phone_number" VARCHAR(32) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "profile_image" VARCHAR(512),
    "verification_status" "DriverVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "availability_status" "DriverAvailabilityStatus" NOT NULL DEFAULT 'OFFLINE',
    "current_latitude" DOUBLE PRECISION,
    "current_longitude" DOUBLE PRECISION,
    "last_location_update" TIMESTAMPTZ(6),
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "total_trips" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "drivers_pkey" PRIMARY KEY ("id")
);

-- 4. CreateTable: vehicles
CREATE TABLE "vehicles" (
    "id" UUID NOT NULL,
    "driver_id" UUID NOT NULL,
    "plate_number" VARCHAR(32) NOT NULL,
    "vehicle_model" VARCHAR(64) NOT NULL,
    "vehicle_color" VARCHAR(32) NOT NULL,
    "vehicle_type" "VehicleType" NOT NULL DEFAULT 'STANDARD_SEDAN',
    "seating_capacity" SMALLINT NOT NULL DEFAULT 4,
    "verification_status" "VehicleVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- 5. CreateTable: bookings
CREATE TABLE "bookings" (
    "id" UUID NOT NULL,
    "booking_reference" VARCHAR(32) NOT NULL,
    "passenger_id" UUID NOT NULL,
    "driver_id" UUID,
    "vehicle_id" UUID,
    "service_type" "BookingServiceType" NOT NULL DEFAULT 'RIDE_HAILING',
    "booking_status" "BookingStatus" NOT NULL DEFAULT 'REQUESTED',
    "pickup_location" VARCHAR(255) NOT NULL,
    "destination_location" VARCHAR(255) NOT NULL,
    "pickup_latitude" DOUBLE PRECISION NOT NULL,
    "pickup_longitude" DOUBLE PRECISION NOT NULL,
    "destination_latitude" DOUBLE PRECISION NOT NULL,
    "destination_longitude" DOUBLE PRECISION NOT NULL,
    "estimated_distance_meters" INTEGER,
    "estimated_duration_seconds" INTEGER,
    "estimated_fare" DECIMAL(10,2) NOT NULL,
    "final_fare" DECIMAL(10,2),
    "currency" VARCHAR(8) NOT NULL DEFAULT 'ETB',
    "cancellation_reason" VARCHAR(255),
    "cancelled_by" "CancellationActor",
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- 6. CreateTable: trips
CREATE TABLE "trips" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "driver_id" UUID NOT NULL,
    "vehicle_id" UUID,
    "trip_status" "TripStatus" NOT NULL DEFAULT 'ACCEPTED',
    "started_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "route_polyline" TEXT,
    "actual_distance_meters" INTEGER,
    "actual_duration_seconds" INTEGER,
    "passenger_rating" SMALLINT,
    "passenger_feedback" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "trips_pkey" PRIMARY KEY ("id")
);

-- 7. CreateTable: payments
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "passenger_id" UUID NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(8) NOT NULL DEFAULT 'ETB',
    "payment_method" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "transaction_reference" VARCHAR(64) NOT NULL,
    "gateway_reference" VARCHAR(128),
    "paid_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- 8. CreateTable: notifications
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "recipient_id" UUID NOT NULL,
    "recipient_type" "RecipientType" NOT NULL,
    "title" VARCHAR(128) NOT NULL,
    "message" TEXT NOT NULL,
    "notification_type" "NotificationType" NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMPTZ(6),
    "metadata" JSONB,
    "passenger_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- 9. CreateTable: support_requests
CREATE TABLE "support_requests" (
    "id" UUID NOT NULL,
    "passenger_id" UUID NOT NULL,
    "booking_id" UUID,
    "subject" VARCHAR(128) NOT NULL,
    "message" TEXT NOT NULL,
    "status" "SupportStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "SupportPriority" NOT NULL DEFAULT 'MEDIUM',
    "response_notes" TEXT,
    "resolved_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "support_requests_pkey" PRIMARY KEY ("id")
);

-- 10. CreateTable: refresh_tokens
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "user_type" "UserRoleType" NOT NULL DEFAULT 'PASSENGER',
    "token_hash" VARCHAR(255) NOT NULL,
    "family_id" VARCHAR(64) NOT NULL,
    "is_revoked" BOOLEAN NOT NULL DEFAULT false,
    "revoked_at" TIMESTAMPTZ(6),
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(512),
    "passenger_id" UUID,
    "driver_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- 11. CreateTable: audit_logs
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actor_id" VARCHAR(64),
    "actor_type" "ActorType" NOT NULL,
    "action" VARCHAR(64) NOT NULL,
    "entity_type" VARCHAR(64) NOT NULL,
    "entity_id" VARCHAR(64) NOT NULL,
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(512),
    "metadata" JSONB,
    "passenger_id" UUID,
    "driver_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- 12. CreateTable: otp_verifications
CREATE TABLE "otp_verifications" (
    "id" UUID NOT NULL,
    "identifier" VARCHAR(255) NOT NULL,
    "purpose" "OtpPurpose" NOT NULL,
    "channel" "OtpChannel" NOT NULL,
    "code_hash" VARCHAR(255) NOT NULL,
    "salt" VARCHAR(128) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "resend_cooldown_until" TIMESTAMPTZ(6) NOT NULL,
    "is_consumed" BOOLEAN NOT NULL DEFAULT false,
    "consumed_at" TIMESTAMPTZ(6),
    "passenger_id" UUID,
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(512),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_verifications_pkey" PRIMARY KEY ("id")
);

-- 13. CreateTable: passenger_sessions
CREATE TABLE "passenger_sessions" (
    "id" UUID NOT NULL,
    "passenger_id" UUID NOT NULL,
    "device_id" VARCHAR(128),
    "device_name" VARCHAR(128),
    "platform" "ClientPlatform" NOT NULL DEFAULT 'UNKNOWN',
    "app_version" VARCHAR(32),
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(512),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_active_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "passenger_sessions_pkey" PRIMARY KEY ("id")
);

-- Create Indexes
CREATE UNIQUE INDEX "passengers_email_key" ON "passengers"("email");
CREATE UNIQUE INDEX "passengers_phone_number_key" ON "passengers"("phone_number");
CREATE INDEX "passengers_account_status_idx" ON "passengers"("account_status");
CREATE INDEX "passengers_phone_number_idx" ON "passengers"("phone_number");
CREATE INDEX "passengers_email_idx" ON "passengers"("email");
CREATE INDEX "passengers_created_at_idx" ON "passengers"("created_at");

CREATE UNIQUE INDEX "passenger_auth_identities_provider_provider_id_key" ON "passenger_auth_identities"("provider", "provider_id");
CREATE INDEX "passenger_auth_identities_passenger_id_idx" ON "passenger_auth_identities"("passenger_id");

CREATE UNIQUE INDEX "drivers_email_key" ON "drivers"("email");
CREATE UNIQUE INDEX "drivers_phone_number_key" ON "drivers"("phone_number");
CREATE INDEX "drivers_verification_status_idx" ON "drivers"("verification_status");
CREATE INDEX "drivers_availability_status_idx" ON "drivers"("availability_status");
CREATE INDEX "drivers_phone_number_idx" ON "drivers"("phone_number");
CREATE INDEX "drivers_created_at_idx" ON "drivers"("created_at");

CREATE UNIQUE INDEX "vehicles_plate_number_key" ON "vehicles"("plate_number");
CREATE INDEX "vehicles_driver_id_idx" ON "vehicles"("driver_id");
CREATE INDEX "vehicles_plate_number_idx" ON "vehicles"("plate_number");
CREATE INDEX "vehicles_verification_status_is_active_idx" ON "vehicles"("verification_status", "is_active");

CREATE UNIQUE INDEX "bookings_booking_reference_key" ON "bookings"("booking_reference");
CREATE INDEX "bookings_passenger_id_booking_status_idx" ON "bookings"("passenger_id", "booking_status");
CREATE INDEX "bookings_driver_id_booking_status_idx" ON "bookings"("driver_id", "booking_status");
CREATE INDEX "bookings_booking_reference_idx" ON "bookings"("booking_reference");
CREATE INDEX "bookings_created_at_idx" ON "bookings"("created_at");

CREATE UNIQUE INDEX "trips_booking_id_key" ON "trips"("booking_id");
CREATE INDEX "trips_driver_id_trip_status_idx" ON "trips"("driver_id", "trip_status");
CREATE INDEX "trips_booking_id_idx" ON "trips"("booking_id");
CREATE INDEX "trips_created_at_idx" ON "trips"("created_at");

CREATE UNIQUE INDEX "payments_booking_id_key" ON "payments"("booking_id");
CREATE UNIQUE INDEX "payments_transaction_reference_key" ON "payments"("transaction_reference");
CREATE INDEX "payments_passenger_id_payment_status_idx" ON "payments"("passenger_id", "payment_status");
CREATE INDEX "payments_transaction_reference_idx" ON "payments"("transaction_reference");
CREATE INDEX "payments_payment_status_idx" ON "payments"("payment_status");
CREATE INDEX "payments_created_at_idx" ON "payments"("created_at");

CREATE INDEX "notifications_recipient_id_is_read_idx" ON "notifications"("recipient_id", "is_read");
CREATE INDEX "notifications_recipient_type_recipient_id_idx" ON "notifications"("recipient_type", "recipient_id");
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

CREATE INDEX "support_requests_passenger_id_status_idx" ON "support_requests"("passenger_id", "status");
CREATE INDEX "support_requests_status_idx" ON "support_requests"("status");
CREATE INDEX "support_requests_created_at_idx" ON "support_requests"("created_at");

CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");
CREATE INDEX "refresh_tokens_user_id_is_revoked_idx" ON "refresh_tokens"("user_id", "is_revoked");
CREATE INDEX "refresh_tokens_family_id_idx" ON "refresh_tokens"("family_id");
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");

CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");
CREATE INDEX "audit_logs_actor_id_actor_type_idx" ON "audit_logs"("actor_id", "actor_type");
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

CREATE INDEX "otp_verifications_identifier_purpose_is_consumed_idx" ON "otp_verifications"("identifier", "purpose", "is_consumed");
CREATE INDEX "otp_verifications_expires_at_idx" ON "otp_verifications"("expires_at");

CREATE INDEX "passenger_sessions_passenger_id_is_active_idx" ON "passenger_sessions"("passenger_id", "is_active");

-- Add Foreign Key Constraints
ALTER TABLE "passenger_auth_identities" ADD CONSTRAINT "passenger_auth_identities_passenger_id_fkey" FOREIGN KEY ("passenger_id") REFERENCES "passengers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_passenger_id_fkey" FOREIGN KEY ("passenger_id") REFERENCES "passengers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "trips" ADD CONSTRAINT "trips_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "trips" ADD CONSTRAINT "trips_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "trips" ADD CONSTRAINT "trips_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_passenger_id_fkey" FOREIGN KEY ("passenger_id") REFERENCES "passengers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_passenger_id_fkey" FOREIGN KEY ("passenger_id") REFERENCES "passengers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "support_requests" ADD CONSTRAINT "support_requests_passenger_id_fkey" FOREIGN KEY ("passenger_id") REFERENCES "passengers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_passenger_id_fkey" FOREIGN KEY ("passenger_id") REFERENCES "passengers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_passenger_id_fkey" FOREIGN KEY ("passenger_id") REFERENCES "passengers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "otp_verifications" ADD CONSTRAINT "otp_verifications_passenger_id_fkey" FOREIGN KEY ("passenger_id") REFERENCES "passengers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "passenger_sessions" ADD CONSTRAINT "passenger_sessions_passenger_id_fkey" FOREIGN KEY ("passenger_id") REFERENCES "passengers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
