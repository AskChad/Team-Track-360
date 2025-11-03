# Team Track 360

**A modern team collaboration and task management platform built with Next.js 14 and Supabase.**

## 🚀 Features

- ✅ Team management with role-based access control
- ✅ Project organization and task tracking
- ✅ Real-time collaboration with comments
- ✅ Activity logging and audit trails
- ✅ Secure authentication with JWT
- ✅ Row Level Security (RLS) with Supabase
- ✅ Mobile-first responsive design
- ✅ Built with Attack Kit standards

## 📋 Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Backend**: Next.js API Routes, Supabase (PostgreSQL)
- **Authentication**: JWT + bcrypt + Supabase Auth
- **Styling**: Tailwind CSS + shadcn/ui components
- **Database**: Supabase (PostgreSQL with RLS)
- **Deployment**: Vercel (recommended)

## 🏗️ Project Structure

```
team-track-360/
├── app/                      # Next.js App Router
│   ├── api/                  # API route handlers
│   │   ├── auth/             # Authentication endpoints
│   │   ├── teams/            # Team management
│   │   ├── tasks/            # Task management
│   │   └── test/             # Test endpoint
│   ├── dashboard/            # Dashboard page
│   ├── login/                # Login page
│   └── settings/             # Settings page
├── components/               # React components
│   ├── ui/                   # Base UI components
│   ├── charts/               # Chart components
│   └── filters/              # Filter components
├── lib/                      # Utility functions
│   ├── api.ts                # Axios client
│   ├── auth.ts               # Auth utilities
│   ├── supabase.ts           # Supabase client
│   ├── supabase-admin.ts     # Admin client (with exec_sql)
│   ├── services/             # Business logic
│   └── utils/                # Helper functions
├── supabase/                 # Database migrations
│   └── migrations/           # SQL migration files
├── scripts/                  # Build and utility scripts
│   └── run-migrations.js     # Migration runner
├── public/                   # Static assets
└── .claude/                  # Claude AI configuration
```

## 🛠️ Setup Instructions

### Prerequisites

- Node.js 18+ installed
- Supabase account and project
- Git installed

### 1. Install Dependencies

```bash
cd /mnt/c/development/team-track-360
npm install
```

### 2. Configure Environment Variables

Copy `.env.local` and fill in your Supabase credentials:

```bash
# Get credentials from:
# https://supabase.com/dashboard/project/iccmkpmujtmvtfpvoxli/settings/api
```

Required environment variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://iccmkpmujtmvtfpvoxli.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
DATABASE_URL=postgresql://postgres:[password]@db.iccmkpmujtmvtfpvoxli.supabase.co:5432/postgres
SUPABASE_DB_PASSWORD=your-db-password-here

# JWT Configuration
JWT_SECRET=generate-a-random-string-at-least-64-characters-long
JWT_EXPIRES_IN=7d

# Encryption
ENCRYPTION_KEY=generate-a-random-string-at-least-64-characters-long
```

**Generate secure secrets:**
```bash
# Generate JWT_SECRET (64+ characters)
openssl rand -base64 48

# Generate ENCRYPTION_KEY (64+ characters)
openssl rand -base64 48
```

### 3. Install Required npm Packages

```bash
npm install @supabase/supabase-js @supabase/ssr
npm install axios jsonwebtoken bcrypt
npm install pg  # For database migrations
npm install dotenv

# Dev dependencies
npm install -D @types/jsonwebtoken @types/bcrypt @types/pg
```

### 4. Run Database Migrations

```bash
# Install pg package for migrations
npm install pg

# Run all migrations
node scripts/run-migrations.js

# Or run a specific migration
node scripts/run-migrations.js --specific 002_initial_schema.sql
```

### 5. Verify Setup

Test that everything is configured correctly:

```bash
# Start development server
npm run dev

# In another terminal, test the API
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
    ...
  }
}
```

### 6. Create Your First User

```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "SecurePassword123!",
    "full_name": "Admin User"
  }'
```

### 7. Start Development

```bash
npm run dev
```

Visit: http://localhost:3000

## 🗃️ Database Schema

### Core Tables

1. **profiles** - User profiles linked to Supabase Auth
2. **teams** - Organizations/teams for grouping members
3. **team_members** - Many-to-many relationship between teams and users
4. **projects** - Projects for organizing tasks within teams
5. **tasks** - Tasks and subtasks for team members
6. **comments** - Comments on tasks for collaboration
7. **activity_log** - Audit log for all actions

### Row Level Security (RLS)

All tables have RLS enabled with policies:
- Users can only see data from teams they belong to
- Team owners and admins have management privileges
- Platform admins have full access

## 📡 API Routes

### Authentication

- `POST /api/auth/signup` - Create new account
- `POST /api/auth/login` - Login and get JWT token

### Teams (Coming Soon)

- `GET /api/teams` - List user's teams
- `POST /api/teams` - Create new team
- `GET /api/teams/:id` - Get team details
- `PUT /api/teams/:id` - Update team
- `DELETE /api/teams/:id` - Delete team

### Tasks (Coming Soon)

- `GET /api/tasks` - List tasks
- `POST /api/tasks` - Create task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

## 🔐 Security Features

- **JWT Authentication** - Secure token-based auth
- **Password Hashing** - bcrypt with 12 salt rounds
- **Row Level Security** - Database-level access control
- **Input Validation** - All inputs validated
- **SQL Injection Prevention** - Parameterized queries
- **XSS Protection** - Input sanitization
- **CSRF Protection** - Built into Next.js

## 🚀 Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

```bash
# Or use Vercel CLI
npm install -g vercel
vercel --prod
```

### Environment Variables in Vercel

Add all variables from `.env.local` to Vercel dashboard:
- Project Settings → Environment Variables
- Add all `NEXT_PUBLIC_*` variables
- Add all server-side variables (JWT_SECRET, etc.)

## 📚 Documentation

- **Attack Kit**: `/mnt/c/development/resources/ATTACK_KIT.md`
- **Supabase Guide**: `/mnt/c/development/resources/SUPABASE_CONFIGURATION_GUIDE.md`
- **API Documentation**: See inline JSDoc comments

## 🧪 Testing

```bash
# Run type checking
npm run type-check

# Run tests (when implemented)
npm test

# Run E2E tests (when implemented)
npm run e2e
```

## 🛠️ Development Tools

### exec_sql Function

Execute raw SQL queries from your code:

```typescript
import { execSQL } from '@/lib/supabase-admin';

const result = await execSQL(`
  SELECT * FROM users WHERE created_at > NOW() - INTERVAL '7 days'
`);
```

**Security**: Only callable by platform_admin or super_admin roles.

### Direct PostgreSQL Connection

For complex operations:

```typescript
import { executeDirectSQL } from '@/lib/supabase-admin';

await executeDirectSQL(`
  CREATE INDEX CONCURRENTLY idx_users_email ON users(email)
`);
```

## 📝 Standards & Best Practices

This project follows the [Attack Kit](../resources/ATTACK_KIT.md) standards:

- ✅ Production-first configuration (no hardcoded localhost URLs)
- ✅ Relative API paths for deployment flexibility
- ✅ Mobile-first responsive design
- ✅ Security by default (RLS, encryption, validation)
- ✅ TypeScript with strict mode
- ✅ Consistent error handling
- ✅ Comprehensive logging

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Run type checking and tests
4. Submit a pull request

## 📄 License

Proprietary - All rights reserved

## 🆘 Troubleshooting

### Database Connection Issues

```bash
# Test database connection
node -e "
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
client.connect().then(() => console.log('✅ Connected')).catch(e => console.error('❌ Failed:', e.message));
"
```

### Migration Issues

```bash
# Reset migrations table
psql $DATABASE_URL -c "DROP TABLE IF EXISTS _migrations"

# Re-run migrations
node scripts/run-migrations.js
```

### Authentication Issues

Check that:
1. JWT_SECRET is at least 64 characters
2. Supabase service role key is correct
3. User exists in both auth.users and profiles tables

## 📞 Support

For issues or questions:
1. Check the [Attack Kit](../resources/ATTACK_KIT.md)
2. Review [Supabase Documentation](https://supabase.com/docs)
3. Contact the development team

---

**Built with ❤️ using Attack Kit standards**
