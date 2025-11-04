import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// This endpoint should only be called once during initial setup
// Consider removing or securing this endpoint after migrations are complete

export async function POST(request: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

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

      // Try to execute via RPC if available
      const { data, error } = await supabase.rpc('exec_sql', { sql });

      results.push({
        file,
        success: !error,
        error: error?.message,
        size: `${(sql.length / 1024).toFixed(1)}KB`
      });
    }

    return NextResponse.json({
      message: 'Migration attempt completed',
      results
    });

  } catch (error: any) {
    return NextResponse.json({
      error: error.message
    }, { status: 500 });
  }
}
