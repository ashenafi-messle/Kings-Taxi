-- Add SYSTEM sender type, sequence for ticket numbers, support_attachments, and support_ticket_audit_logs
ALTER TYPE "SupportSenderType" ADD VALUE IF NOT EXISTS 'SYSTEM';

CREATE SEQUENCE IF NOT EXISTS "support_ticket_number_seq" START WITH 1 INCREMENT BY 1;

CREATE TABLE IF NOT EXISTS "support_attachments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "ticket_id" UUID NOT NULL,
  "message_id" UUID,
  "uploaded_by_type" "SupportSenderType" NOT NULL DEFAULT 'PASSENGER',
  "uploaded_by_id" UUID,
  "file_url" TEXT NOT NULL,
  "cloudinary_public_id" VARCHAR(255) NOT NULL,
  "mime_type" VARCHAR(64) NOT NULL,
  "file_size_bytes" INTEGER NOT NULL,
  "original_filename" VARCHAR(255),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "support_attachments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "support_attachments_ticket_id_fkey"
    FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "support_attachments_message_id_fkey"
    FOREIGN KEY ("message_id") REFERENCES "support_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "support_attachments_ticket_id_created_at_idx"
  ON "support_attachments"("ticket_id", "created_at");
CREATE INDEX IF NOT EXISTS "support_attachments_message_id_idx"
  ON "support_attachments"("message_id");

CREATE TABLE IF NOT EXISTS "support_ticket_audit_logs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "ticket_id" UUID NOT NULL,
  "actor_type" "SupportSenderType" NOT NULL DEFAULT 'ADMIN',
  "actor_id" UUID,
  "actor_name" VARCHAR(128) NOT NULL,
  "action" VARCHAR(64) NOT NULL,
  "previous_value" JSONB,
  "new_value" JSONB,
  "note" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "support_ticket_audit_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "support_ticket_audit_logs_ticket_id_fkey"
    FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "support_ticket_audit_logs_ticket_id_created_at_idx"
  ON "support_ticket_audit_logs"("ticket_id", "created_at");
CREATE INDEX IF NOT EXISTS "support_ticket_audit_logs_action_idx"
  ON "support_ticket_audit_logs"("action");
