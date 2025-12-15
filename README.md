# News Aggregator

A multi-project news aggregator built with Next.js, TypeScript, Prisma, and shadcn/ui. Aggregate RSS/Atom feeds from multiple sources into organized projects.

> 📖 **New to this project?** Start with the [Getting Started Guide](./GETTING_STARTED.md) for step-by-step setup instructions.

## Features

- **Multi-project support**: Create and manage multiple news aggregation projects
- **RSS/Atom feed discovery**: Automatically discover feeds from website URLs
- **Feed aggregation**: Aggregate items from multiple sources per project
- **Contentstack OAuth**: Secure authentication via Contentstack
- **External API**: JSON API endpoint for each project with API key authentication
- **Daily refresh**: Automated daily feed refresh via Vercel Cron
- **Modern UI**: Built with shadcn/ui components and Tailwind CSS v4

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: Vercel Postgres via Prisma
- **UI**: shadcn/ui + Tailwind CSS v4
- **Auth**: Auth.js v5 (NextAuth) with Contentstack OAuth
- **Feed Parsing**: rss-parser
- **Feed Discovery**: cheerio

## Prerequisites

- Node.js 18+ 
- Vercel Postgres database (or any PostgreSQL database)
- Contentstack OAuth credentials

## Environment Variables

### Local Development

Create a `.env` file in the root directory:

```env
# Database (local PostgreSQL or Vercel Postgres connection string)
DATABASE_URL="postgresql://user:password@host:port/database"

# Auth
AUTH_SECRET="your-auth-secret-here" # Generate with: openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000" # Your app URL

# Contentstack OAuth
CONTENTSTACK_REGION="na" # na, eu, azure-na, azure-eu, gcp-na, gcp-eu
CONTENTSTACK_APP_ID="your-app-id"
CONTENTSTACK_CLIENT_ID="your-client-id"
CONTENTSTACK_CLIENT_SECRET="your-client-secret"

# Cron
CRON_SECRET="your-cron-secret-here" # Generate with: openssl rand -base64 32
```

### Vercel Production

When you connect a Vercel Postgres database to your project, Vercel automatically provides these environment variables:

- `POSTGRES_URL` - Pooled connection URL
- `POSTGRES_PRISMA_URL` - Prisma-compatible pooled URL (used automatically)
- `POSTGRES_URL_NON_POOLING` - Direct connection (for migrations)
- `DATABASE_URL` - Alias for POSTGRES_URL

**Note**: The Prisma client automatically uses `POSTGRES_PRISMA_URL` in production for optimal connection pooling.

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Vercel Postgres (Production)

1. **Create a Vercel Postgres database**:
   - Go to your Vercel project dashboard
   - Navigate to the "Storage" tab
   - Click "Create Database" → "Postgres"
   - Choose your region and plan
   - Click "Create"

2. **Connect to your project**:
   - The database will automatically be connected
   - Environment variables will be set automatically

3. **Run migrations**:
   ```bash
   # Use the direct connection URL for migrations
   DATABASE_URL=$POSTGRES_URL_NON_POOLING npx prisma migrate deploy
   ```
   
   Or in Vercel, add a build command:
   ```bash
   DATABASE_URL=$POSTGRES_URL_NON_POOLING prisma migrate deploy && next build
   ```

### 3. Local Development Setup

1. **Set up local database** (if not using Vercel Postgres locally):
   ```bash
   # Option A: Use Vercel Postgres connection string in .env
   # Copy POSTGRES_URL from Vercel dashboard to DATABASE_URL in .env
   
   # Option B: Use local PostgreSQL
   # Install PostgreSQL locally and update DATABASE_URL in .env
   ```

2. **Generate Prisma Client**:
   ```bash
   npm run db:generate
   ```

3. **Run migrations**:
   ```bash
   npm run db:migrate
   # Or push schema directly (for development)
   npm run db:push
   ```

3. **Run the development server**:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Creating a Project

1. Sign in with Contentstack
2. Navigate to Projects
3. Click "New Project"
4. Enter a name and optional description
5. Your project will be created with a unique slug and API key

### Adding Sources

1. Go to your project's Sources page
2. Click "Add Source"
3. Enter a website URL or direct RSS/Atom feed URL
4. The system will automatically discover the feed if you provide a homepage URL
5. The source will be refreshed immediately to fetch initial items

### Viewing Feeds

- **Aggregated Feed**: View all items from all sources in a project, sorted by published date
- **By Source**: Filter items by individual source using tabs
- **Search**: Search items by title, content, or author

### External API

Each project exposes a JSON API endpoint:

```
GET /api/p/{slug}/items
```

**Authentication**: Include your project API key via:
- Header: `x-project-key: YOUR_API_KEY`
- Query parameter: `?apiKey=YOUR_API_KEY`

**Query Parameters**:
- `limit` (optional): Number of items to return (default: 50, max: 100)
- `since` (optional): ISO 8601 date string to filter items published after this date

**Example**:
```bash
curl -H "x-project-key: YOUR_API_KEY" \
  "https://your-domain.com/api/p/my-project/items?limit=20"
```

**Response**:
```json
{
  "project": {
    "id": "...",
    "name": "My Project",
    "slug": "my-project"
  },
  "generatedAt": "2024-01-01T00:00:00.000Z",
  "items": [
    {
      "id": "...",
      "title": "Item Title",
      "url": "https://...",
      "author": "Author Name",
      "publishedAt": "2024-01-01T00:00:00.000Z",
      "contentSnippet": "...",
      "contentHtml": "...",
      "source": {
        "id": "...",
        "title": "Source Title",
        "siteUrl": "https://..."
      }
    }
  ]
}
```

## Daily Refresh (Cron)

The app includes a daily refresh endpoint that refreshes all feeds across all projects.

### Vercel Cron Configuration

The `vercel.json` file is configured to call the cron endpoint daily at midnight UTC:

```json
{
  "crons": [
    {
      "path": "/api/cron/daily-refresh",
      "schedule": "0 0 * * *"
    }
  ]
}
```

### Testing Locally

To test the cron endpoint locally:

```bash
curl -X POST http://localhost:3000/api/cron/daily-refresh \
  -H "x-cron-secret: YOUR_CRON_SECRET"
```

### Setting Up on Vercel

1. Deploy your app to Vercel
2. Add the `CRON_SECRET` environment variable in Vercel dashboard
3. Vercel will automatically detect the cron configuration from `vercel.json`
4. The cron job will run daily at midnight UTC

**Important**: Make sure to set a strong `CRON_SECRET` value in your Vercel environment variables. This prevents unauthorized access to your cron endpoint.

## Project Structure

```
app/
  (app)/              # Protected app routes
    projects/         # Projects list and creation
    p/[slug]/         # Project-specific routes
      feed/           # Aggregated feed
      sources/        # Sources management
      settings/       # Project settings
  api/                # API routes
    auth/             # Auth.js routes
    projects/         # Project CRUD
    sources/          # Source management
    cron/             # Cron endpoints
    p/[slug]/items/   # External JSON API
lib/
  auth.ts            # Auth configuration
  db.ts              # Prisma client
  url.ts             # URL normalization
  discovery.ts       # Feed discovery
  refresh.ts         # Feed refresh logic
  slug.ts            # Slug and API key generation
components/          # React components
prisma/
  schema.prisma      # Database schema
```

## Database Schema

- **Project**: Projects with unique slugs and API keys
- **Source**: RSS/Atom feed sources per project
- **Item**: Aggregated feed items (deduplicated by project + URL)
- **User/Account/Session**: Auth.js user management

## Development

- **Prisma Studio**: `npm run db:studio` - Visual database browser
- **Generate Client**: `npm run db:generate` - After schema changes
- **Create Migrations**: `npm run db:migrate` - Create and apply migrations
- **Push Schema**: `npm run db:push` - Push schema directly (dev only)

## Vercel Deployment

### Build Configuration

The `postinstall` script automatically runs `prisma generate` during deployment.

### Database Migrations

For production deployments, add this to your Vercel build command:

```bash
DATABASE_URL=$POSTGRES_URL_NON_POOLING prisma migrate deploy && next build
```

Or create a separate migration step in your Vercel project settings.

### Connection Pooling

The Prisma client is configured to automatically use `POSTGRES_PRISMA_URL` (pooled connection) in production, which is optimal for serverless functions. The direct connection (`POSTGRES_URL_NON_POOLING`) is only needed for migrations.

## License

MIT
