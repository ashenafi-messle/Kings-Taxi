-- Safe, non-destructive additive migration to ensure hotels.category exists and matches schema.prisma
ALTER TABLE "hotels" ADD COLUMN IF NOT EXISTS "category" "HotelCategory" NOT NULL DEFAULT 'BOUTIQUE_HERITAGE';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hotels' AND column_name = 'hotel_category'
  ) THEN
    EXECUTE 'UPDATE "hotels" SET "category" = "hotel_category" WHERE "hotel_category" IS NOT NULL';
  END IF;
END $$;
