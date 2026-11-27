-- Enforce at most one active assignment per driver and per vehicle at the database level
CREATE UNIQUE INDEX IF NOT EXISTS "vehicle_assignments_one_active_per_driver_idx"
ON "vehicle_assignments"("driver_id")
WHERE "is_active" = true;

CREATE UNIQUE INDEX IF NOT EXISTS "vehicle_assignments_one_active_per_vehicle_idx"
ON "vehicle_assignments"("vehicle_id")
WHERE "is_active" = true;
