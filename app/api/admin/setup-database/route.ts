import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// This endpoint creates the exec_sql function and runs all migrations
// WARNING: This should only be called once during initial setup

export async function POST(request: Request) {
  try {
    // Verify this is an admin request
    const { authorization } = await request.json();

    // Simple auth check (you should use a proper secret)
    if (authorization !== process.env.ADMIN_SETUP_KEY) {
      return NextResponse.json({
        error: 'Unauthorized'
      }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Step 1: Create exec_sql function
    console.log('Creating exec_sql function...');

    const createFunctionSQL = `
CREATE OR REPLACE FUNCTION public.exec_sql(query text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_count integer;
BEGIN
  EXECUTE query;
  GET DIAGNOSTICS result_count = ROW_COUNT;
  RETURN json_build_object(
    'success', true,
    'message', 'Query executed successfully',
    'rows_affected', result_count
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO service_role;
`;

    // Try to create the function
    let { data: funcData, error: funcError } = await supabase.rpc('exec_sql', { query: createFunctionSQL });

    // If function doesn't exist, we can't create it this way
    if (funcError && funcError.code === 'PGRST202') {
      return NextResponse.json({
        error: 'exec_sql function does not exist',
        message: 'Please create it manually in Supabase Dashboard SQL Editor',
        sql: createFunctionSQL,
        instructions: 'Go to https://supabase.com/dashboard/project/iccmkpmujtmvtfpvoxli/sql/new and run the SQL provided'
      }, { status: 400 });
    }

    if (funcError) {
      return NextResponse.json({
        error: 'Failed to create exec_sql function',
        details: funcError
      }, { status: 500 });
    }

    // Step 2: Run migrations
    console.log('Running migrations...');

    const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
    const migrationFiles = [
      '001_initial_schema.sql',
      '002_initial_schema_part2.sql',
      '003_triggers_updated_at.sql',
      '004_rls_policies.sql',
      '005_seed_data.sql'
    ];

    const results = [];

    for (const file of migrationFiles) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      const { data, error } = await supabase.rpc('exec_sql', { query: sql });

      results.push({
        file,
        success: !error && (!data || data.success !== false),
        error: error?.message || (data && !data.success ? data.error : null),
        size: `${(sql.length / 1024).toFixed(1)}KB`
      });

      // Small delay between migrations
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return NextResponse.json({
      message: 'Database setup completed',
      results
    });

  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

// GET endpoint to check if exec_sql exists
export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase.rpc('exec_sql', { query: 'SELECT 1 as test' });

    if (error && error.code === 'PGRST202') {
      return NextResponse.json({
        exists: false,
        message: 'exec_sql function does not exist',
        createSQL: `
CREATE OR REPLACE FUNCTION public.exec_sql(query text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_count integer;
BEGIN
  EXECUTE query;
  GET DIAGNOSTICS result_count = ROW_COUNT;
  RETURN json_build_object(
    'success', true,
    'message', 'Query executed successfully',
    'rows_affected', result_count
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO service_role;
`
      });
    }

    return NextResponse.json({
      exists: true,
      message: 'exec_sql function is available',
      test: data
    });

  } catch (error: any) {
    return NextResponse.json({
      error: error.message
    }, { status: 500 });
  }
}
