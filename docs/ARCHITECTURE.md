# Architecture Documentation

This document provides a comprehensive overview of the News Aggregator architecture, designed for AI agents and developers to understand the system structure and design decisions.

## System Overview

The News Aggregator is a Next.js 16 application that aggregates RSS/Atom feeds from multiple sources into organized projects. It supports both native RSS/Atom feeds and custom RSS generation for websites without feeds.

## Core Architecture

### Technology Stack

- **Framework**: Next.js 16 (App Router) with React Server Components
- **Language**: TypeScript (strict mode)
- **Database**: Neon Postgres with Prisma 7 ORM
- **Authentication**: Auth.js v5 (NextAuth) with Contentstack OAuth
- **UI Framework**: shadcn/ui components with Tailwind CSS v4
- **Feed Parsing**: rss-parser for native feeds
- **HTML Parsing**: cheerio for web scraping and feed discovery

### Design Principles

1. **DRY (Don't Repeat Yourself)**: Common utilities extracted into shared modules
2. **Separation of Concerns**: Clear separation between API routes, business logic, and UI
3. **Type Safety**: Full TypeScript coverage with Prisma-generated types
4. **Serverless-First**: Optimized for Vercel's serverless functions
5. **Modularity**: Self-contained modules with clear interfaces

## Directory Structure

```
timbenniks-content-hub/
├── app/                    # Next.js App Router
│   ├── (app)/             # Protected routes (require auth)
│   │   ├── projects/      # Projects list and creation
│   │   └── p/[slug]/      # Project-specific routes
│   │       ├── feed/      # Aggregated feed view
│   │       ├── sources/   # Source management
│   │       └── settings/  # Project settings
│   ├── api/               # API routes
│   │   ├── auth/          # Authentication endpoints
│   │   ├── projects/      # Project CRUD operations
│   │   ├── sources/       # Source management
│   │   ├── cron/          # Scheduled tasks
│   │   └── p/[slug]/     # Public API endpoints
│   └── layout.tsx         # Root layout
├── lib/                    # Core business logic
│   ├── db.ts              # Prisma client configuration
│   ├── auth.ts            # Auth.js configuration
│   ├── discovery.ts       # Feed discovery logic
│   ├── refresh.ts         # Feed refresh orchestration
│   ├── rss-builder.ts     # Custom RSS generation
│   ├── rss-generator.ts   # RSS XML generation
│   ├── article-detection.ts # Article structure detection
│   ├── cloudflare-detection.ts # Cloudflare protection detection
│   ├── date-utils.ts      # Date parsing utilities
│   ├── fetch-utils.ts     # HTTP fetch utilities
│   ├── item-processor.ts  # Feed item processing
│   ├── url.ts             # URL normalization
│   └── slug.ts            # Slug and API key generation
├── components/            # React components
│   ├── ui/                # shadcn/ui components
│   └── [feature].tsx     # Feature-specific components
├── prisma/                # Database schema and migrations
│   └── schema.prisma      # Prisma schema definition
└── docs/                  # Documentation
```

## Core Modules

### 1. Database Layer (`lib/db.ts`)

**Purpose**: Prisma client configuration with Neon serverless adapter

**Key Features**:
- Uses Neon's serverless adapter for optimal serverless performance
- Supports Prisma Accelerate URLs
- Connection pooling handled by Neon adapter
- Global singleton pattern for development

**Usage**:
```typescript
import { db } from "@/lib/db";

const projects = await db.project.findMany();
```

### 2. Feed Discovery (`lib/discovery.ts`)

**Purpose**: Discover RSS/Atom feeds from website URLs

**Process**:
1. Check if URL is already a direct feed
2. Fetch homepage HTML
3. Parse HTML for feed links (`<link rel="alternate">`)
4. Try common feed paths (`/feed`, `/rss.xml`, etc.)
5. Detect Cloudflare protection
6. Return discovered feeds with metadata

**Key Functions**:
- `discoverAllFeeds(url)`: Main discovery function
- `checkDirectFeedUrl(url)`: Verify if URL is a feed
- Returns `DiscoveredFeed[]` with Cloudflare status

### 3. Custom RSS Builder (`lib/rss-builder.ts`)

**Purpose**: Generate RSS feeds from websites without native feeds

**Process**:
1. Fetch HTML page
2. Detect article structure (if not provided)
3. Extract articles using selectors
4. Parse dates, titles, links, content
5. Generate RSS 2.0 XML

**Key Functions**:
- `scrapeAndBuildRSS(config)`: Main RSS generation
- `autoBuildRSS(url)`: Auto-detect and build
- `extractPageMetadata(url)`: Extract page title/description

**Configuration**:
```typescript
interface RSSBuilderConfig {
  siteUrl: string;
  articleListUrl?: string;
  articleSelector?: string;
  titleSelector?: string;
  linkSelector?: string;
  dateSelector?: string;
  contentSelector?: string;
  authorSelector?: string;
  maxItems?: number;
}
```

### 4. Article Detection (`lib/article-detection.ts`)

**Purpose**: Automatically detect article structure on web pages

**Process**:
1. Fetch page HTML
2. Try common article selectors (`article`, `.post`, `.entry`, etc.)
3. Detect title, link, date, content selectors
4. Return structure with confidence level

**Key Functions**:
- `detectArticleStructure(url)`: Detect structure from URL
- `detectArticleListUrl(baseUrl)`: Find article list pages

**Selectors Tried**:
- Article containers: `article`, `[role='article']`, `.post`, `.entry`, etc.
- Titles: `h1`, `h2`, `h3`, `.title`, etc.
- Dates: `time`, `.date`, `[class*="date"]`, etc.

### 5. Date Parsing (`lib/date-utils.ts`)

**Purpose**: Parse dates from various formats

**Supported Formats**:
- ISO dates: `2025-11-24`
- Written dates: `November 24, 2025`, `24 Nov 2025`
- Numeric dates: `11/24/2025`, `24.11.2025`
- Relative dates: `2 days ago`, `yesterday`, `today`
- Date-time: `November 24, 2025 at 10:30 AM`
- Unix timestamps: `1732406400`

**Key Functions**:
- `parseDate(dateString)`: Main parsing function
- `extractDateFromElement($, element, selector?)`: Extract date from HTML element

### 6. Cloudflare Detection (`lib/cloudflare-detection.ts`)

**Purpose**: Detect Cloudflare bot protection

**Detection Methods**:
- HTTP headers: `cf-ray`, `cf-cache-status`, `server: cloudflare`
- HTML content: Challenge pages, CAPTCHA indicators
- Status codes: 403/503 with Cloudflare headers

**Key Functions**:
- `detectCloudflareFromUrl(url)`: Detect from URL
- `detectCloudflareProtection(url, response?, html?)`: Detect from response

**Returns**:
```typescript
{
  isProtected: boolean;
  confidence: "low" | "medium" | "high";
  indicators: string[];
  challengeType?: "browser-verification" | "captcha" | "rate-limit";
}
```

### 7. Feed Refresh (`lib/refresh.ts`)

**Purpose**: Refresh feed sources and update items

**Process**:
1. Determine feed type (NATIVE or CUSTOM)
2. For native feeds: Parse RSS/Atom with rss-parser
3. For custom feeds: Scrape HTML and generate RSS
4. Process items (deduplicate, upsert)
5. Update source metadata

**Key Functions**:
- `refreshSource(sourceId)`: Refresh single source
- `refreshProject(projectId)`: Refresh all sources in project

**Item Processing**:
- Deduplication by `projectId + url`
- Upsert logic (create or update)
- Error handling per item (continue on failure)

### 8. Fetch Utilities (`lib/fetch-utils.ts`)

**Purpose**: Standardized HTTP fetching with timeout

**Features**:
- Automatic timeout handling
- Standardized User-Agent
- Abort controller support
- Error handling

**Key Functions**:
- `fetchWithTimeout(url, options)`: Fetch with timeout
- `fetchHtml(url, options)`: Fetch HTML content

## Data Flow

### Adding a Source

1. User enters URL → `AddSourceDialog`
2. API call → `/api/sources/discover`
3. `discoverAllFeeds()` → Returns feeds + Cloudflare status
4. If no feeds found → Offer custom RSS option
5. User confirms → `/api/sources` POST
6. Create source → `refreshSource()` immediately
7. Store items → Database

### Refreshing Feeds

1. Cron job → `/api/cron/daily-refresh`
2. Get all projects → Database query
3. For each project → `refreshProject()`
4. For each source → `refreshSource()`
5. Parse/generate feed → `rss-parser` or `rss-builder`
6. Process items → `processFeedItems()`
7. Update database → Upsert items

### Custom RSS Generation

1. User adds custom RSS source
2. `extractPageMetadata()` → Get page title
3. `detectArticleStructure()` → Auto-detect selectors
4. `scrapeAndBuildRSS()` → Generate RSS XML
5. Parse generated RSS → `rss-parser`
6. Process items → Same as native feeds

## Database Schema

### Core Models

**Project**
- `id`: UUID (primary key)
- `name`: String
- `slug`: String (unique, URL-friendly)
- `apiKey`: String (unique, for API authentication)
- `description`: String (optional)
- `userId`: UUID (foreign key to User)

**Source**
- `id`: UUID (primary key)
- `projectId`: UUID (foreign key to Project)
- `siteUrl`: String
- `feedUrl`: String (nullable)
- `title`: String (nullable)
- `description`: String (nullable)
- `feedType`: Enum (`NATIVE` | `CUSTOM`)
- `cloudflareProtected`: Boolean
- `cloudflareWarningShown`: Boolean
- `customRSSConfig`: JSON (nullable)
- `status`: Enum (`ACTIVE` | `ERROR` | `INACTIVE`)
- `lastFetchedAt`: DateTime (nullable)
- `lastError`: String (nullable)

**Item**
- `id`: UUID (primary key)
- `projectId`: UUID (foreign key to Project)
- `sourceId`: UUID (foreign key to Source)
- `guid`: String (nullable)
- `url`: String (unique per project)
- `title`: String
- `author`: String (nullable)
- `publishedAt`: DateTime (nullable)
- `contentSnippet`: String (nullable)
- `contentHtml`: String (nullable)
- Unique constraint: `(projectId, url)`

## API Architecture

### Route Structure

All API routes follow RESTful conventions:

- `GET /api/projects` - List projects
- `POST /api/projects` - Create project
- `GET /api/projects/[id]` - Get project
- `PATCH /api/projects/[id]` - Update project
- `DELETE /api/projects/[id]` - Delete project

### Authentication

- **App Routes**: Protected by Auth.js middleware
- **API Routes**: Manual auth check with `auth()` helper
- **Public API**: API key authentication (`x-project-key` header)

### Error Handling

- Consistent error responses: `{ error: string }`
- HTTP status codes: 200 (success), 400 (bad request), 401 (unauthorized), 404 (not found), 500 (server error)
- Error logging: Console errors for debugging

## Security Considerations

1. **API Keys**: Generated with crypto-secure random
2. **Cron Secret**: Required for cron endpoint access
3. **Auth**: Contentstack OAuth with secure session management
4. **SQL Injection**: Prevented by Prisma ORM
5. **XSS**: React automatically escapes content
6. **Rate Limiting**: Not implemented (consider for production)

## Performance Optimizations

1. **Connection Pooling**: Neon adapter handles pooling
2. **Parallel Processing**: `Promise.allSettled()` for batch operations
3. **Deduplication**: Database unique constraints prevent duplicates
4. **Selective Queries**: Prisma select only needed fields
5. **Caching**: Not implemented (consider for feed content)

## Deployment

### Vercel Configuration

- **Framework**: Next.js
- **Build Command**: `prisma generate && next build`
- **Output Directory**: `.next`
- **Cron Jobs**: Defined in `vercel.json`

### Environment Variables

Required in production:
- `DATABASE_URL`: Neon Postgres connection string
- `AUTH_SECRET`: Auth.js secret
- `NEXTAUTH_URL`: Production URL
- `CRON_SECRET`: Cron endpoint secret
- Contentstack OAuth credentials

## Future Improvements

1. **Caching**: Redis for feed content caching
2. **Rate Limiting**: Per-project rate limits
3. **Webhooks**: Notify on new items
4. **Analytics**: Track feed health and performance
5. **Feed Validation**: Validate RSS/Atom feeds
6. **Retry Logic**: Retry failed feed fetches
7. **Batch Operations**: Bulk source operations

