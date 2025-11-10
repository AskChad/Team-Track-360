#!/usr/bin/env node

/**
 * Run Team Members Migrations
 * Runs migrations 006, 007, and 008 to add the team_members table
 */

const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://iccmkpmujtmvtfpvoxli.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImljY21rcG11anRtdnRmcHZveGxpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjQ5NTIwNSwiZXhwIjoyMDcyMDcxMjA1fQ.V48JPvspOn1kCgPMWaBcHL2H4Eq-SuCJCh7RkR_vH90';

async function runMigration(filePath, name) {
  console.log(`Running migration: ${name}`);
  console.log(`File: ${filePath}`);

  // Read SQL file
  const sqlContent = fs.readFileSync(filePath, 'utf8');

  try {
    // Execute via exec_sql function
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: sqlContent
      })
    });

    const result = await response.json();
    console.log('Response:', JSON.stringify(result, null, 2));
    console.log('');

    if (result.success === true) {
      console.log('✓ Migration completed successfully');
    } else {
      console.log('✗ Migration failed');
      console.error('Error:', result);
      process.exit(1);
    }
  } catch (error) {
    console.error('✗ Migration failed with exception');
    console.error('Error:', error.message);
    process.exit(1);
  }

  console.log('---');
  console.log('');
}

async function main() {
  console.log('Running Team Members Migrations...');
  console.log('');

  const migrations = [
    { file: 'supabase/migrations/006_add_team_members_table.sql', name: '006_add_team_members_table' },
    { file: 'supabase/migrations/007_team_members_trigger.sql', name: '007_team_members_trigger' },
    { file: 'supabase/migrations/008_team_members_rls_and_fix_helpers.sql', name: '008_team_members_rls_and_fix_helpers' }
  ];

  for (const migration of migrations) {
    await runMigration(migration.file, migration.name);
  }

  console.log('All migrations completed successfully!');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
