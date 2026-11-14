const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const { randomUUID } = require('crypto');

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const { Client } = require('C:/kings-taxi-db-test/node_modules/pg');

async function applySupportMigration() {
  console.log('================================================================');
  console.log('  KINGS TAXI — APPLY HELP & SUPPORT DATABASE MIGRATION          ');
  console.log('================================================================\n');

  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log('1. Connecting to PostgreSQL...');
    await client.connect();
    const dbInfo = await client.query(`
      SELECT current_database() as db, current_schema() as schema, version() as version;
    `);
    console.log(`   Connected to: ${dbInfo.rows[0].db}.${dbInfo.rows[0].schema}`);
    console.log(`   Version: ${dbInfo.rows[0].version}\n`);

    const migrationName = '20261114000000_add_help_and_support_module';
    console.log(`2. Checking migration status for [${migrationName}]...`);
    const check = await client.query(
      'SELECT id FROM _prisma_migrations WHERE migration_name = $1',
      [migrationName]
    );

    const migPath = path.join(
      __dirname,
      '../backend/prisma/migrations/20261114000000_add_help_and_support_module/migration.sql'
    );
    const sql = fs.readFileSync(migPath, 'utf8');

    console.log('   Executing SQL DDL...');
    await client.query(sql);
    console.log('   ✅ DDL executed successfully.');

    if (check.rows.length === 0) {
      await client.query(
        `INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
         VALUES ($1, $2, NOW(), $3, NULL, NULL, NOW(), 1)`,
        [randomUUID(), 'applied_help_and_support_module', migrationName]
      );
      console.log(`   ✅ Recorded ${migrationName} in _prisma_migrations.`);
    } else {
      console.log(`   ℹ️ Already recorded in _prisma_migrations.`);
    }

    // 3. Verify tables and columns
    console.log('\n3. Verifying support_tickets and support_messages tables...');
    const tables = ['support_tickets', 'support_messages'];
    for (const tbl of tables) {
      const res = await client.query(
        "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position",
        [tbl]
      );
      if (res.rows.length > 0) {
        console.log(`   ✅ Table [${tbl}] exists with ${res.rows.length} columns:`);
        res.rows.forEach(r => console.log(`      - ${r.column_name} (${r.data_type}, nullable: ${r.is_nullable})`));
      } else {
        throw new Error(`Table [${tbl}] was not found!`);
      }
    }

    console.log('\n🎉 HELP & SUPPORT DATABASE TABLES SUCCESSFULLY INITIALIZED & VERIFIED!\n');
  } catch (err) {
    console.error('\n❌ Migration failed:', err.message);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applySupportMigration();

