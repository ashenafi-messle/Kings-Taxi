-- CreateEnum
CREATE TYPE "HotelStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'UNPUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RoomTypeStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "RateStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "HotelBookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED', 'CANCELLED', 'COMPLETED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('REQUESTED', 'CONFIRMED', 'DRIVER_ASSIGNED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LoungeReservationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('TAXI_RIDE', 'HOTEL_RESERVATION', 'AIRPORT_TRANSFER', 'LOUNGE_ACCESS');

-- AlterTable
ALTER TABLE "payments" ADD COLUMN "hotel_booking_id" UUID,
ADD COLUMN "payment_type" "PaymentType" NOT NULL DEFAULT 'TAXI_RIDE',
ALTER COLUMN "booking_id" DROP NOT NULL;

-- CreateTable
CREATE TABLE "hotels" (
    "id" UUID NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "slug" VARCHAR(128) NOT NULL,
    "description" TEXT NOT NULL,
    "short_description" VARCHAR(255),
    "address" VARCHAR(255) NOT NULL,
    "city" VARCHAR(64) NOT NULL DEFAULT 'Gondar',
    "sub_city" VARCHAR(64),
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "contact_phone" VARCHAR(32) NOT NULL,
    "contact_email" VARCHAR(255),
    "website" VARCHAR(255),
    "star_rating" INTEGER DEFAULT 4,
    "check_in_time" VARCHAR(16) NOT NULL DEFAULT '14:00',
    "check_out_time" VARCHAR(16) NOT NULL DEFAULT '11:00',
    "timezone" VARCHAR(64) NOT NULL DEFAULT 'Africa/Addis_Ababa',
    "status" "HotelStatus" NOT NULL DEFAULT 'DRAFT',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by_admin_id" UUID,
    "updated_by_admin_id" UUID,

    CONSTRAINT "hotels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotel_images" (
    "id" UUID NOT NULL,
    "hotel_id" UUID NOT NULL,
    "image_url" VARCHAR(512) NOT NULL,
    "public_id" VARCHAR(255),
    "alt_text" VARCHAR(255),
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_cover" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hotel_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotel_amenities" (
    "id" UUID NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "slug" VARCHAR(64) NOT NULL,
    "icon" VARCHAR(64),
    "description" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hotel_amenities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotel_amenity_relations" (
    "id" UUID NOT NULL,
    "hotel_id" UUID NOT NULL,
    "amenity_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hotel_amenity_relations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotel_room_types" (
    "id" UUID NOT NULL,
    "hotel_id" UUID NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "description" TEXT,
    "maximum_adults" INTEGER NOT NULL DEFAULT 2,
    "maximum_children" INTEGER NOT NULL DEFAULT 1,
    "maximum_guests" INTEGER NOT NULL DEFAULT 3,
    "total_inventory" INTEGER NOT NULL DEFAULT 10,
    "base_price_per_night" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(8) NOT NULL DEFAULT 'ETB',
    "status" "RoomTypeStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "hotel_room_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotel_rates" (
    "id" UUID NOT NULL,
    "room_type_id" UUID NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "price_per_night" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(8) NOT NULL DEFAULT 'ETB',
    "minimum_nights" INTEGER NOT NULL DEFAULT 1,
    "status" "RateStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "hotel_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "airport_transfer_rates" (
    "id" UUID NOT NULL,
    "hotel_id" UUID NOT NULL,
    "origin_name" VARCHAR(128) NOT NULL DEFAULT 'Atse Tewodros Airport (GDQ), Gondar',
    "origin_type" VARCHAR(64) NOT NULL DEFAULT 'AIRPORT',
    "destination_name" VARCHAR(128) NOT NULL,
    "vehicle_type" "VehicleType" NOT NULL DEFAULT 'STANDARD_SEDAN',
    "vehicle_capacity" INTEGER NOT NULL DEFAULT 4,
    "fixed_price" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(8) NOT NULL DEFAULT 'ETB',
    "effective_from" DATE NOT NULL,
    "effective_until" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by_admin_id" UUID,

    CONSTRAINT "airport_transfer_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotel_bookings" (
    "id" UUID NOT NULL,
    "booking_reference" VARCHAR(64) NOT NULL,
    "passenger_id" UUID NOT NULL,
    "hotel_id" UUID NOT NULL,
    "check_in_date" DATE NOT NULL,
    "check_out_date" DATE NOT NULL,
    "adults" INTEGER NOT NULL DEFAULT 1,
    "children" INTEGER NOT NULL DEFAULT 0,
    "number_of_rooms" INTEGER NOT NULL DEFAULT 1,
    "currency" VARCHAR(8) NOT NULL DEFAULT 'ETB',
    "room_subtotal" DECIMAL(10,2) NOT NULL,
    "transfer_subtotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "additional_fees" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "grand_total" DECIMAL(10,2) NOT NULL,
    "booking_status" "HotelBookingStatus" NOT NULL DEFAULT 'PENDING',
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "special_requests" TEXT,
    "price_snapshot" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "confirmed_at" TIMESTAMPTZ(6),
    "cancelled_at" TIMESTAMPTZ(6),

    CONSTRAINT "hotel_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotel_booking_rooms" (
    "id" UUID NOT NULL,
    "hotel_booking_id" UUID NOT NULL,
    "room_type_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "guests_allocated" INTEGER NOT NULL DEFAULT 1,
    "nightly_rate_snapshot" DECIMAL(10,2) NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hotel_booking_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotel_transfer_bookings" (
    "id" UUID NOT NULL,
    "hotel_booking_id" UUID NOT NULL,
    "airport_transfer_rate_id" UUID NOT NULL,
    "pickup_location" VARCHAR(255) NOT NULL DEFAULT 'Atse Tewodros Airport (GDQ), Gondar',
    "pickup_date" DATE NOT NULL,
    "pickup_time" VARCHAR(16) NOT NULL,
    "flight_number" VARCHAR(32),
    "passengers" INTEGER NOT NULL DEFAULT 1,
    "selected_vehicle_type" "VehicleType" NOT NULL DEFAULT 'STANDARD_SEDAN',
    "fixed_fare_snapshot" DECIMAL(10,2) NOT NULL,
    "transfer_status" "TransferStatus" NOT NULL DEFAULT 'REQUESTED',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "hotel_transfer_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lounges" (
    "id" UUID NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "slug" VARCHAR(128) NOT NULL,
    "description" TEXT NOT NULL,
    "short_description" VARCHAR(255),
    "address" VARCHAR(255) NOT NULL,
    "city" VARCHAR(64) NOT NULL DEFAULT 'Gondar',
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "contact_phone" VARCHAR(32) NOT NULL,
    "contact_email" VARCHAR(255),
    "operating_hours" VARCHAR(128) NOT NULL DEFAULT '06:00 - 23:00',
    "amenities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "status" "HotelStatus" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_by_admin_id" UUID,

    CONSTRAINT "lounges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lounge_images" (
    "id" UUID NOT NULL,
    "lounge_id" UUID NOT NULL,
    "image_url" VARCHAR(512) NOT NULL,
    "alt_text" VARCHAR(255),
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_cover" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lounge_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lounge_reservations" (
    "id" UUID NOT NULL,
    "reservation_reference" VARCHAR(64) NOT NULL,
    "lounge_id" UUID NOT NULL,
    "passenger_id" UUID NOT NULL,
    "reservation_date" DATE NOT NULL,
    "reservation_time" VARCHAR(16) NOT NULL,
    "guests_count" INTEGER NOT NULL DEFAULT 1,
    "special_requests" TEXT,
    "status" "LoungeReservationStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "lounge_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payments_hotel_booking_id_key" ON "payments"("hotel_booking_id");

-- CreateIndex
CREATE UNIQUE INDEX "hotels_slug_key" ON "hotels"("slug");
CREATE INDEX "hotels_city_status_idx" ON "hotels"("city", "status");
CREATE INDEX "hotels_featured_status_idx" ON "hotels"("featured", "status");
CREATE INDEX "hotels_slug_idx" ON "hotels"("slug");
CREATE INDEX "hotels_created_at_idx" ON "hotels"("created_at");

-- CreateIndex
CREATE INDEX "hotel_images_hotel_id_display_order_idx" ON "hotel_images"("hotel_id", "display_order");

-- CreateIndex
CREATE UNIQUE INDEX "hotel_amenities_name_key" ON "hotel_amenities"("name");
CREATE UNIQUE INDEX "hotel_amenities_slug_key" ON "hotel_amenities"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "hotel_amenity_relations_hotel_id_amenity_id_key" ON "hotel_amenity_relations"("hotel_id", "amenity_id");
CREATE INDEX "hotel_amenity_relations_hotel_id_idx" ON "hotel_amenity_relations"("hotel_id");
CREATE INDEX "hotel_amenity_relations_amenity_id_idx" ON "hotel_amenity_relations"("amenity_id");

-- CreateIndex
CREATE INDEX "hotel_room_types_hotel_id_status_idx" ON "hotel_room_types"("hotel_id", "status");

-- CreateIndex
CREATE INDEX "hotel_rates_room_type_id_start_date_end_date_status_idx" ON "hotel_rates"("room_type_id", "start_date", "end_date", "status");

-- CreateIndex
CREATE INDEX "airport_transfer_rates_hotel_id_is_active_effective_from_idx" ON "airport_transfer_rates"("hotel_id", "is_active", "effective_from");

-- CreateIndex
CREATE UNIQUE INDEX "hotel_bookings_booking_reference_key" ON "hotel_bookings"("booking_reference");
CREATE INDEX "hotel_bookings_passenger_id_booking_status_idx" ON "hotel_bookings"("passenger_id", "booking_status");
CREATE INDEX "hotel_bookings_hotel_id_check_in_date_check_out_date_idx" ON "hotel_bookings"("hotel_id", "check_in_date", "check_out_date");
CREATE INDEX "hotel_bookings_booking_reference_idx" ON "hotel_bookings"("booking_reference");
CREATE INDEX "hotel_bookings_created_at_idx" ON "hotel_bookings"("created_at");

-- CreateIndex
CREATE INDEX "hotel_booking_rooms_hotel_booking_id_idx" ON "hotel_booking_rooms"("hotel_booking_id");
CREATE INDEX "hotel_booking_rooms_room_type_id_idx" ON "hotel_booking_rooms"("room_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "hotel_transfer_bookings_hotel_booking_id_key" ON "hotel_transfer_bookings"("hotel_booking_id");
CREATE INDEX "hotel_transfer_bookings_airport_transfer_rate_id_idx" ON "hotel_transfer_bookings"("airport_transfer_rate_id");
CREATE INDEX "hotel_transfer_bookings_transfer_status_idx" ON "hotel_transfer_bookings"("transfer_status");

-- CreateIndex
CREATE UNIQUE INDEX "lounges_slug_key" ON "lounges"("slug");
CREATE INDEX "lounges_city_status_idx" ON "lounges"("city", "status");
CREATE INDEX "lounges_featured_status_idx" ON "lounges"("featured", "status");
CREATE INDEX "lounges_slug_idx" ON "lounges"("slug");

-- CreateIndex
CREATE INDEX "lounge_images_lounge_id_display_order_idx" ON "lounge_images"("lounge_id", "display_order");

-- CreateIndex
CREATE UNIQUE INDEX "lounge_reservations_reservation_reference_key" ON "lounge_reservations"("reservation_reference");
CREATE INDEX "lounge_reservations_passenger_id_status_idx" ON "lounge_reservations"("passenger_id", "status");
CREATE INDEX "lounge_reservations_lounge_id_reservation_date_idx" ON "lounge_reservations"("lounge_id", "reservation_date");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_hotel_booking_id_fkey" FOREIGN KEY ("hotel_booking_id") REFERENCES "hotel_bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_images" ADD CONSTRAINT "hotel_images_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_amenity_relations" ADD CONSTRAINT "hotel_amenity_relations_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_amenity_relations" ADD CONSTRAINT "hotel_amenity_relations_amenity_id_fkey" FOREIGN KEY ("amenity_id") REFERENCES "hotel_amenities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_room_types" ADD CONSTRAINT "hotel_room_types_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_rates" ADD CONSTRAINT "hotel_rates_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "hotel_room_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "airport_transfer_rates" ADD CONSTRAINT "airport_transfer_rates_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_bookings" ADD CONSTRAINT "hotel_bookings_passenger_id_fkey" FOREIGN KEY ("passenger_id") REFERENCES "passengers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_bookings" ADD CONSTRAINT "hotel_bookings_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_booking_rooms" ADD CONSTRAINT "hotel_booking_rooms_hotel_booking_id_fkey" FOREIGN KEY ("hotel_booking_id") REFERENCES "hotel_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_booking_rooms" ADD CONSTRAINT "hotel_booking_rooms_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "hotel_room_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_transfer_bookings" ADD CONSTRAINT "hotel_transfer_bookings_hotel_booking_id_fkey" FOREIGN KEY ("hotel_booking_id") REFERENCES "hotel_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_transfer_bookings" ADD CONSTRAINT "hotel_transfer_bookings_airport_transfer_rate_id_fkey" FOREIGN KEY ("airport_transfer_rate_id") REFERENCES "airport_transfer_rates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lounge_images" ADD CONSTRAINT "lounge_images_lounge_id_fkey" FOREIGN KEY ("lounge_id") REFERENCES "lounges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lounge_reservations" ADD CONSTRAINT "lounge_reservations_lounge_id_fkey" FOREIGN KEY ("lounge_id") REFERENCES "lounges"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lounge_reservations" ADD CONSTRAINT "lounge_reservations_passenger_id_fkey" FOREIGN KEY ("passenger_id") REFERENCES "passengers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

