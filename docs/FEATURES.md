# Features

A comprehensive overview of all features in the News Aggregator application.

## Core Features

### Multi-Project Management
- Create and manage multiple independent news aggregation projects
- Each project has a unique slug and API key
- Organize sources and items by project
- Project settings and configuration per project

### RSS/Atom Feed Discovery
- Automatically discover RSS/Atom feeds from any website URL
- Scans HTML for feed links (`<link rel="alternate">` tags)
- Supports multiple feed formats (RSS 2.0, Atom, XML)
- Handles redirects and follows feed URLs automatically
- Validates discovered feeds before adding

### Custom RSS Builder
- Generate RSS feeds for websites without native RSS support
- Automatic article structure detection
- Configurable CSS selectors for:
  - Article containers
  - Titles, links, dates, content, authors
- Intelligent date parsing (ISO, written dates, relative dates)
- Handles various HTML structures and layouts
- Creates valid RSS 2.0 feeds from HTML content

### Cloudflare Protection Detection
- Automatically detects Cloudflare-protected websites
- Confidence levels: low, medium, high
- Warns users when adding Cloudflare-protected sources
- Helps identify potential scraping limitations

### Feed Aggregation
- Aggregate items from multiple sources per project
- Automatic deduplication by URL per project
- Items sorted by published date (newest first)
- View aggregated feed or filter by individual source
- Search items by title, content, or author

### Source Management
- Add sources via URL (website or direct feed URL)
- Edit source titles
- Delete sources (with cascade deletion of items)
- Manual refresh individual sources
- View source status (ACTIVE, ERROR, INACTIVE)
- Track last fetched time and errors
- Support for both NATIVE and CUSTOM feed types

### Authentication & Security
- Contentstack OAuth integration
- Secure session management via Auth.js (NextAuth)
- API key authentication for external API access
- Project-level API keys (regenerable)
- Webhook signature verification (HMAC-SHA256)

### External JSON API
- Public API endpoint per project: `/api/p/{slug}/items`
- API key authentication (header or query parameter)
- Query parameters:
  - `limit`: Number of items (default: 50, max: 100)
  - `since`: Filter items published after ISO 8601 date
- Returns JSON with project info and items array
- Includes full item metadata (title, URL, author, dates, content)

### Webhooks
- Configure webhooks per project
- Two event types:
  - `new_items`: Fired when new items are added
  - `source_refresh`: Fired when source refresh completes (success or failure)
- Optional webhook secrets for signature verification
- Delivery tracking with status (SUCCESS, FAILED, PENDING)
- Enable/disable webhooks without deletion
- View delivery history and status codes

### Automated Refresh
- Daily automatic refresh via Vercel Cron
- Refreshes all sources across all projects
- Manual refresh available per source or per project
- Handles errors gracefully (marks sources as ERROR)
- Updates source metadata (title, description) from feeds
- Tracks refresh statistics (items added, sources processed)

### Feed Viewing
- Aggregated feed view (all sources combined)
- Source-specific feed view (filter by source)
- Search functionality
- Responsive UI with modern design
- Real-time updates after refresh

### Admin Tools
- Cleanup orphaned items (items without valid sources)
- Admin-only endpoints for maintenance

## Technical Features

### URL Normalization
- Consistent URL handling across the application
- Handles protocol differences (http/https)
- Trailing slash normalization
- Query parameter preservation

### Error Handling
- Comprehensive error logging
- User-friendly error messages
- Source error tracking (lastError field)
- Graceful degradation on failures

### Performance
- Serverless-optimized (Vercel)
- Neon Postgres with connection pooling
- Efficient database queries with Prisma
- Parallel webhook delivery (non-blocking)

### Data Management
- Automatic item deduplication
- Cascade deletion (sources → items)
- Timestamp tracking (createdAt, updatedAt, lastFetchedAt)
- Status tracking (source status, webhook delivery status)

## User Interface

### Modern Design
- Built with shadcn/ui components
- Tailwind CSS v4 styling
- Responsive layout (mobile-friendly)
- Dark/light theme support
- Accessible components

### Navigation
- Sidebar navigation
- Breadcrumb navigation
- Project-specific routes
- Clean, minimal header

### User Experience
- Toast notifications for actions
- Loading states
- Error messages
- Confirmation dialogs for destructive actions
- Form validation

## Integration Features

### Contentstack Integration
- OAuth authentication
- User profile management
- Session persistence

### Vercel Integration
- Cron job scheduling
- Serverless function deployment
- Environment variable management
- Automatic database connection pooling

## Data Features

### Feed Metadata
- Feed titles and descriptions
- Source titles (auto-detected or custom)
- Author information
- Publication dates
- Content snippets and full HTML content

### Item Metadata
- Unique IDs (GUID support)
- Titles and URLs
- Authors
- Publication dates
- Content snippets (500 chars)
- Full HTML content
- Source attribution

## Security Features

### Authentication
- Session-based auth for web interface
- API key auth for external API
- Cron secret for scheduled jobs
- Webhook signature verification

### Data Protection
- User isolation (users only see their projects)
- Project-level access control
- Secure API key generation
- Webhook secret encryption

## Monitoring & Logging

### Logging
- Comprehensive error logging
- Refresh operation logging
- Webhook delivery logging
- Debug information in development

### Status Tracking
- Source status (ACTIVE, ERROR, INACTIVE)
- Last fetched timestamps
- Error messages per source
- Webhook delivery status

