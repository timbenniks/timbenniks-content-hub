# API Documentation

Complete API reference for the News Aggregator application.

## Base URL

- **Development**: `http://localhost:3000`
- **Production**: `https://your-domain.com`

## Authentication

### App API Routes

Most API routes require authentication via Auth.js session cookies. The session is automatically managed by NextAuth.

### Public API Routes

Public API routes use API key authentication:

**Header** (preferred):
```
x-project-key: YOUR_API_KEY
```

**Query Parameter** (alternative):
```
?apiKey=YOUR_API_KEY
```

## Endpoints

### Projects

#### List Projects

```http
GET /api/projects
```

**Authentication**: Required (session)

**Response**:
```json
[
  {
    "id": "uuid",
    "name": "My Project",
    "slug": "my-project",
    "description": "Project description",
    "apiKey": "generated-api-key",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

#### Create Project

```http
POST /api/projects
Content-Type: application/json
```

**Authentication**: Required (session)

**Request Body**:
```json
{
  "name": "My Project",
  "description": "Optional description"
}
```

**Response**: Project object (same as List Projects)

#### Get Project

```http
GET /api/projects/[projectId]
```

**Authentication**: Required (session)

**Response**: Project object

#### Update Project

```http
PATCH /api/projects/[projectId]
Content-Type: application/json
```

**Authentication**: Required (session)

**Request Body**:
```json
{
  "name": "Updated Name",
  "description": "Updated description"
}
```

**Response**: Updated project object

#### Delete Project

```http
DELETE /api/projects/[projectId]
```

**Authentication**: Required (session)

**Response**: `{ "success": true }`

#### Refresh Project

```http
POST /api/projects/[projectId]/refresh
```

**Authentication**: Required (session)

**Response**:
```json
{
  "success": true,
  "sourcesProcessed": 5,
  "sourcesSucceeded": 4,
  "sourcesFailed": 1,
  "totalItemsAdded": 42
}
```

#### Regenerate API Key

```http
POST /api/projects/[projectId]/regenerate-key
```

**Authentication**: Required (session)

**Response**:
```json
{
  "apiKey": "new-generated-api-key"
}
```

### Sources

#### Discover Feeds

```http
POST /api/sources/discover
Content-Type: application/json
```

**Authentication**: Required (session)

**Request Body**:
```json
{
  "url": "https://example.com"
}
```

**Response**:
```json
{
  "feeds": [
    {
      "url": "https://example.com/feed.xml",
      "title": "Example Blog",
      "type": "RSS/Atom",
      "cloudflareProtected": false,
      "cloudflareConfidence": "low"
    }
  ],
  "cloudflareProtected": false,
  "cloudflareConfidence": "low"
}
```

#### List Sources

```http
GET /api/sources?projectId=[projectId]
```

**Authentication**: Required (session)

**Query Parameters**:
- `projectId` (required): Project UUID

**Response**:
```json
[
  {
    "id": "uuid",
    "projectId": "uuid",
    "siteUrl": "https://example.com",
    "feedUrl": "https://example.com/feed.xml",
    "title": "Example Blog",
    "description": "Blog description",
    "feedType": "NATIVE",
    "cloudflareProtected": false,
    "status": "ACTIVE",
    "lastFetchedAt": "2024-01-01T00:00:00.000Z",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

#### Create Source

```http
POST /api/sources
Content-Type: application/json
```

**Authentication**: Required (session)

**Request Body**:
```json
{
  "projectId": "uuid",
  "siteUrl": "https://example.com",
  "feedUrl": "https://example.com/feed.xml", // Optional for custom RSS
  "feedType": "NATIVE", // or "CUSTOM"
  "customRSSConfig": { // Optional, for custom RSS
    "articleSelector": "article",
    "titleSelector": "h2",
    "linkSelector": "a",
    "dateSelector": ".date",
    "contentSelector": ".content",
    "maxItems": 20
  }
}
```

**Response**: Source object (same as List Sources)

#### Get Source

```http
GET /api/sources/[sourceId]
```

**Authentication**: Required (session)

**Response**: Source object

#### Update Source

```http
PATCH /api/sources/[sourceId]
Content-Type: application/json
```

**Authentication**: Required (session)

**Request Body**: Partial source object (same fields as Create Source)

**Response**: Updated source object

#### Delete Source

```http
DELETE /api/sources/[sourceId]
```

**Authentication**: Required (session)

**Response**: `{ "success": true }`

#### Refresh Source

```http
POST /api/sources/[sourceId]/refresh
```

**Authentication**: Required (session)

**Response**:
```json
{
  "success": true,
  "itemsAdded": 5
}
```

### Public API

#### Get Project Items

```http
GET /api/p/[slug]/items
```

**Authentication**: API key (header or query parameter)

**Query Parameters**:
- `limit` (optional): Number of items (default: 50, max: 100)
- `since` (optional): ISO 8601 date string (filter items published after)

**Example**:
```bash
curl -H "x-project-key: YOUR_API_KEY" \
  "https://your-domain.com/api/p/my-project/items?limit=20&since=2024-01-01T00:00:00Z"
```

**Response**:
```json
{
  "project": {
    "id": "uuid",
    "name": "My Project",
    "slug": "my-project"
  },
  "generatedAt": "2024-01-01T00:00:00.000Z",
  "items": [
    {
      "id": "uuid",
      "title": "Article Title",
      "url": "https://example.com/article",
      "author": "Author Name",
      "publishedAt": "2024-01-01T00:00:00.000Z",
      "contentSnippet": "Article excerpt...",
      "contentHtml": "<p>Article content...</p>",
      "source": {
        "id": "uuid",
        "title": "Source Title",
        "siteUrl": "https://example.com"
      }
    }
  ]
}
```

### Cron

#### Daily Refresh

```http
POST /api/cron/daily-refresh
x-cron-secret: YOUR_CRON_SECRET
```

**Authentication**: Cron secret (header)

**Response**:
```json
{
  "success": true,
  "timestamp": "2024-01-01T00:00:00.000Z",
  "summary": {
    "projectsProcessed": 5,
    "projectsSucceeded": 4,
    "projectsFailed": 1,
    "totalSourcesProcessed": 20,
    "totalSourcesSucceeded": 18,
    "totalSourcesFailed": 2,
    "totalItemsAdded": 150,
    "errors": []
  }
}
```

### Admin

#### Cleanup Orphaned Items

```http
POST /api/admin/cleanup-orphaned-items
```

**Authentication**: Required (session)

**Response**:
```json
{
  "deleted": 42
}
```

## Error Responses

All endpoints may return error responses:

```json
{
  "error": "Error message"
}
```

**HTTP Status Codes**:
- `200`: Success
- `400`: Bad Request (invalid input)
- `401`: Unauthorized (missing/invalid auth)
- `404`: Not Found (resource doesn't exist)
- `500`: Internal Server Error

## Rate Limiting

Currently not implemented. Consider implementing for production use.

## Pagination

Currently not implemented. All endpoints return all matching records. Consider implementing pagination for large datasets.

## Webhooks

### List Webhooks

```http
GET /api/projects/[projectId]/webhooks
```

**Authentication**: Required (session)

**Response**:
```json
[
  {
    "id": "uuid",
    "url": "https://example.com/webhook",
    "secret": "secret-value",
    "events": ["new_items", "source_refresh"],
    "active": true,
    "description": "Webhook description",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "deliveries": [
      {
        "id": "uuid",
        "status": "SUCCESS",
        "statusCode": 200,
        "attemptedAt": "2024-01-01T00:00:00.000Z",
        "deliveredAt": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
]
```

### Create Webhook

```http
POST /api/projects/[projectId]/webhooks
Content-Type: application/json
```

**Authentication**: Required (session)

**Request Body**:
```json
{
  "url": "https://example.com/webhook",
  "secret": "optional-secret",
  "events": ["new_items", "source_refresh"],
  "description": "Optional description",
  "active": true
}
```

**Response**: Webhook object (same as List Webhooks)

### Update Webhook

```http
PATCH /api/projects/[projectId]/webhooks/[webhookId]
Content-Type: application/json
```

**Authentication**: Required (session)

**Request Body**: Partial webhook object (same fields as Create Webhook)

**Response**: Updated webhook object

### Delete Webhook

```http
DELETE /api/projects/[projectId]/webhooks/[webhookId]
```

**Authentication**: Required (session)

**Response**: `{ "success": true }`

### Webhook Events

**new_items**: Fired when new items are added to a project
- Payload includes: event type, project info, timestamp, items array

**source_refresh**: Fired when a source refresh completes
- Payload includes: event type, project info, source info, success status, items added count, error (if failed)

### Webhook Signatures

If a webhook secret is configured, all webhook payloads include an `X-Webhook-Signature` header:
```
X-Webhook-Signature: sha256=<hmac-sha256-signature>
```

The signature is computed as: `HMAC-SHA256(payload_string, secret)`

