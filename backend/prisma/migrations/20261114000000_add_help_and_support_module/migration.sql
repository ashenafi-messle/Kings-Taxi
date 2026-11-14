-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "SupportCategory" AS ENUM ('RIDE_ISSUE', 'BOOKING_ISSUE', 'PAYMENT_ISSUE', 'ACCOUNT_ISSUE', 'DRIVER_BEHAVIOR', 'SAFETY_CONCERN', 'APP_TECHNICAL_ISSUE', 'OTHER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "SupportTicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING_FOR_PASSENGER', 'RESOLVED', 'CLOSED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "SupportSenderType" AS ENUM ('PASSENGER', 'ADMIN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "support_tickets" (
    "id" UUID NOT NULL,
    "ticket_number" VARCHAR(32) NOT NULL,
    "passenger_id" UUID NOT NULL,
    "category" "SupportCategory" NOT NULL DEFAULT 'OTHER',
    "subject" VARCHAR(160) NOT NULL,
    "status" "SupportTicketStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "SupportPriority" NOT NULL DEFAULT 'MEDIUM',
    "assigned_admin_id" UUID,
    "assigned_admin_name" VARCHAR(128),
    "booking_id" UUID,
    "booking_type" VARCHAR(32),
    "last_message_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMPTZ(6),
    "closed_at" TIMESTAMPTZ(6),
    "resolution_notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "support_messages" (
    "id" UUID NOT NULL,
    "ticket_id" UUID NOT NULL,
    "sender_type" "SupportSenderType" NOT NULL DEFAULT 'PASSENGER',
    "passenger_id" UUID,
    "admin_id" UUID,
    "sender_name" VARCHAR(128) NOT NULL,
    "message" TEXT NOT NULL,
    "read_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "support_tickets_ticket_number_key" ON "support_tickets"("ticket_number");
CREATE INDEX IF NOT EXISTS "support_tickets_passenger_id_status_idx" ON "support_tickets"("passenger_id", "status");
CREATE INDEX IF NOT EXISTS "support_tickets_status_idx" ON "support_tickets"("status");
CREATE INDEX IF NOT EXISTS "support_tickets_category_idx" ON "support_tickets"("category");
CREATE INDEX IF NOT EXISTS "support_tickets_ticket_number_idx" ON "support_tickets"("ticket_number");
CREATE INDEX IF NOT EXISTS "support_tickets_last_message_at_idx" ON "support_tickets"("last_message_at");
CREATE INDEX IF NOT EXISTS "support_tickets_created_at_idx" ON "support_tickets"("created_at");

CREATE INDEX IF NOT EXISTS "support_messages_ticket_id_created_at_idx" ON "support_messages"("ticket_id", "created_at");
CREATE INDEX IF NOT EXISTS "support_messages_sender_type_read_at_idx" ON "support_messages"("sender_type", "read_at");
CREATE INDEX IF NOT EXISTS "support_messages_created_at_idx" ON "support_messages"("created_at");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_passenger_id_fkey" FOREIGN KEY ("passenger_id") REFERENCES "passengers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_passenger_id_fkey" FOREIGN KEY ("passenger_id") REFERENCES "passengers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

