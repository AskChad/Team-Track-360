# Vercel Deployment Guide - Team Track 360

## Pre-requisites

✅ GitHub repository created and code pushed
✅ Vercel account with access token
✅ Vercel configuration (`vercel.json`) - **West Coast region (sfo1)** ✓

---

## Deployment Options

### Option A: GitHub Integration (Recommended)

This enables automatic deployments on every push to GitHub.

#### Step 1: Link Vercel to GitHub Repository

1. **Visit Vercel Dashboard:**
   https://vercel.com/new

2. **Import Git Repository:**
   - Click "Add New..." → "Project"
   - Select "Import Git Repository"
   - Search for: `AskChad/team-track-360`
   - Click "Import"

3. **Configure Project:**
   - **Framework Preset:** Next.js (auto-detected)
   - **Root Directory:** `./`
   - **Build Command:** `npm run build` (auto-detected)
   - **Output Directory:** `.next` (auto-detected)
   - **Install Command:** `npm install` (auto-detected)

4. **Add Environment Variables:**

   Click "Environment Variables" and add:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://iccmkpmujtmvtfpvoxli.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=[Get from Supabase Dashboard]
   SUPABASE_SERVICE_ROLE_KEY=sbp_c4e5823876bec847496de53a8194218a68d6f896
   DATABASE_URL=postgresql://postgres:[PASSWORD]@db.iccmkpmujtmvtfpvoxli.supabase.co:5432/postgres
   SUPABASE_DB_PASSWORD=[Get from Supabase Dashboard]
   JWT_SECRET=4Qv6KwU9rOB2CjZGx8NsfIyCY3RrhX0gxH7lPTBDvnWaOf4NALS/olLsg8EZkTs+
   JWT_EXPIRES_IN=7d
   ENCRYPTION_KEY=bkAun2U09L9IONvnC8vKK5EOeZS+Orjp+Z+5dlzKpBKnktP40gbG0PemejhfebQ/
   ```

   **Note:** You need to get `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_DB_PASSWORD` from your Supabase dashboard:
   - Visit: https://supabase.com/dashboard/project/iccmkpmujtmvtfpvoxli/settings/api
   - Copy "anon public" key
   - Copy database password from Settings → Database

5. **Deploy:**
   - Click "Deploy"
   - Wait for build to complete (~2-3 minutes)
   - Deployment will automatically use **West Coast region (sfo1)** ✓

6. **Verify Deployment:**
   - Check deployment URL (e.g., `team-track-360.vercel.app`)
   - Test the application
   - Check that it's deployed to west coast region

---

### Option B: CLI Deployment

Deploy directly from command line using Vercel CLI.

#### Step 1: Install Vercel CLI (if needed)

```bash
npm install -g vercel
```

#### Step 2: Login to Vercel

```bash
# Using token from Token Manager
vercel login --token AJOA89XSplE7O1v1iFRc5IDJ
```

Or login interactively:
```bash
vercel login
```

#### Step 3: Link to GitHub Repository (Optional)

```bash
cd /mnt/c/development/team-track-360
vercel link
```

Select:
- Scope: Your account
- Link to existing project: No
- Project name: team-track-360
- Directory: ./

#### Step 4: Set Environment Variables

```bash
# Set each environment variable
vercel env add NEXT_PUBLIC_SUPABASE_URL production
# Enter: https://iccmkpmujtmvtfpvoxli.supabase.co

vercel env add SUPABASE_SERVICE_ROLE_KEY production
# Enter: sbp_c4e5823876bec847496de53a8194218a68d6f896

vercel env add JWT_SECRET production
# Enter: 4Qv6KwU9rOB2CjZGx8NsfIyCY3RrhX0gxH7lPTBDvnWaOf4NALS/olLsg8EZkTs+

vercel env add ENCRYPTION_KEY production
# Enter: bkAun2U09L9IONvnC8vKK5EOeZS+Orjp+Z+5dlzKpBKnktP40gbG0PemejhfebQ/

# You still need to add manually from Supabase:
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_DB_PASSWORD production
vercel env add DATABASE_URL production
```

#### Step 5: Deploy to Production

```bash
# Deploy to production (west coast region)
vercel --prod --token AJOA89XSplE7O1v1iFRc5IDJ
```

Or deploy with automatic region selection:
```bash
vercel deploy --prod
```

The `vercel.json` configuration ensures deployment to **sfo1** (San Francisco) region.

---

## Vercel Configuration Details

The `vercel.json` file is already configured with:

```json
{
  "regions": ["sfo1"],           // ✅ West Coast (San Francisco)
  "framework": "nextjs",         // Next.js framework
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm install",
  "devCommand": "npm run dev",
  "env": {
    // Environment variables mapped to Vercel secrets
  }
}
```

**Region Code:** `sfo1` = San Francisco, California (West Coast) 🌊

---

## Post-Deployment Steps

### 1. Run Database Migrations

After first deployment, run migrations:

```bash
# SSH into your deployment or run locally
node scripts/run-migrations.js
```

Or run migrations directly from Supabase SQL Editor:
1. Visit: https://supabase.com/dashboard/project/iccmkpmujtmvtfpvoxli/sql/new
2. Copy contents of migration files from `supabase/migrations/`
3. Run in order: 001, 002, 003, 004, 005

### 2. Test the Deployment

Visit your deployment URL and test:
- [ ] Login page loads
- [ ] Can create account
- [ ] Can login
- [ ] Dashboard shows
- [ ] API endpoints work

### 3. Configure Custom Domain (Optional)

1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed
4. Wait for SSL certificate provisioning

### 4. Enable Automatic Deployments

With GitHub integration:
- ✅ Every push to `main` branch triggers production deployment
- ✅ Every pull request creates preview deployment
- ✅ Automatic HTTPS and SSL certificates
- ✅ Instant rollback capability

---

## Monitoring & Logs

### View Deployment Logs

```bash
# Recent deployments
vercel ls

# View logs for specific deployment
vercel logs [deployment-url]

# Stream logs in real-time
vercel logs --follow
```

### Vercel Dashboard

Visit: https://vercel.com/dashboard

- View deployments
- Check build logs
- Monitor performance
- View analytics
- Manage environment variables

---

## Troubleshooting

### Build Fails

**Error:** `Module not found` or `Cannot find package`
**Solution:**
```bash
# Ensure all dependencies are in package.json
npm install
git add package.json package-lock.json
git commit -m "Update dependencies"
git push
```

### Environment Variables Not Working

**Error:** Application can't connect to Supabase
**Solution:**
1. Check all env vars are set in Vercel Dashboard
2. Redeploy: `vercel --prod --force`
3. Check env vars: `vercel env ls`

### Wrong Region Deployed

**Error:** Deployed to wrong region
**Solution:**
1. Verify `vercel.json` has `"regions": ["sfo1"]`
2. Redeploy: `vercel --prod --force`
3. Check deployment region in Vercel Dashboard

### Database Connection Issues

**Error:** `ECONNREFUSED` or `Connection timeout`
**Solution:**
1. Verify `DATABASE_URL` is correct
2. Check Supabase project is active
3. Verify IP whitelisting (if any) includes Vercel IPs
4. Test connection from local environment first

---

## Quick Command Reference

```bash
# Deploy to production
vercel --prod

# Deploy with token
vercel --prod --token AJOA89XSplE7O1v1iFRc5IDJ

# List deployments
vercel ls

# View logs
vercel logs

# Add environment variable
vercel env add VARIABLE_NAME production

# Pull environment variables locally
vercel env pull

# Remove deployment
vercel remove [deployment-url]

# Get deployment URL
vercel inspect [deployment-url]
```

---

## Region Information

**Selected Region:** `sfo1` (San Francisco, California)

**Why West Coast?**
- ✅ Lower latency for west coast users
- ✅ Close to major tech hubs
- ✅ Good connectivity to Asia-Pacific
- ✅ Reliable infrastructure

**Other Available Regions:**
- `iad1` - Washington D.C. (East Coast)
- `pdx1` - Portland, Oregon
- `bom1` - Mumbai, India
- `hnd1` - Tokyo, Japan
- `fra1` - Frankfurt, Germany

To change region, update `vercel.json`:
```json
{
  "regions": ["sfo1"]  // Change to desired region code
}
```

---

## Deployment Checklist

Before deploying to production:

- [ ] GitHub repository created and code pushed
- [ ] All environment variables available
- [ ] Database migrations ready
- [ ] Supabase project configured
- [ ] `vercel.json` configured with correct region
- [ ] Build succeeds locally (`npm run build`)
- [ ] Tests pass (if applicable)
- [ ] .env.local not committed to git

After deployment:

- [ ] Deployment successful
- [ ] Application loads correctly
- [ ] Login/signup works
- [ ] Database connections work
- [ ] API endpoints respond
- [ ] Region verified as `sfo1`
- [ ] Environment variables loaded
- [ ] Migrations applied

---

## Support & Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Vercel Regions](https://vercel.com/docs/concepts/edge-network/regions)
- [Vercel CLI Reference](https://vercel.com/docs/cli)

---

**Ready to deploy!** 🚀

Choose Option A (GitHub Integration) for automatic deployments, or Option B (CLI) for manual control.
