-- CreateTable: admin_password_resets
CREATE TABLE IF NOT EXISTS "admin_password_resets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "admin_user_id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "otp_hash" VARCHAR(255) NOT NULL,
    "salt" VARCHAR(128) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 5,
    "resend_cooldown_until" TIMESTAMPTZ(6) NOT NULL,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" TIMESTAMPTZ(6),
    "reset_token_hash" VARCHAR(255),
    "reset_token_expires_at" TIMESTAMPTZ(6),
    "is_consumed" BOOLEAN NOT NULL DEFAULT false,
    "consumed_at" TIMESTAMPTZ(6),
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(512),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_password_resets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "admin_password_resets_admin_user_id_idx" ON "admin_password_resets"("admin_user_id");
CREATE INDEX IF NOT EXISTS "admin_password_resets_email_idx" ON "admin_password_resets"("email");
CREATE INDEX IF NOT EXISTS "admin_password_resets_reset_token_hash_idx" ON "admin_password_resets"("reset_token_hash");
CREATE INDEX IF NOT EXISTS "admin_password_resets_expires_at_idx" ON "admin_password_resets"("expires_at");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'admin_password_resets_admin_user_id_fkey'
  ) THEN
    ALTER TABLE "admin_password_resets" ADD CONSTRAINT "admin_password_resets_admin_user_id_fkey"
    FOREIGN KEY ("admin_user_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
