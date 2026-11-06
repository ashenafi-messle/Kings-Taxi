-- ==============================================================================
-- Migration: 20261106000000_init
-- Database: PostgreSQL 14+
-- Kings Taxi Central Backend — Initial Core Schema
-- ==============================================================================

-- CreateEnum
CREATE TYPE "PassengerStatus" AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'DELETED');
CREATE TYPE "SupportedLanguage" AS ENUM ('EN', 'AM', 'TI', 'OR');
CREATE TYPE "AuthProvider" AS ENUM ('EMAIL', 'TELEGRAM', 'PHONE');
CREATE TYPE "OtpChannel" AS ENUM ('EMAIL', 'TELEGRAM', 'SMS');
CREATE TYPE "OtpPurpose" AS ENUM ('REGISTRATION', 'LOGIN', 'PASSWORD_RESET', 'IDENTITY_VERIFICATION', 'CHANGE_PHONE', 'CHANGE_EMAIL');
CREATE TYPE "ClientPlatform" AS ENUM ('ANDROID', 'IOS', 'WEB', 'UNKNOWN');
CREATE TYPE "BookingServiceType" AS ENUM ('RIDE_HAILING', 'HOTEL_TRANSPORT', 'HERITAGE_TOUR', 'FULL_CONTRACT');
CREATE TYPE "BookingStatus" AS ENUM ('DRAFT', 'REQUESTED', 'SEARCHING_DRIVER', 'DRIVER_ASSIGNED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED', 'TRIP_STARTED', 'TRIP_COMPLETED', 'CANCELLED');
CREATE TYPE "CancellationActor" AS ENUM ('PASSENGER', 'DRIVER', 'SYSTEM', 'ADMIN');

-- CreateTable passengers
CREATE TABLE "passengers" (
    "id" UUID NOT NULL,
    "phone" VARCHAR(32),
    "email" VARCHAR(255),
    "status" "PassengerStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "passwordHash" VARCHAR(255) NOT NULL,
    "passwordSalt" VARCHAR(128),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "passengers_pkey" PRIMARY KEY ("id")
);

-- CreateTable passenger_profiles
CREATE TABLE "passenger_profiles" (
    "id" UUID NOT NULL,
    "passenger_id" UUID NOT NULL,
    "full_name" VARCHAR(128) NOT NULL,
    "avatar_url" VARCHAR(512),
    "preferred_language" "SupportedLanguage" NOT NULL DEFAULT 'EN',
    "city" VARCHAR(64) NOT NULL DEFAULT 'Gondar',
    "emergency_contact_name" VARCHAR(128),
    "emergency_contact_phone" VARCHAR(32),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "passenger_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable passenger_auth_identities
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

-- CreateTable otp_verifications
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

-- CreateTable refresh_tokens
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "passenger_id" UUID NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "family_id" VARCHAR(64) NOT NULL,
    "session_id" UUID,
    "is_revoked" BOOLEAN NOT NULL DEFAULT false,
    "revoked_at" TIMESTAMPTZ(6),
    "replaced_by_token_hash" VARCHAR(255),
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(512),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable passenger_sessions
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

-- CreateTable bookings
CREATE TABLE "bookings" (
    "id" UUID NOT NULL,
    "booking_reference" VARCHAR(32) NOT NULL,
    "passenger_id" UUID NOT NULL,
    "driver_id" UUID,
    "vehicle_id" UUID,
    "service_type" "BookingServiceType" NOT NULL DEFAULT 'RIDE_HAILING',
    "status" "BookingStatus" NOT NULL DEFAULT 'DRAFT',
    "pickup_address" VARCHAR(255) NOT NULL,
    "pickup_latitude" DOUBLE PRECISION NOT NULL,
    "pickup_longitude" DOUBLE PRECISION NOT NULL,
    "dropoff_address" VARCHAR(255) NOT NULL,
    "dropoff_latitude" DOUBLE PRECISION NOT NULL,
    "dropoff_longitude" DOUBLE PRECISION NOT NULL,
    "estimated_distance_meters" INTEGER,
    "estimated_duration_seconds" INTEGER,
    "estimated_fare" DECIMAL(10,2),
    "final_fare" DECIMAL(10,2),
    "currency" VARCHAR(8) NOT NULL DEFAULT 'ETB',
    "cancellation_reason" VARCHAR(255),
    "cancelled_by" "CancellationActor",
    "passenger_rating" SMALLINT,
    "passenger_feedback" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "completed_at" TIMESTAMPTZ(6),
    "cancelled_at" TIMESTAMPTZ(6),

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable audit_logs
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "entity_type" VARCHAR(64) NOT NULL,
    "entity_id" VARCHAR(64) NOT NULL,
    "action" VARCHAR(64) NOT NULL,
    "performed_by" VARCHAR(64),
    "passenger_id" UUID,
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(512),
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes
CREATE UNIQUE INDEX "passengers_phone_key" ON "passengers"("phone");
CREATE UNIQUE INDEX "passengers_email_key" ON "passengers"("email");
CREATE INDEX "passengers_status_idx" ON "passengers"("status");
CREATE INDEX "passengers_created_at_idx" ON "passengers"("created_at");

CREATE UNIQUE INDEX "passenger_profiles_passenger_id_key" ON "passenger_profiles"("passenger_id");

CREATE UNIQUE INDEX "passenger_auth_identities_provider_provider_id_key" ON "passenger_auth_identities"("provider", "provider_id");
CREATE INDEX "passenger_auth_identities_passenger_id_idx" ON "passenger_auth_identities"("passenger_id");

CREATE INDEX "otp_verifications_identifier_purpose_is_consumed_idx" ON "otp_verifications"("identifier", "purpose", "is_consumed");
CREATE INDEX "otp_verifications_expires_at_idx" ON "otp_verifications"("expires_at");

CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");
CREATE INDEX "refresh_tokens_passenger_id_idx" ON "refresh_tokens"("passenger_id");
CREATE INDEX "refresh_tokens_family_id_idx" ON "refresh_tokens"("family_id");
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");

CREATE INDEX "passenger_sessions_passenger_id_is_active_idx" ON "passenger_sessions"("passenger_id", "is_active");

CREATE UNIQUE INDEX "bookings_booking_reference_key" ON "bookings"("booking_reference");
CREATE INDEX "bookings_passenger_id_status_idx" ON "bookings"("passenger_id", "status");
CREATE INDEX "bookings_booking_reference_idx" ON "bookings"("booking_reference");
CREATE INDEX "bookings_created_at_idx" ON "bookings"("created_at");

CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- AddForeignKeys
ALTER TABLE "passenger_profiles" ADD CONSTRAINT "passenger_profiles_passenger_id_fkey" FOREIGN KEY ("passenger_id") REFERENCES "passengers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "passenger_auth_identities" ADD CONSTRAINT "passenger_auth_identities_passenger_id_fkey" FOREIGN KEY ("passenger_id") REFERENCES "passengers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "otp_verifications" ADD CONSTRAINT "otp_verifications_passenger_id_fkey" FOREIGN KEY ("passenger_id") REFERENCES "passengers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_passenger_id_fkey" FOREIGN KEY ("passenger_id") REFERENCES "passengers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "passenger_sessions" ADD CONSTRAINT "passenger_sessions_passenger_id_fkey" FOREIGN KEY ("passenger_id") REFERENCES "passengers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_passenger_id_fkey" FOREIGN KEY ("passenger_id") REFERENCES "passengers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_passenger_id_fkey" FOREIGN KEY ("passenger_id") REFERENCES "passengers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

