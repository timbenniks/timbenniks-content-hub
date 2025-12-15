# Getting Started Guide

This guide will walk you through setting up Contentstack OAuth authentication and Vercel Postgres database for the News Aggregator application.

## Prerequisites

- A GitHub account (for Vercel)
- A Contentstack account
- Node.js 18+ installed locally
- Git installed

---

## Part 1: Contentstack OAuth Setup

### Step 1: Create a Contentstack App

1. **Log in to Contentstack**
   - Go to [https://app.contentstack.com](https://app.contentstack.com)
   - Sign in with your account

2. **Navigate to Developer Hub**
   - Click on your profile icon (top right)
   - Select "Developer Hub" from the dropdown

3. **Create a New App**
   - Click "Create App" or "New App"
   - Fill in the app details:
     - **App Name**: `News Aggregator` (or your preferred name)
     - **Description**: `Multi-project news aggregator application`
     - **App Type**: Select "Custom App" or "OAuth App"
   - Click "Create"

4. **Note Your App Details**
   - **App UID**: Copy this value (you'll need it for `CONTENTSTACK_APP_ID`)
   - You'll find this in the app overview page

### Step 2: Configure OAuth Settings

1. **Enable OAuth**
   - In your app's settings, navigate to the "OAuth" section
   - Enable OAuth if it's not already enabled

2. **Set Redirect URL**
   - **For Local Development**:
     ```
     http://localhost:3000/api/auth/callback/contentstack
     ```
   - **For Production** (update after deployment):
     ```
     https://your-domain.vercel.app/api/auth/callback/contentstack
     ```
   - Click "Save" or "Update"

3. **Configure Scopes**
   - Under "User Token Scopes", ensure `user:read` is selected
   - This scope allows the app to read user profile information
   - Save the changes

4. **Get OAuth Credentials**
   - In the OAuth section, you'll see:
     - **Client ID**: Copy this (for `CONTENTSTACK_CLIENT_ID`)
     - **Client Secret**: Copy this (for `CONTENTSTACK_CLIENT_SECRET`)
     - ⚠️ **Important**: The Client Secret is only shown once. Save it securely!

5. **Determine Your Region**
   - Check your Contentstack region from the URL or account settings
   - Common regions: `na`, `eu`, `azure-na`, `azure-eu`, `gcp-na`, `gcp-eu`
   - This will be your `CONTENTSTACK_REGION` value

### Step 3: Verify Contentstack Configuration

Your Contentstack setup should have:
- ✅ App created with OAuth enabled
- ✅ Redirect URL configured
- ✅ `user:read` scope enabled
- ✅ App UID, Client ID, and Client Secret copied

---

## Part 2: Vercel Postgres Setup

### Step 1: Create a Vercel Account

1. **Sign up for Vercel**
   - Go to [https://vercel.com](https://vercel.com)
   - Sign up with your GitHub account (recommended)

### Step 2: Create a New Project

1. **Import Your Repository**
   - Click "Add New" → "Project"
   - Import your GitHub repository (or create a new one)
   - Configure the project:
     - **Framework Preset**: Next.js
     - **Root Directory**: `./` (default)
     - **Build Command**: `npm run build` (default)
     - **Output Directory**: `.next` (default)
     - **Install Command**: `npm install` (default)

2. **Don't Deploy Yet**
   - We'll configure the database first, then deploy

### Step 3: Create Vercel Postgres Database

1. **Navigate to Storage**
   - In your Vercel project dashboard
   - Click on the "Storage" tab
   - If you don't see it, make sure you're in the project view

2. **Create Postgres Database**
   - Click "Create Database"
   - Select "Postgres" from the options
   - Configure the database:
     - **Name**: `news-aggregator-db` (or your preferred name)
     - **Region**: Choose closest to your users (e.g., `us-east-1`, `eu-west-1`)
     - **Plan**: Start with "Hobby" (free tier) for development
   - Click "Create"

3. **Wait for Provisioning**
   - The database will be created (takes ~30 seconds)
   - You'll see a success message when ready

4. **Connect to Project**
   - The database is automatically connected to your project
   - Environment variables are automatically set:
     - `POSTGRES_URL`
     - `POSTGRES_PRISMA_URL`
     - `POSTGRES_URL_NON_POOLING`
     - `DATABASE_URL`

### Step 4: Verify Database Connection

1. **Check Environment Variables**
   - Go to your project → Settings → Environment Variables
   - You should see the Postgres connection strings
   - ✅ These are automatically set by Vercel

---

## Part 3: Local Development Setup

### Step 1: Clone and Install

```bash
# Clone your repository (if not already done)
git clone <your-repo-url>
cd timbenniks-content-hub

# Install dependencies
npm install
```

### Step 2: Set Up Environment Variables

1. **Create `.env` file**
   ```bash
   cp .env.example .env  # If you have an example file
   # Or create a new .env file
   ```

2. **Add Contentstack OAuth Variables**
   ```env
   # Contentstack OAuth (from Part 1)
   CONTENTSTACK_REGION="eu"
   CONTENTSTACK_APP_ID="your-app-uid-here"
   CONTENTSTACK_CLIENT_ID="your-client-id-here"
   CONTENTSTACK_CLIENT_SECRET="your-client-secret-here"
   ```

3. **Add Database URL**
   
   **Option A: Use Vercel Postgres (Recommended)**
   - Go to Vercel Dashboard → Your Project → Storage → Postgres
   - Copy the `POSTGRES_URL` or `POSTGRES_PRISMA_URL`
   - Add to `.env`:
     ```env
     DATABASE_URL="postgresql://..."
     ```

   **Option B: Use Local PostgreSQL**
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/news_aggregator"
   ```

4. **Add Auth Configuration**
   ```env
   # Auth.js secret (generate with: openssl rand -base64 32)
   AUTH_SECRET="your-generated-secret-here"
   
   # App URL
   NEXTAUTH_URL="http://localhost:3000"
   ```

5. **Add Cron Secret**
   ```env
   # Cron secret (generate with: openssl rand -base64 32)
   CRON_SECRET="your-generated-secret-here"
   ```

### Step 3: Generate Prisma Client

```bash
npm run db:generate
```

### Step 4: Run Database Migrations

```bash
# For first-time setup
npm run db:migrate

# Or push schema directly (development only)
npm run db:push
```

### Step 5: Start Development Server

```bash
npm run dev
```

### Step 6: Test the Setup

1. **Open the Application**
   - Navigate to [http://localhost:3000](http://localhost:3000)
   - You should be redirected to `/login`

2. **Test Contentstack OAuth**
   - Click "Sign in with Contentstack"
   - You should be redirected to Contentstack's OAuth page
   - After authorizing, you'll be redirected back to the app
   - You should see the projects page

3. **Verify Database Connection**
   - Try creating a project
   - If successful, the database is working correctly

---

## Part 4: Production Deployment

### Step 1: Update Contentstack Redirect URL

1. **Get Your Production URL**
   - After deploying to Vercel, you'll get a URL like: `https://your-app.vercel.app`

2. **Update Contentstack Redirect URL**
   - Go back to Contentstack Developer Hub → Your App → OAuth
   - Add production redirect URL:
     ```
     https://your-app.vercel.app/api/auth/callback/contentstack
     ```
   - Save the changes

### Step 2: Configure Vercel Environment Variables

1. **Go to Vercel Project Settings**
   - Navigate to Settings → Environment Variables

2. **Add Contentstack Variables**
   - Click "Add New"
   - Add each variable:
     ```
     CONTENTSTACK_REGION = eu
     CONTENTSTACK_APP_ID = your-app-uid
     CONTENTSTACK_CLIENT_ID = your-client-id
     CONTENTSTACK_CLIENT_SECRET = your-client-secret
     AUTH_SECRET = your-auth-secret
     NEXTAUTH_URL = https://your-app.vercel.app
     CRON_SECRET = your-cron-secret
     ```
   - Set environment to "Production", "Preview", and "Development" as needed
   - Click "Save"

3. **Verify Postgres Variables**
   - These should already be set automatically
   - If not, check the Storage tab

### Step 3: Configure Build Settings

1. **Update Build Command** (Optional, for migrations)
   - Go to Settings → General → Build & Development Settings
   - Update Build Command:
     ```bash
     DATABASE_URL=$POSTGRES_URL_NON_POOLING prisma migrate deploy && npm run build
     ```
   - Or run migrations separately via Vercel CLI

2. **Verify Install Command**
   - Should be: `npm install`
   - The `postinstall` script will automatically run `prisma generate`

### Step 4: Deploy

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial setup"
   git push
   ```

2. **Vercel Auto-Deploy**
   - Vercel will automatically detect the push
   - Start a new deployment
   - Monitor the build logs

3. **Run Migrations** (if not in build command)
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Run migrations
   vercel env pull .env.production
   DATABASE_URL=$(grep POSTGRES_URL_NON_POOLING .env.production | cut -d '=' -f2) npx prisma migrate deploy
   ```

### Step 5: Verify Production Setup

1. **Test OAuth Flow**
   - Visit your production URL
   - Try signing in with Contentstack
   - Should redirect correctly

2. **Test Database**
   - Create a project
   - Add a source
   - Verify data persists

---

## Troubleshooting

### Contentstack OAuth Issues

**Problem**: "Redirect URI mismatch"
- **Solution**: Ensure redirect URL in Contentstack matches exactly (including `http://` vs `https://`)

**Problem**: "Invalid client credentials"
- **Solution**: Double-check `CONTENTSTACK_CLIENT_ID` and `CONTENTSTACK_CLIENT_SECRET`

**Problem**: "Authorization failed"
- **Solution**: Verify `CONTENTSTACK_APP_ID` matches your app's UID (not Client ID)

### Vercel Postgres Issues

**Problem**: "Connection timeout"
- **Solution**: Check that you're using `POSTGRES_PRISMA_URL` for queries (automatic) and `POSTGRES_URL_NON_POOLING` for migrations

**Problem**: "Migration failed"
- **Solution**: Use direct connection URL: `DATABASE_URL=$POSTGRES_URL_NON_POOLING npx prisma migrate deploy`

**Problem**: "Environment variables not found"
- **Solution**: Ensure database is connected to project in Vercel Storage tab

### General Issues

**Problem**: "Prisma Client not generated"
- **Solution**: Run `npm run db:generate` manually

**Problem**: "Module not found: @prisma/client"
- **Solution**: Run `npm install` to ensure dependencies are installed

---

## Quick Reference

### Environment Variables Checklist

**Required for Local Development:**
- [ ] `DATABASE_URL` - Database connection string
- [ ] `AUTH_SECRET` - Auth.js secret (generate with `openssl rand -base64 32`)
- [ ] `NEXTAUTH_URL` - App URL (`http://localhost:3000` for local)
- [ ] `CONTENTSTACK_REGION` - Region code (`na`, `eu`, etc.)
- [ ] `CONTENTSTACK_APP_ID` - App UID from Developer Hub
- [ ] `CONTENTSTACK_CLIENT_ID` - OAuth Client ID
- [ ] `CONTENTSTACK_CLIENT_SECRET` - OAuth Client Secret
- [ ] `CRON_SECRET` - Cron endpoint secret (generate with `openssl rand -base64 32`)

**Automatically Set by Vercel (Production):**
- [x] `POSTGRES_URL` - Pooled connection
- [x] `POSTGRES_PRISMA_URL` - Prisma-compatible pooled connection
- [x] `POSTGRES_URL_NON_POOLING` - Direct connection (for migrations)
- [x] `DATABASE_URL` - Alias for POSTGRES_URL

### Useful Commands

```bash
# Generate Prisma Client
npm run db:generate

# Run migrations
npm run db:migrate

# Push schema (dev only)
npm run db:push

# Open Prisma Studio
npm run db:studio

# Start dev server
npm run dev

# Build for production
npm run build
```

---

## Next Steps

After completing this setup:

1. ✅ Create your first project
2. ✅ Add RSS/Atom feed sources
3. ✅ Test feed aggregation
4. ✅ Explore the external API endpoint
5. ✅ Set up daily refresh cron

For more information, see the main [README.md](./README.md).

---

## Support

- **Contentstack OAuth Docs**: [Contentstack Developer Hub](https://www.contentstack.com/docs/developers/developer-hub/contentstack-oauth)
- **Vercel Postgres Docs**: [Vercel Postgres Documentation](https://vercel.com/docs/storage/vercel-postgres)
- **Prisma Docs**: [Prisma Documentation](https://www.prisma.io/docs)

