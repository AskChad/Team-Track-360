/**
 * Run Database Migrations
 *
 * This script executes SQL migration files in order using the Supabase
 * direct connection (pg library) to avoid RLS restrictions.
 *
 * Usage:
 *   node scripts/run-migrations.js
 *   node scripts/run-migrations.js --specific 002_initial_schema.sql
 *
 * Based on: Attack Kit - Migration Best Practices
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const MIGRATIONS_DIR = path.join(__dirname, '..', 'supabase', 'migrations');
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in .env.local');
  console.error('Please set DATABASE_URL in your .env.local file');
  process.exit(1);
}

/**
 * Connect to PostgreSQL database
 */
async function connect() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  await client.connect();
  return client;
}

/**
 * Read migration files
 */
function getMigrationFiles(specificFile = null) {
  if (specificFile) {
    const filePath = path.join(MIGRATIONS_DIR, specificFile);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Migration file not found: ${specificFile}`);
    }
    return [specificFile];
  }

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort(); // Sort alphabetically (001, 002, 003, etc.)

  return files;
}

/**
 * Execute migration file
 */
async function runMigration(client, filename) {
  console.log(`\n📄 Running migration: ${filename}`);

  const filePath = path.join(MIGRATIONS_DIR, filename);
  const sql = fs.readFileSync(filePath, 'utf-8');

  // Split by semicolon but keep statements together
  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .filter((s) => !s.startsWith('--') || s.includes('\n')); // Keep multi-line statements

  console.log(`   Found ${statements.length} SQL statements`);

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];

    // Skip comment-only statements
    if (statement.trim().startsWith('--') && !statement.includes('\n')) {
      continue;
    }

    try {
      await client.query(statement);

      // Show progress for long migrations
      if (i % 10 === 0 && i > 0) {
        console.log(`   ✓ Executed ${i}/${statements.length} statements...`);
      }
    } catch (error) {
      console.error(`\n❌ Error in statement ${i + 1}:`);
      console.error(`Statement: ${statement.substring(0, 200)}...`);
      console.error(`Error: ${error.message}`);
      throw error;
    }
  }

  console.log(`   ✅ ${filename} completed successfully`);
}

/**
 * Create migrations tracking table
 */
async function createMigrationsTable(client) {
  const sql = `
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      filename TEXT UNIQUE NOT NULL,
      executed_at TIMESTAMPTZ DEFAULT now() NOT NULL,
      checksum TEXT
    );
  `;

  await client.query(sql);
}

/**
 * Check if migration has been run
 */
async function isMigrationRun(client, filename) {
  const result = await client.query(
    'SELECT 1 FROM _migrations WHERE filename = $1',
    [filename]
  );
  return result.rows.length > 0;
}

/**
 * Mark migration as run
 */
async function markMigrationRun(client, filename) {
  await client.query(
    'INSERT INTO _migrations (filename) VALUES ($1) ON CONFLICT (filename) DO NOTHING',
    [filename]
  );
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Team Track 360 - Database Migrations\n');

  // Check for specific migration flag
  const args = process.argv.slice(2);
  const specificFlag = args.indexOf('--specific');
  const specificFile = specificFlag >= 0 ? args[specificFlag + 1] : null;

  let client;

  try {
    // Connect to database
    console.log('📡 Connecting to database...');
    client = await connect();
    console.log('✅ Connected successfully\n');

    // Create migrations tracking table
    await createMigrationsTable(client);

    // Get migration files
    const files = getMigrationFiles(specificFile);
    console.log(`📋 Found ${files.length} migration(s) to process\n`);

    let executed = 0;
    let skipped = 0;

    // Run each migration
    for (const file of files) {
      // Check if already run (skip for specific migration)
      if (!specificFile && (await isMigrationRun(client, file))) {
        console.log(`⏭️  Skipping ${file} (already executed)`);
        skipped++;
        continue;
      }

      await runMigration(client, file);
      await markMigrationRun(client, file);
      executed++;
    }

    console.log('\n' + '='.repeat(50));
    console.log(`✨ Migrations complete!`);
    console.log(`   Executed: ${executed}`);
    console.log(`   Skipped: ${skipped}`);
    console.log('='.repeat(50) + '\n');
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    if (client) {
      await client.end();
    }
  }
}

// Run migrations
main();
