#!/bin/bash

# Run Team Members Migrations
# This script runs migrations 006, 007, and 008 to add the team_members table

set -e  # Exit on error

SUPABASE_URL="https://iccmkpmujtmvtfpvoxli.supabase.co"
SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImljY21rcG11anRtdnRmcHZveGxpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjQ5NTIwNSwiZXhwIjoyMDcyMDcxMjA1fQ.V48JPvspOn1kCgPMWaBcHL2H4Eq-SuCJCh7RkR_vH90"

echo "Running Team Members Migrations..."
echo ""

# Function to run SQL file
run_migration() {
  local file=$1
  local name=$2

  echo "Running migration: $name"
  echo "File: $file"

  # Read SQL file
  sql_content=$(cat "$file")

  # Escape the SQL for JSON
  sql_escaped=$(echo "$sql_content" | jq -Rs .)

  # Execute via exec_sql function
  response=$(curl -s -X POST \
    "${SUPABASE_URL}/rest/v1/rpc/exec_sql" \
    -H "apikey: ${SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"query\": ${sql_escaped}}")

  echo "Response: $response"
  echo ""

  # Check if successful
  if echo "$response" | jq -e '.success == true' > /dev/null 2>&1; then
    echo "✓ Migration completed successfully"
  else
    echo "✗ Migration failed"
    echo "Error: $response"
    exit 1
  fi

  echo "---"
  echo ""
}

# Run migrations in order
run_migration "supabase/migrations/006_add_team_members_table.sql" "006_add_team_members_table"
run_migration "supabase/migrations/007_team_members_trigger.sql" "007_team_members_trigger"
run_migration "supabase/migrations/008_team_members_rls_and_fix_helpers.sql" "008_team_members_rls_and_fix_helpers"

echo "All migrations completed successfully!"
