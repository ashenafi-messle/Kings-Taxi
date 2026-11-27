-- Safe, non-destructive migration for Real-Time Driver Availability, Connection Health & Ride Request Lifecycle
-- Preserves all existing driver, passenger, and booking records.

ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'REJECTED';
ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';

ALTER TABLE "drivers"
  ADD COLUMN IF NOT EXISTS "last_heartbeat_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "is_socket_connected" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "bookings"
  ADD COLUMN IF NOT EXISTS "expires_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "rejected_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "rejection_reason" VARCHAR(255);

CREATE INDEX IF NOT EXISTS "drivers_availability_eligibility_idx"
  ON "drivers"("availability_status", "verification_status", "account_status");

CREATE INDEX IF NOT EXISTS "bookings_status_expires_at_idx"
  ON "bookings"("booking_status", "expires_at");

-- Database-backed invariant: at most one active/pending ride reservation per driver
CREATE UNIQUE INDEX IF NOT EXISTS "bookings_one_active_per_driver_idx"
  ON "bookings"("driver_id")
  WHERE "driver_id" IS NOT NULL
    AND "booking_status" IN ('REQUESTED', 'DRIVER_ASSIGNED', 'DRIVER_ARRIVING', 'DRIVER_ARRIVED', 'TRIP_STARTED');
