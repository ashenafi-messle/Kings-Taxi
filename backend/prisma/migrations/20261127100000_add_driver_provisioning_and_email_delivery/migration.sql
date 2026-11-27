-- Safe, non-destructive migration for Driver Account Provisioning & Onboarding Email Delivery
-- Preserves all existing driver records and backfills active accounts safely.

DO $$ BEGIN
  CREATE TYPE "DriverOnboardingStatus" AS ENUM (
    'PENDING_ONBOARDING',
    'ONBOARDING_EMAIL_SENT',
    'ONBOARDING_EMAIL_FAILED',
    'ACTIVE',
    'ONBOARDING_EXPIRED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "OnboardingEmailStatus" AS ENUM (
    'NOT_SENT',
    'PENDING',
    'SENT',
    'FAILED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "drivers"
  ADD COLUMN IF NOT EXISTS "must_change_password" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "onboarding_status" "DriverOnboardingStatus" NOT NULL DEFAULT 'PENDING_ONBOARDING',
  ADD COLUMN IF NOT EXISTS "onboarding_email_status" "OnboardingEmailStatus" NOT NULL DEFAULT 'NOT_SENT',
  ADD COLUMN IF NOT EXISTS "onboarding_email_sent_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "onboarding_email_last_attempt_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "onboarding_email_error" TEXT,
  ADD COLUMN IF NOT EXISTS "temp_password_expires_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "account_provisioned_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "account_activated_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "provisioned_by" VARCHAR(128),
  ADD COLUMN IF NOT EXISTS "idempotency_key" VARCHAR(128);

-- Preserve existing ACTIVE drivers so they are not forced into onboarding
UPDATE "drivers"
SET
  "must_change_password" = false,
  "onboarding_status" = 'ACTIVE',
  "account_activated_at" = COALESCE("verified_at", "created_at")
WHERE "account_status" = 'ACTIVE'
  AND "account_provisioned_at" IS NULL
  AND "account_activated_at" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "drivers_idempotency_key_key" ON "drivers"("idempotency_key");
CREATE INDEX IF NOT EXISTS "drivers_onboarding_status_idx" ON "drivers"("onboarding_status");
CREATE INDEX IF NOT EXISTS "drivers_onboarding_email_status_idx" ON "drivers"("onboarding_email_status");
