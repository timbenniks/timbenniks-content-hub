# News Aggregator

A multi-project news aggregator built with Next.js, TypeScript, Prisma, and shadcn/ui. Aggregate RSS/Atom feeds from multiple sources into organized projects, with support for both native RSS feeds and custom RSS generation for websites without feeds.

> 📖 **For AI Agents & Developers**: See the [Documentation](./docs/) folder for comprehensive technical documentation.

## Features

- **Multi-project support**: Create and manage multiple news aggregation projects
- **RSS/Atom feed discovery**: Automatically discover feeds from website URLs
- **Custom RSS builder**: Generate RSS feeds for websites without native RSS support
- **Cloudflare detection**: Automatically detect and warn about Cloudflare-protected websites
- **Feed aggregation**: Aggregate items from multiple sources per project
- **Webhooks**: Configure webhooks to receive notifications for new items and source refreshes
- **Contentstack OAuth**: Secure authentication via Contentstack
- **External API**: JSON API endpoint for each project with API key authentication
- **Daily refresh**: Automated daily feed refresh via Vercel Cron
- **Modern UI**: Built with shadcn/ui components and Tailwind CSS v4

> 📋 **See [Features Documentation](./docs/FEATURES.md) for a complete feature overview**

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: Neon Postgres via Prisma 7
- **UI**: shadcn/ui + Tailwind CSS v4
- **Auth**: Auth.js v5 (NextAuth) with Contentstack OAuth
- **Feed Parsing**: rss-parser
- **HTML Parsing**: cheerio
- **Feed Discovery**: Custom implementation with cheerio

## Prerequisites

- Node.js 18+
- Neon Postgres database (or any PostgreSQL database)
- Contentstack OAuth credentials

## Environment Variables

### Local Development

Create a `.env` file in the root directory:

```env
# Database (Neon Postgres connection string)
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

# OpenAI (for Content Studio AI workflows)
OPENAI_API_KEY="sk-..." # Your OpenAI API key
OPENAI_ORG_ID="org-..." # Your OpenAI organization ID (optional but recommended)
```

### Vercel Production

When you connect a Neon Postgres database to your project, Vercel automatically provides these environment variables:

- `DATABASE_URL` - Connection string (used by Prisma)
- `POSTGRES_URL` - Pooled connection URL (if using Vercel Postgres)

**Note**: The Prisma client uses Neon's serverless adapter for optimal serverless performance.

**Required for Content Studio**:

- `OPENAI_API_KEY` - Your OpenAI API key (required for AI content generation)
- `OPENAI_ORG_ID` - Your OpenAI organization ID (optional but recommended)

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Set up database

1. **Create a Neon Postgres database** (or use Vercel Postgres)
2. **Copy connection string** to `DATABASE_URL` in `.env`
3. **Run migrations**:
   ```bash
   npm run db:migrate
   ```

### 3. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

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
4. The system will:
   - Automatically discover native RSS/Atom feeds if available
   - Detect Cloudflare protection and show warnings
   - Offer to create a custom RSS feed if no native feed is found
5. The source will be refreshed immediately to fetch initial items

### Custom RSS Feeds

For websites without native RSS feeds, the system can automatically:

- Detect article structure on the page
- Extract titles, links, dates, and content
- Generate a valid RSS 2.0 feed
- Handle various date formats and structures

The custom RSS builder supports:

- Automatic article structure detection
- Multiple date format parsing (ISO, written dates, relative dates, etc.)
- CSS module class name detection
- Fallback strategies for missing data

### Viewing Feeds

- **Aggregated Feed**: View all items from all sources in a project, sorted by published date
- **By Source**: Filter items by individual source using tabs
- **Search**: Search items by title, content, or author

### Webhooks

Configure webhooks to receive real-time notifications:

1. Go to your project's Settings page
2. Navigate to the Webhooks section
3. Click "Add Webhook"
4. Enter your webhook URL
5. Select events to subscribe to:
   - **new_items**: Fired when new items are added to the project
   - **source_refresh**: Fired when a source refresh completes (success or failure)
6. Optionally add a secret for signature verification (HMAC-SHA256)
7. Enable/disable webhooks as needed

Webhooks are sent as POST requests with JSON payloads. See the [API Documentation](./docs/API.md#webhooks) for payload formats and signature verification.

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
      [projectId]/
        webhooks/     # Webhook management
    sources/          # Source management
    cron/             # Cron endpoints
    p/[slug]/items/   # External JSON API
lib/
  auth.ts            # Auth configuration
  db.ts              # Prisma client with Neon adapter
  url.ts             # URL normalization
  discovery.ts       # Feed discovery
  refresh.ts         # Feed refresh logic
  rss-builder.ts     # Custom RSS builder
  rss-generator.ts   # RSS XML generation
  article-detection.ts # Article structure detection
  cloudflare-detection.ts # Cloudflare protection detection
  date-utils.ts      # Date parsing utilities
  fetch-utils.ts     # Fetch utilities with timeout
  item-processor.ts  # Feed item processing
  slug.ts            # Slug and API key generation
components/          # React components
prisma/
  schema.prisma      # Database schema
docs/                # Comprehensive documentation
```

## Database Schema

- **Project**: Projects with unique slugs and API keys
- **Source**: RSS/Atom feed sources per project (native or custom)
  - `feedType`: NATIVE or CUSTOM
  - `cloudflareProtected`: Boolean flag
  - `customRSSConfig`: JSON configuration for custom RSS
- **Item**: Aggregated feed items (deduplicated by project + URL)
- **Webhook**: Webhook configurations per project
  - Events: `new_items`, `source_refresh`
  - Optional secret for signature verification
- **WebhookDelivery**: Delivery history and status tracking
- **User/Account/Session**: Auth.js user management

## Development

- **Prisma Studio**: `npm run db:studio` - Visual database browser
- **Generate Client**: `npm run db:generate` - After schema changes
- **Create Migrations**: `npm run db:migrate` - Create and apply migrations
- **Push Schema**: `npm run db:push` - Push schema directly (dev only)

## Documentation

Comprehensive documentation is available in the [`docs/`](./docs/) folder:

- **[Features](./docs/FEATURES.md)** - Complete feature overview
- **[Architecture](./docs/ARCHITECTURE.md)** - System architecture and design decisions
- **[API Reference](./docs/API.md)** - Complete API documentation
- **[Custom RSS Builder](./docs/CUSTOM_RSS.md)** - Custom RSS generation guide
- **[Database Schema](./docs/DATABASE.md)** - Database schema and relationships
- **[Development Guide](./docs/DEVELOPMENT.md)** - Development setup and workflows

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

The Prisma client is configured to use Neon's serverless adapter, which is optimal for serverless functions and provides automatic connection pooling.

## License

MIT
