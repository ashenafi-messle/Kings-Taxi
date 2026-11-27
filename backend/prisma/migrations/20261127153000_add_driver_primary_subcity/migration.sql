-- Safe, non-destructive migration adding primary_subcity_id to drivers
-- Preserves all existing driver records and backfills from existing driver_subcities.

ALTER TABLE "drivers"
  ADD COLUMN IF NOT EXISTS "primary_subcity_id" UUID;

DO $$ BEGIN
  ALTER TABLE "drivers"
    ADD CONSTRAINT "drivers_primary_subcity_id_fkey"
    FOREIGN KEY ("primary_subcity_id") REFERENCES "subcities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "drivers_primary_subcity_id_idx" ON "drivers"("primary_subcity_id");

UPDATE "drivers" d
SET "primary_subcity_id" = ds."subcity_id"
FROM "driver_subcities" ds
WHERE ds."driver_id" = d."id"
  AND ds."is_primary" = true
  AND d."primary_subcity_id" IS NULL;
