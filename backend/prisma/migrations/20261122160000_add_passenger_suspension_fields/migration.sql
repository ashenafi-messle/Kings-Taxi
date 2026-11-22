-- AlterTable: Add suspension fields to passengers
ALTER TABLE "passengers" ADD COLUMN IF NOT EXISTS "suspension_reason" TEXT;
ALTER TABLE "passengers" ADD COLUMN IF NOT EXISTS "suspended_at" TIMESTAMPTZ(6);
