-- Non-destructive additive migration for Date-Based Hotel Room Inventory Synchronization

DO $$ BEGIN
  CREATE TYPE "InventoryReservationStatus" AS ENUM ('RESERVED', 'CONFIRMED', 'RELEASED', 'EXPIRED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "InventoryTransactionType" AS ENUM ('RESERVE', 'CONFIRM', 'RELEASE', 'EXPIRE', 'CANCEL', 'BLOCK', 'UNBLOCK', 'ADJUST_TOTAL');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "hotel_room_inventories" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "hotel_id" UUID NOT NULL,
  "room_type_id" UUID NOT NULL,
  "inventory_date" DATE NOT NULL,
  "total_rooms" INTEGER NOT NULL,
  "reserved_rooms" INTEGER NOT NULL DEFAULT 0,
  "confirmed_rooms" INTEGER NOT NULL DEFAULT 0,
  "blocked_rooms" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "hotel_room_inventories_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "hotel_room_inventories_room_type_id_inventory_date_key" UNIQUE ("room_type_id", "inventory_date"),
  CONSTRAINT "hotel_room_inventories_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "hotel_room_inventories_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "hotel_room_types"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "hotel_room_inventories_hotel_id_inventory_date_idx" ON "hotel_room_inventories"("hotel_id", "inventory_date");
CREATE INDEX IF NOT EXISTS "hotel_room_inventories_room_type_id_inventory_date_idx" ON "hotel_room_inventories"("room_type_id", "inventory_date");

CREATE TABLE IF NOT EXISTS "hotel_inventory_reservations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "booking_id" UUID NOT NULL,
  "hotel_id" UUID NOT NULL,
  "room_type_id" UUID NOT NULL,
  "check_in_date" DATE NOT NULL,
  "check_out_date" DATE NOT NULL,
  "quantity" INTEGER NOT NULL,
  "reservation_status" "InventoryReservationStatus" NOT NULL DEFAULT 'RESERVED',
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "released_at" TIMESTAMPTZ(6),
  "confirmed_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "hotel_inventory_reservations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "hotel_inventory_reservations_booking_id_room_type_id_key" UNIQUE ("booking_id", "room_type_id"),
  CONSTRAINT "hotel_inventory_reservations_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "hotel_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "hotel_inventory_reservations_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "hotel_inventory_reservations_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "hotel_room_types"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "hotel_inventory_reservations_reservation_status_expires_at_idx" ON "hotel_inventory_reservations"("reservation_status", "expires_at");
CREATE INDEX IF NOT EXISTS "hotel_inventory_reservations_hotel_id_room_type_id_idx" ON "hotel_inventory_reservations"("hotel_id", "room_type_id");

CREATE TABLE IF NOT EXISTS "hotel_inventory_transactions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "hotel_id" UUID NOT NULL,
  "room_type_id" UUID NOT NULL,
  "booking_id" UUID,
  "inventory_date" DATE NOT NULL,
  "transaction_type" "InventoryTransactionType" NOT NULL,
  "quantity" INTEGER NOT NULL,
  "idempotency_key" VARCHAR(128) NOT NULL,
  "actor_id" VARCHAR(128),
  "note" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "hotel_inventory_transactions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "hotel_inventory_transactions_idempotency_key_key" UNIQUE ("idempotency_key")
);

CREATE INDEX IF NOT EXISTS "hotel_inventory_transactions_hotel_id_room_type_id_inventory_date_idx" ON "hotel_inventory_transactions"("hotel_id", "room_type_id", "inventory_date");
CREATE INDEX IF NOT EXISTS "hotel_inventory_transactions_booking_id_idx" ON "hotel_inventory_transactions"("booking_id");
