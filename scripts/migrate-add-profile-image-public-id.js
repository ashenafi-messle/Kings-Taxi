const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const { prisma } = require(path.join(__dirname, '../backend/dist/core/database/prisma'));

async function migrate() {
  console.log('=== RUNNING DATABASE SCHEMA MIGRATION ===');
  try {
    // 1. Add profile_image_public_id column
    console.log('1. Adding profile_image_public_id column...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "passengers" 
      ADD COLUMN IF NOT EXISTS "profile_image_public_id" VARCHAR(255);
    `);
    console.log('   -> Column profile_image_public_id ensured in table passengers.');

    // 2. Add Index
    console.log('2. Ensuring index on profile_image_public_id...');
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "idx_passengers_profile_image_public_id" 
      ON "passengers"("profile_image_public_id");
    `);
    console.log('   -> Index idx_passengers_profile_image_public_id ensured.');

    // 3. Backfill publicId for passenger 55e44211-7723-4df7-872d-4b1e2e6d7f8e if empty
    console.log('3. Backfilling canonical publicId for existing avatar...');
    const result = await prisma.$executeRawUnsafe(`
      UPDATE "passengers"
      SET "profile_image_public_id" = 'kings-taxi/passengers/55e44211-7723-4df7-872d-4b1e2e6d7f8e/qj7wuf2mqs0v83wjv012'
      WHERE id = '55e44211-7723-4df7-872d-4b1e2e6d7f8e' 
        AND ("profile_image_public_id" IS NULL OR "profile_image_public_id" = '');
    `);
    console.log(`   -> Backfill completed (Rows updated: ${result}).`);

    console.log('\n🎉 ALL DATABASE MIGRATIONS COMPLETED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

migrate();
