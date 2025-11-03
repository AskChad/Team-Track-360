
# Team Track 360 - Complete Setup Guide

**Step-by-step instructions to get Team Track 360 running.**

## 📋 Table of Contents

1. [Get Supabase Credentials](#1-get-supabase-credentials)
2. [Configure Environment Variables](#2-configure-environment-variables)
3. [Install Dependencies](#3-install-dependencies)
4. [Run Database Migrations](#4-run-database-migrations)
5. [Verify Setup](#5-verify-setup)
6. [Create First User](#6-create-first-user)
7. [Start Development](#7-start-development)

---

## 1. Get Supabase Credentials

### Step 1.1: Access Supabase Dashboard

1. Go to: https://supabase.com/dashboard/project/iccmkpmujtmvtfpvoxli
2. Login with your Supabase account

### Step 1.2: Get API Keys

1. Navigate to: **Settings** → **API**
2. Or visit directly: https://supabase.com/dashboard/project/iccmkpmujtmvtfpvoxli/settings/api

Copy these values:
- **Project URL**: `https://iccmkpmujtmvtfpvoxli.supabase.co`
- **anon/public** key (starts with `eyJ...`)
- **service_role** key (starts with `eyJ...`) - ⚠️ Keep this secret!

### Step 1.3: Get Database Password

1. Navigate to: **Settings** → **Database**
2. Or visit directly: https://supabase.com/dashboard/project/iccmkpmujtmvtfpvoxli/settings/database

Copy:
- **Database password** (the one you set when creating the project)
- If you forgot it, you can reset it from this page

---

## 2. Configure Environment Variables

### Step 2.1: Open .env.local

```bash
cd /mnt/c/development/team-track-360
nano .env.local
```

### Step 2.2: Fill in Supabase Credentials

Replace these placeholders:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://iccmkpmujtmvtfpvoxli.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=paste-your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=paste-your-service-role-key-here

# Database Direct Connection
DATABASE_URL=postgresql://postgres:YOUR_DB_PASSWORD@db.iccmkpmujtmvtfpvoxli.supabase.co:5432/postgres
SUPABASE_DB_PASSWORD=your-db-password-here
```

**Example (with fake credentials):**

```env
NEXT_PUBLIC_SUPABASE_URL=https://iccmkpmujtmvtfpvoxli.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImljY21rcG11anRtdnRmcHZveGxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTUxMjM0NTYsImV4cCI6MjAxMDY5OTQ1Nn0.example
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImljY21rcG11anRtdnRmcHZveGxpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY5NTEyMzQ1NiwiZXhwIjoyMDEwNjk5NDU2fQ.example
DATABASE_URL=postgresql://postgres:MyP@ssw0rd!@db.iccmkpmujtmvtfpvoxli.supabase.co:5432/postgres
SUPABASE_DB_PASSWORD=MyP@ssw0rd!
```

### Step 2.3: Generate Secure Secrets

Generate JWT_SECRET and ENCRYPTION_KEY:

```bash
# Generate JWT_SECRET
openssl rand -base64 48

# Generate ENCRYPTION_KEY
openssl rand -base64 48
```

Copy the output and paste into .env.local:

```env
JWT_SECRET=paste-first-generated-secret-here
ENCRYPTION_KEY=paste-second-generated-secret-here
```

### Step 2.4: Verify Environment File

Your .env.local should now look like:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://iccmkpmujtmvtfpvoxli.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...actual-key...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...actual-key...
DATABASE_URL=postgresql://postgres:YourActualPassword@db.iccmkpmujtmvtfpvoxli.supabase.co:5432/postgres
SUPABASE_DB_PASSWORD=YourActualPassword

# JWT Configuration
JWT_SECRET=your-generated-64-char-secret-here
JWT_EXPIRES_IN=7d

# Encryption Key
ENCRYPTION_KEY=your-generated-64-char-key-here

# Token Manager Configuration
TOKEN_MANAGER_URL=http://localhost:3737

# Application Configuration
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Save and close the file (Ctrl+X, then Y, then Enter).

---

## 3. Install Dependencies

```bash
cd /mnt/c/development/team-track-360
npm install
```

This will install:
- Next.js 14 and React 18
- Supabase client libraries
- Tailwind CSS and UI components
- TypeScript
- All development dependencies

---

## 4. Run Database Migrations

### Step 4.1: Install Migration Dependencies

```bash
npm install pg dotenv
npm install -D @types/pg
```

### Step 4.2: Run Migrations

```bash
node scripts/run-migrations.js
```

Expected output:

```
🚀 Team Track 360 - Database Migrations

📡 Connecting to database...
✅ Connected successfully

📋 Found 3 migration(s) to process

📄 Running migration: 001_create_exec_sql_function.sql
   Found 4 SQL statements
   ✅ 001_create_exec_sql_function.sql completed successfully

📄 Running migration: 002_initial_schema.sql
   Found 45 SQL statements
   ✅ 002_initial_schema.sql completed successfully

📄 Running migration: 003_enable_rls_and_policies.sql
   Found 32 SQL statements
   ✅ 003_enable_rls_and_policies.sql completed successfully

==================================================
✨ Migrations complete!
   Executed: 3
   Skipped: 0
==================================================
```

### Troubleshooting Migrations

If migrations fail:

**Error: "Connection refused"**
- Check DATABASE_URL in .env.local
- Verify database password is correct
- Ensure you can ping Supabase: `ping db.iccmkpmujtmvtfpvoxli.supabase.co`

**Error: "Authentication failed"**
- Database password in .env.local is incorrect
- Reset password in Supabase Dashboard → Settings → Database

**Error: "relation already exists"**
- Migration was already run
- Check `_migrations` table in Supabase
- Run with `--specific` flag to re-run: `node scripts/run-migrations.js --specific 002_initial_schema.sql`

---

## 5. Verify Setup

### Step 5.1: Start Development Server

```bash
npm run dev
```

Expected output:

```
- Local:        http://localhost:3000
- Ready in 2.3s
```

### Step 5.2: Test API Endpoint

In another terminal:

```bash
curl http://localhost:3000/api/test
```

Expected response:

```json
{
  "success": true,
  "message": "All environment variables configured correctly",
  "checks": {
    "api": true,
    "supabase_url": true,
    "supabase_anon_key": true,
    "supabase_service_role": true,
    "database_url": true,
    "jwt_secret": true,
    "jwt_secret_length": 64,
    "encryption_key": true,
    "encryption_key_length": 64,
    "node_env": "development"
  },
  "warnings": []
}
```

✅ If `success: true` and `warnings: []` - You're good to go!
❌ If `success: false` or warnings present - Fix the issues listed in `warnings` array

---

## 6. Create First User

### Step 6.1: Create Admin User

```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@teamtrack360.com",
    "password": "SecureAdminPassword123!",
    "full_name": "Admin User"
  }'
```

Expected response:

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGc...",
    "user": {
      "id": "uuid-here",
      "email": "admin@teamtrack360.com",
      "full_name": "Admin User",
      "platform_role": "user"
    }
  },
  "message": "Account created successfully"
}
```

### Step 6.2: Test Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@teamtrack360.com",
    "password": "SecureAdminPassword123!"
  }'
```

Expected response:

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGc...",
    "user": {
      "id": "uuid-here",
      "email": "admin@teamtrack360.com",
      "full_name": "Admin User",
      "platform_role": "user"
    }
  }
}
```

### Step 6.3: Upgrade User to Platform Admin

Using Supabase Dashboard:

1. Go to: https://supabase.com/dashboard/project/iccmkpmujtmvtfpvoxli/editor
2. Select `profiles` table
3. Find your user by email
4. Edit the row
5. Change `platform_role` from `user` to `platform_admin`
6. Save

Or using exec_sql (requires psql or SQL Editor):

```sql
UPDATE profiles
SET platform_role = 'platform_admin'
WHERE email = 'admin@teamtrack360.com';
```

---

## 7. Start Development

Your Team Track 360 instance is now fully set up! 🎉

### What You Can Do Now

1. **Build the frontend**: Create login/dashboard pages in `app/`
2. **Add API routes**: Implement teams, tasks, projects APIs
3. **Customize database**: Add more tables via migrations
4. **Deploy to Vercel**: Push to GitHub and deploy

### Next Steps

- Read the [README.md](README.md) for full documentation
- Review the [Attack Kit](../resources/ATTACK_KIT.md) for coding standards
- Check the [Supabase Guide](../resources/SUPABASE_CONFIGURATION_GUIDE.md) for RLS patterns

### Development Workflow

```bash
# Start development server
npm run dev

# Create a new migration
touch supabase/migrations/004_add_feature.sql
node scripts/run-migrations.js --specific 004_add_feature.sql

# Type checking
npm run type-check

# Build for production
npm run build
```

---

## 🆘 Common Issues

### Issue: "Cannot find module 'pg'"

**Solution:**
```bash
npm install pg
```

### Issue: "JWT_SECRET too short"

**Solution:**
```bash
# Generate new secret
openssl rand -base64 48

# Update .env.local with the new secret
```

### Issue: "Supabase connection failed"

**Solution:**
1. Verify NEXT_PUBLIC_SUPABASE_URL is correct
2. Check that anon key is copied correctly (no spaces)
3. Restart dev server: `Ctrl+C` then `npm run dev`

### Issue: "Migration failed: relation already exists"

**Solution:**
- This means tables were already created
- Safe to ignore if you're re-running migrations
- Or drop and recreate tables from Supabase Dashboard

---

## ✅ Setup Complete!

You now have a fully functional Team Track 360 development environment.

**Questions?** Check the README.md or contact the development team.

---

**Happy coding! 🚀**
