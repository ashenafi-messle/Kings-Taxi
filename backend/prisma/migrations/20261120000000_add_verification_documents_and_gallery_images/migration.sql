-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "DocumentReviewStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED', 'REQUIRES_RESUBMISSION');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable: driver_documents
CREATE TABLE IF NOT EXISTS "driver_documents" (
    "id" UUID NOT NULL,
    "driver_id" UUID NOT NULL,
    "document_type" VARCHAR(64) NOT NULL,
    "document_number" VARCHAR(128),
    "file_url" VARCHAR(512) NOT NULL,
    "public_id" VARCHAR(255),
    "file_name" VARCHAR(255),
    "file_format" VARCHAR(32),
    "file_size" INTEGER,
    "status" "DocumentReviewStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "rejection_reason" TEXT,
    "review_notes" TEXT,
    "reviewed_by" VARCHAR(128),
    "reviewed_at" TIMESTAMPTZ(6),
    "expiry_date" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "driver_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable: vehicle_documents
CREATE TABLE IF NOT EXISTS "vehicle_documents" (
    "id" UUID NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "document_type" VARCHAR(64) NOT NULL,
    "document_number" VARCHAR(128),
    "file_url" VARCHAR(512) NOT NULL,
    "public_id" VARCHAR(255),
    "file_name" VARCHAR(255),
    "file_format" VARCHAR(32),
    "file_size" INTEGER,
    "status" "DocumentReviewStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "rejection_reason" TEXT,
    "review_notes" TEXT,
    "reviewed_by" VARCHAR(128),
    "reviewed_at" TIMESTAMPTZ(6),
    "expiry_date" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable: room_images
CREATE TABLE IF NOT EXISTS "room_images" (
    "id" UUID NOT NULL,
    "room_type_id" UUID NOT NULL,
    "image_url" VARCHAR(512) NOT NULL,
    "public_id" VARCHAR(255),
    "caption" VARCHAR(255),
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "file_format" VARCHAR(32),
    "file_size" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable: heritage_destination_images
CREATE TABLE IF NOT EXISTS "heritage_destination_images" (
    "id" UUID NOT NULL,
    "site_id" UUID NOT NULL,
    "image_url" VARCHAR(512) NOT NULL,
    "public_id" VARCHAR(255),
    "caption" VARCHAR(255),
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "file_format" VARCHAR(32),
    "file_size" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "heritage_destination_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "driver_documents_driver_id_document_type_idx" ON "driver_documents"("driver_id", "document_type");
CREATE INDEX IF NOT EXISTS "driver_documents_status_idx" ON "driver_documents"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "vehicle_documents_vehicle_id_document_type_idx" ON "vehicle_documents"("vehicle_id", "document_type");
CREATE INDEX IF NOT EXISTS "vehicle_documents_status_idx" ON "vehicle_documents"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "room_images_room_type_id_display_order_idx" ON "room_images"("room_type_id", "display_order");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "heritage_destination_images_site_id_display_order_idx" ON "heritage_destination_images"("site_id", "display_order");

-- AddForeignKey
ALTER TABLE "driver_documents" DROP CONSTRAINT IF EXISTS "driver_documents_driver_id_fkey";
ALTER TABLE "driver_documents" ADD CONSTRAINT "driver_documents_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_documents" DROP CONSTRAINT IF EXISTS "vehicle_documents_vehicle_id_fkey";
ALTER TABLE "vehicle_documents" ADD CONSTRAINT "vehicle_documents_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_images" DROP CONSTRAINT IF EXISTS "room_images_room_type_id_fkey";
ALTER TABLE "room_images" ADD CONSTRAINT "room_images_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "hotel_room_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "heritage_destination_images" DROP CONSTRAINT IF EXISTS "heritage_destination_images_site_id_fkey";
ALTER TABLE "heritage_destination_images" ADD CONSTRAINT "heritage_destination_images_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "heritage_sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
