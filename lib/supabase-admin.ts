/**
 * Supabase Admin Client - Service Role Client (Bypasses RLS)
 *
 * SECURITY WARNING:
 * - This client bypasses ALL Row Level Security policies
 * - Only use server-side (API routes, server components)
 * - Never expose service role key to client
 * - Implement your own access control when using this client
 *
 * Based on Attack Kit Section 7: Database Standards
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase service role credentials. Check .env.local');
}

/**
 * Admin Supabase client with service role key
 * - Bypasses all RLS policies
 * - Full database access
 * - Server-side use ONLY
 * - Never expose to client
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

/**
 * Execute raw SQL query using RPC function
 *
 * SECURITY:
 * - Only callable by platform_admin or super_admin
 * - Requires exec_sql() function to be created in database
 * - See supabase/migrations/002_create_exec_sql_function.sql
 *
 * Usage:
 * ```typescript
 * const result = await execSQL(`
 *   SELECT * FROM users WHERE created_at > NOW() - INTERVAL '7 days'
 * `);
 * ```
 *
 * @param query - Raw SQL query to execute
 * @returns Query result as JSONB
 */
export async function execSQL(query: string) {
  const { data, error } = await supabaseAdmin.rpc('exec_sql', { query });

  if (error) {
    console.error('exec_sql error:', error);
    throw new Error(`Database query failed: ${error.message}`);
  }

  return data;
}

/**
 * Execute SQL file from migrations directory
 *
 * Usage:
 * ```typescript
 * await execSQLFile('001_initial_schema.sql');
 * ```
 *
 * @param filename - Migration filename (relative to supabase/migrations/)
 */
export async function execSQLFile(filename: string) {
  const fs = require('fs');
  const path = require('path');

  const migrationPath = path.join(
    process.cwd(),
    'supabase',
    'migrations',
    filename
  );

  if (!fs.existsSync(migrationPath)) {
    throw new Error(`Migration file not found: ${filename}`);
  }

  const sql = fs.readFileSync(migrationPath, 'utf-8');

  // Split by semicolons and execute each statement
  const statements = sql
    .split(';')
    .map((s: string) => s.trim())
    .filter((s: string) => s.length > 0 && !s.startsWith('--'));

  for (const statement of statements) {
    try {
      await execSQL(statement);
    } catch (error: any) {
      console.error(`Failed to execute statement: ${statement.substring(0, 100)}...`);
      throw error;
    }
  }

  return { success: true, filename, statementsExecuted: statements.length };
}

/**
 * Direct PostgreSQL connection using DATABASE_URL
 * For complex migrations and operations that need direct DB access
 *
 * Usage:
 * ```typescript
 * import { executeDirectSQL } from '@/lib/supabase-admin';
 *
 * await executeDirectSQL(`
 *   CREATE TABLE IF NOT EXISTS my_table (
 *     id UUID PRIMARY KEY DEFAULT gen_random_uuid()
 *   );
 * `);
 * ```
 */
export async function executeDirectSQL(sql: string) {
  const { Client } = require('pg');

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    await client.connect();
    const result = await client.query(sql);
    await client.end();
    return result;
  } catch (error: any) {
    console.error('Direct SQL execution error:', error);
    await client.end();
    throw new Error(`Direct SQL failed: ${error.message}`);
  }
}

/**
 * Execute SQL with parameters (prevents SQL injection)
 *
 * Usage:
 * ```typescript
 * await executeSQL(
 *   'SELECT * FROM users WHERE email = $1 AND role = $2',
 *   ['user@example.com', 'admin']
 * );
 * ```
 */
export async function executeSQLWithParams(sql: string, params: any[]) {
  const { Client } = require('pg');

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    await client.connect();
    const result = await client.query(sql, params);
    await client.end();
    return result;
  } catch (error: any) {
    console.error('Parameterized SQL execution error:', error);
    await client.end();
    throw new Error(`Parameterized SQL failed: ${error.message}`);
  }
}
