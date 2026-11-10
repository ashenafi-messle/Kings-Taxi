-- CreateEnum
CREATE TYPE "TrackingSessionStatus" AS ENUM ('ACTIVE', 'PAUSED', 'INTERRUPTED', 'COMPLETED', 'ABORTED');

-- CreateEnum
CREATE TYPE "LocationValidationStatus" AS ENUM ('VALID', 'REJECTED_ACCURACY', 'REJECTED_SPEED', 'REJECTED_JUMP', 'REJECTED_TIME');

-- CreateEnum
CREATE TYPE "DestinationRevisionStatus" AS ENUM ('PENDING', 'ACCEPTED_BY_DRIVER', 'REJECTED_BY_DRIVER', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DriverAvailabilityStatus" ADD VALUE 'AVAILABLE';
ALTER TYPE "DriverAvailabilityStatus" ADD VALUE 'TEMPORARILY_UNAVAILABLE';

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "accepted_at" TIMESTAMPTZ(6),
ADD COLUMN     "additional_instructions" TEXT,
ADD COLUMN     "cancelled_at" TIMESTAMPTZ(6),
ADD COLUMN     "completed_at" TIMESTAMPTZ(6),
ADD COLUMN     "passenger_contact_phone" VARCHAR(32),
ADD COLUMN     "started_at" TIMESTAMPTZ(6),
ADD COLUMN     "subcity_id" UUID;

-- CreateTable
CREATE TABLE "subcities" (
    "id" UUID NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "slug" VARCHAR(64) NOT NULL,
    "city" VARCHAR(64) NOT NULL DEFAULT 'Gondar',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "center_latitude" DOUBLE PRECISION NOT NULL,
    "center_longitude" DOUBLE PRECISION NOT NULL,
    "radius_km" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "subcities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_subcities" (
    "id" UUID NOT NULL,
    "driver_id" UUID NOT NULL,
    "subcity_id" UUID NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "driver_subcities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_fare_configurations" (
    "id" UUID NOT NULL,
    "vehicle_type" "VehicleType" NOT NULL,
    "base_fare" DECIMAL(10,2) NOT NULL,
    "per_kilometre_rate" DECIMAL(10,2) NOT NULL,
    "per_minute_rate" DECIMAL(10,2) NOT NULL,
    "minimum_fare" DECIMAL(10,2) NOT NULL DEFAULT 50.00,
    "currency" VARCHAR(8) NOT NULL DEFAULT 'ETB',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "effective_from" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effective_until" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "vehicle_fare_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_tracking_sessions" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "driver_id" UUID NOT NULL,
    "status" "TrackingSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "tracking_quality" VARCHAR(32) NOT NULL DEFAULT 'GOOD',
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMPTZ(6),
    "official_distance_meters" INTEGER NOT NULL DEFAULT 0,
    "estimated_distance_meters" INTEGER,
    "last_valid_location_at" TIMESTAMPTZ(6),
    "last_latitude" DOUBLE PRECISION,
    "last_longitude" DOUBLE PRECISION,
    "total_samples_count" INTEGER NOT NULL DEFAULT 0,
    "valid_samples_count" INTEGER NOT NULL DEFAULT 0,
    "interruption_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "trip_tracking_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_location_samples" (
    "id" UUID NOT NULL,
    "tracking_session_id" UUID NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "accuracy" DOUBLE PRECISION NOT NULL,
    "speed" DOUBLE PRECISION,
    "heading" DOUBLE PRECISION,
    "altitude" DOUBLE PRECISION,
    "device_timestamp" TIMESTAMPTZ(6) NOT NULL,
    "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sequence_number" INTEGER NOT NULL,
    "validation_status" "LocationValidationStatus" NOT NULL DEFAULT 'VALID',
    "distance_from_prev_meters" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "trip_location_samples_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_fare_snapshots" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "pricing_version" VARCHAR(32) NOT NULL DEFAULT 'v1',
    "base_fare" DECIMAL(10,2) NOT NULL,
    "per_kilometre_rate" DECIMAL(10,2) NOT NULL,
    "per_minute_rate" DECIMAL(10,2) NOT NULL,
    "minimum_fare" DECIMAL(10,2) NOT NULL DEFAULT 50.00,
    "actual_distance_meters" INTEGER NOT NULL DEFAULT 0,
    "estimated_distance_meters" INTEGER NOT NULL DEFAULT 0,
    "billable_distance_meters" INTEGER NOT NULL DEFAULT 0,
    "duration_seconds" INTEGER NOT NULL DEFAULT 0,
    "distance_fare" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "time_fare" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "final_fare" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "currency" VARCHAR(8) NOT NULL DEFAULT 'ETB',
    "calculation_method" VARCHAR(32) NOT NULL DEFAULT 'STANDARD_GPS_HAVERSINE',
    "captured_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalized_at" TIMESTAMPTZ(6),

    CONSTRAINT "trip_fare_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ride_destination_revisions" (
    "id" UUID NOT NULL,
    "booking_id" UUID NOT NULL,
    "revision_number" INTEGER NOT NULL DEFAULT 1,
    "previous_destination" VARCHAR(255) NOT NULL,
    "previous_latitude" DOUBLE PRECISION NOT NULL,
    "previous_longitude" DOUBLE PRECISION NOT NULL,
    "new_destination" VARCHAR(255) NOT NULL,
    "new_latitude" DOUBLE PRECISION NOT NULL,
    "new_longitude" DOUBLE PRECISION NOT NULL,
    "distance_travelled_at_revision_meters" INTEGER NOT NULL DEFAULT 0,
    "remaining_estimated_distance_meters" INTEGER NOT NULL DEFAULT 0,
    "previous_estimated_fare" DECIMAL(10,2) NOT NULL,
    "revised_estimated_fare" DECIMAL(10,2) NOT NULL,
    "status" "DestinationRevisionStatus" NOT NULL DEFAULT 'PENDING',
    "requested_by" "ActorType" NOT NULL DEFAULT 'PASSENGER',
    "requested_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" TIMESTAMPTZ(6),

    CONSTRAINT "ride_destination_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "subcities_name_key" ON "subcities"("name");

-- CreateIndex
CREATE UNIQUE INDEX "subcities_slug_key" ON "subcities"("slug");

-- CreateIndex
CREATE INDEX "subcities_is_active_idx" ON "subcities"("is_active");

-- CreateIndex
CREATE INDEX "driver_subcities_subcity_id_idx" ON "driver_subcities"("subcity_id");

-- CreateIndex
CREATE INDEX "driver_subcities_driver_id_idx" ON "driver_subcities"("driver_id");

-- CreateIndex
CREATE UNIQUE INDEX "driver_subcities_driver_id_subcity_id_key" ON "driver_subcities"("driver_id", "subcity_id");

-- CreateIndex
CREATE INDEX "vehicle_fare_configurations_vehicle_type_is_active_idx" ON "vehicle_fare_configurations"("vehicle_type", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "trip_tracking_sessions_booking_id_key" ON "trip_tracking_sessions"("booking_id");

-- CreateIndex
CREATE INDEX "trip_tracking_sessions_driver_id_status_idx" ON "trip_tracking_sessions"("driver_id", "status");

-- CreateIndex
CREATE INDEX "trip_location_samples_tracking_session_id_sequence_number_idx" ON "trip_location_samples"("tracking_session_id", "sequence_number");

-- CreateIndex
CREATE INDEX "trip_location_samples_tracking_session_id_received_at_idx" ON "trip_location_samples"("tracking_session_id", "received_at");

-- CreateIndex
CREATE UNIQUE INDEX "trip_fare_snapshots_booking_id_key" ON "trip_fare_snapshots"("booking_id");

-- CreateIndex
CREATE INDEX "ride_destination_revisions_booking_id_status_idx" ON "ride_destination_revisions"("booking_id", "status");

-- CreateIndex
CREATE INDEX "bookings_subcity_id_idx" ON "bookings"("subcity_id");

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_subcity_id_fkey" FOREIGN KEY ("subcity_id") REFERENCES "subcities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_subcities" ADD CONSTRAINT "driver_subcities_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_subcities" ADD CONSTRAINT "driver_subcities_subcity_id_fkey" FOREIGN KEY ("subcity_id") REFERENCES "subcities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_tracking_sessions" ADD CONSTRAINT "trip_tracking_sessions_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_tracking_sessions" ADD CONSTRAINT "trip_tracking_sessions_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_location_samples" ADD CONSTRAINT "trip_location_samples_tracking_session_id_fkey" FOREIGN KEY ("tracking_session_id") REFERENCES "trip_tracking_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_fare_snapshots" ADD CONSTRAINT "trip_fare_snapshots_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ride_destination_revisions" ADD CONSTRAINT "ride_destination_revisions_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

