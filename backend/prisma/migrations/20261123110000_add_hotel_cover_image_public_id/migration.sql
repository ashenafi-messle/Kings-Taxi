-- AlterTable: hotels
ALTER TABLE "hotels" ADD COLUMN IF NOT EXISTS "cover_image_public_id" VARCHAR(255);
