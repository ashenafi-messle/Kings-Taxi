-- AlterTable: ensure file_url and image_url columns support unlimited storage references and prevent length overflow
ALTER TABLE "driver_documents" ALTER COLUMN "file_url" TYPE TEXT;
ALTER TABLE "vehicle_documents" ALTER COLUMN "file_url" TYPE TEXT;
ALTER TABLE "vehicles" ALTER COLUMN "image_url" TYPE TEXT;
ALTER TABLE "drivers" ALTER COLUMN "profile_image" TYPE TEXT;
ALTER TABLE "passengers" ALTER COLUMN "profile_image" TYPE TEXT;
ALTER TABLE "admin_users" ALTER COLUMN "avatar_url" TYPE TEXT;
ALTER TABLE "refresh_tokens" ADD COLUMN IF NOT EXISTS "admin_id" UUID REFERENCES "admin_users"("id") ON DELETE CASCADE;
