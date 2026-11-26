-- Additive, non-destructive migration for Heritage Tour Booking Audit Logs & Idempotency
ALTER TABLE "heritage_tour_bookings"
  ADD COLUMN IF NOT EXISTS "idempotency_key" VARCHAR(128);

CREATE UNIQUE INDEX IF NOT EXISTS "heritage_tour_bookings_idempotency_key_key"
  ON "heritage_tour_bookings"("idempotency_key");

CREATE INDEX IF NOT EXISTS "heritage_tour_bookings_assigned_vehicle_id_scheduled_date_booking_status_idx"
  ON "heritage_tour_bookings"("assigned_vehicle_id", "scheduled_date", "booking_status");

CREATE TABLE IF NOT EXISTS "heritage_tour_booking_audit_logs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "booking_id" UUID NOT NULL,
  "admin_actor_id" VARCHAR(128),
  "previous_status" "HeritageTourBookingStatus",
  "new_status" "HeritageTourBookingStatus" NOT NULL,
  "action" VARCHAR(64) NOT NULL,
  "notes" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "heritage_tour_booking_audit_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "heritage_tour_booking_audit_logs_booking_id_fkey"
    FOREIGN KEY ("booking_id") REFERENCES "heritage_tour_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "heritage_tour_booking_audit_logs_booking_id_created_at_idx"
  ON "heritage_tour_booking_audit_logs"("booking_id", "created_at");
