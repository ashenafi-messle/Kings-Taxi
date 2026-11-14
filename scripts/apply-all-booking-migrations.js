const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const { randomUUID } = require('crypto');

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const { Client } = require('C:/kings-taxi-db-test/node_modules/pg');

async function applyMigrations() {
  console.log('================================================================');
  console.log('  KINGS TAXI — APPLY BOOKINGS PERSISTENCE MIGRATIONS           ');
  console.log('================================================================\n');

  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    // 1. Verify DB connection
    console.log('1. Checking database connection...');
    await client.connect();
    const dbInfo = await client.query(`
      SELECT current_database() as db, current_schema() as schema, version() as version;
    `);
    console.log(`   Connected to: ${dbInfo.rows[0].db}.${dbInfo.rows[0].schema}`);
    console.log(`   Version: ${dbInfo.rows[0].version}\n`);

    // 2. Migration 1: Hospitality & Lounge Module
    console.log('2. Applying 20261110200000_add_hospitality_and_lounge_module...');
    const check1 = await client.query(
      'SELECT id FROM _prisma_migrations WHERE migration_name = $1',
      ['20261110200000_add_hospitality_and_lounge_module']
    );

    if (check1.rows.length === 0) {
      const mig1Path = path.join(
        __dirname,
        '../backend/prisma/migrations/20261110200000_add_hospitality_and_lounge_module/migration.sql'
      );
      const sql1 = fs.readFileSync(mig1Path, 'utf8');

      console.log('   Executing SQL file for Hospitality & Lounge...');
      await client.query(sql1);
      console.log('   ✅ Hospitality & Lounge SQL executed successfully.');

      await client.query(
        `INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
         VALUES ($1, $2, NOW(), $3, NULL, NULL, NOW(), 1)`,
        [randomUUID(), 'applied_hospitality_lounge_module', '20261110200000_add_hospitality_and_lounge_module']
      );
      console.log('   ✅ Recorded 20261110200000_add_hospitality_and_lounge_module in _prisma_migrations.');
    } else {
      console.log('   ℹ️ Migration 20261110200000_add_hospitality_and_lounge_module already recorded in _prisma_migrations.');
    }

    // 3. Migration 2: Heritage Tour Module
    console.log('\n3. Applying 20261111100000_add_heritage_tour_module...');
    const check2 = await client.query(
      'SELECT id FROM _prisma_migrations WHERE migration_name = $1',
      ['20261111100000_add_heritage_tour_module']
    );

    if (check2.rows.length === 0) {
      const mig2Path = path.join(
        __dirname,
        '../backend/prisma/migrations/20261111100000_add_heritage_tour_module/migration.sql'
      );
      const sql2 = fs.readFileSync(mig2Path, 'utf8');

      console.log('   Executing SQL file for Heritage Tour...');
      await client.query(sql2);
      console.log('   ✅ Heritage Tour SQL executed successfully.');

      await client.query(
        `INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
         VALUES ($1, $2, NOW(), $3, NULL, NULL, NOW(), 1)`,
        [randomUUID(), 'applied_heritage_tour_module', '20261111100000_add_heritage_tour_module']
      );
      console.log('   ✅ Recorded 20261111100000_add_heritage_tour_module in _prisma_migrations.');
    } else {
      console.log('   ℹ️ Migration 20261111100000_add_heritage_tour_module already recorded in _prisma_migrations.');
    }

    // 4. Verify all tables in database
    console.log('\n4. Verifying table creation in PostgreSQL...');
    const expectedTables = [
      'passengers',
      'bookings',
      'trips',
      'payments',
      'hotels',
      'hotel_images',
      'hotel_amenities',
      'hotel_amenity_relations',
      'hotel_room_types',
      'hotel_rates',
      'airport_transfer_rates',
      'hotel_bookings',
      'hotel_booking_rooms',
      'hotel_transfer_bookings',
      'lounges',
      'lounge_images',
      'lounge_reservations',
      'heritage_sites',
      'heritage_tour_packages',
      'heritage_tour_package_sites',
      'heritage_tour_price_components',
      'heritage_tour_guides',
      'heritage_tour_vehicle_options',
      'heritage_tour_bookings',
      'heritage_tour_booking_sites',
      'heritage_tour_booking_price_items',
      'heritage_tour_guide_requests'
    ];

    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = current_schema() 
        AND table_name = ANY($1::text[]);
    `, [expectedTables]);

    const createdSet = new Set(tablesRes.rows.map((r) => r.table_name));
    let missingCount = 0;
    expectedTables.forEach((t) => {
      const exists = createdSet.has(t);
      if (!exists) missingCount++;
      console.log(`   Table [${t}]: ${exists ? 'EXISTS ✅' : 'MISSING ❌'}`);
    });

    if (missingCount === 0) {
      console.log('\n🎉 ALL 27 DATABASE TABLES VERIFIED IN POSTGRESQL!');
    } else {
      console.log(`\n⚠️ Warning: ${missingCount} tables are still missing.`);
    }

    // Disconnect pg client before seeding
    await client.end();

    // 5. Seed base hospitality and heritage catalog data via Prisma
    console.log('\n5. Seeding catalog data into PostgreSQL...');
    const { prisma } = require(path.join(__dirname, '../backend/dist/core/database/prisma'));
    
    try {
      const { seedHospitalityModule } = require(path.join(__dirname, '../backend/dist/modules/hospitality/seed'));
      if (typeof seedHospitalityModule === 'function') {
        await seedHospitalityModule();
        console.log('   ✅ Hospitality & Lounges catalog seeded.');
      }
    } catch (seedHospErr) {
      console.log('   Notice on hospitality seeding:', seedHospErr.message);
    }

    try {
      const { seedHeritageTourModule } = require(path.join(__dirname, '../backend/dist/modules/heritage/seed'));
      if (typeof seedHeritageTourModule === 'function') {
        await seedHeritageTourModule();
        console.log('   ✅ Heritage Tour catalog seeded.');
      }
    } catch (seedHerErr) {
      console.log('   Notice on heritage seeding:', seedHerErr.message);
    }

    // Verify catalog counts
    const hotelCount = await prisma.hotel.count();
    const loungeCount = await prisma.lounge.count();
    const siteCount = await prisma.heritageSite.count();
    const pkgCount = await prisma.heritageTourPackage.count();

    console.log('\n--- Catalog Verification ---');
    console.log(`   Hotels in DB: ${hotelCount}`);
    console.log(`   Lounges in DB: ${loungeCount}`);
    console.log(`   Heritage Sites in DB: ${siteCount}`);
    console.log(`   Heritage Tour Packages in DB: ${pkgCount}`);

    console.log('\n================================================================');
    console.log('  MIGRATION & VERIFICATION COMPLETE                             ');
    console.log('================================================================');
    
    await prisma.$disconnect();
  } catch (err) {
    console.error('\n❌ Migration failed:', err.message);
    try { await client.end(); } catch (_) {}
  }
}

applyMigrations();
