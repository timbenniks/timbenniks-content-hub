# Database Schema Documentation

Complete database schema documentation for the News Aggregator application.

## Overview

The application uses Prisma 7 with Neon Postgres. The schema is defined in `prisma/schema.prisma` and uses Prisma's declarative schema format.

## Connection

The database connection is configured in `lib/db.ts`:
- Uses Neon's serverless adapter for optimal serverless performance
- Supports Prisma Accelerate URLs
- Connection pooling handled by Neon adapter

## Models

### User

Represents authenticated users (managed by Auth.js).

```prisma
model User {
  id            String    @id @default(uuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime?
  image         String?
  accounts      Account[]
  sessions      Session[]
  projects      Project[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}
```

**Fields**:
- `id`: UUID primary key
- `name`: User's display name
- `email`: Email address (unique)
- `emailVerified`: Email verification timestamp
- `image`: Profile image URL
- `accounts`: Related OAuth accounts
- `sessions`: Active sessions
- `projects`: Projects owned by user

### Account

OAuth account connections (managed by Auth.js).

```prisma
model Account {
  id                String  @id @default(uuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@index([userId])
}
```

**Fields**:
- `id`: UUID primary key
- `userId`: Foreign key to User
- `provider`: OAuth provider (e.g., "contentstack")
- `providerAccountId`: Provider's user ID
- OAuth token fields (refresh_token, access_token, etc.)

### Session

User sessions (managed by Auth.js).

```prisma
model Session {
  id           String   @id @default(uuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}
```

**Fields**:
- `id`: UUID primary key
- `sessionToken`: Unique session token
- `userId`: Foreign key to User
- `expires`: Session expiration timestamp

### VerificationToken

Email verification tokens (managed by Auth.js).

```prisma
model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}
```

### Project

Represents a news aggregation project.

```prisma
model Project {
  id          String   @id @default(uuid())
  name        String
  slug        String   @unique
  description String?
  apiKey      String   @unique
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  sources     Source[]
  items       Item[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([userId])
  @@index([slug])
  @@index([apiKey])
}
```

**Fields**:
- `id`: UUID primary key
- `name`: Project name
- `slug`: URL-friendly identifier (unique)
- `description`: Optional project description
- `apiKey`: API key for public API access (unique)
- `userId`: Foreign key to User (project owner)
- `sources`: Related sources
- `items`: Related items

**Indexes**:
- `userId`: For user's projects queries
- `slug`: For URL lookups
- `apiKey`: For API authentication

### Source

Represents an RSS/Atom feed source (native or custom).

```prisma
model Source {
  id                     String   @id @default(uuid())
  projectId              String
  siteUrl                String
  feedUrl                String?
  title                  String?
  description            String?
  feedType               FeedType @default(NATIVE)
  cloudflareProtected    Boolean  @default(false)
  cloudflareWarningShown Boolean  @default(false)
  customRSSConfig        Json?
  detectionMetadata      Json?
  status                 SourceStatus @default(ACTIVE)
  lastFetchedAt          DateTime?
  lastError              String?  @db.Text
  project                Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  items                  Item[]
  createdAt              DateTime @default(now())
  updatedAt              DateTime @updatedAt

  @@index([projectId])
  @@index([status])
}
```

**Fields**:
- `id`: UUID primary key
- `projectId`: Foreign key to Project
- `siteUrl`: Website URL
- `feedUrl`: RSS/Atom feed URL (nullable for custom RSS)
- `title`: Source title (extracted from feed or page)
- `description`: Source description
- `feedType`: `NATIVE` or `CUSTOM`
- `cloudflareProtected`: Whether site is protected by Cloudflare
- `cloudflareWarningShown`: Whether warning was shown to user
- `customRSSConfig`: JSON configuration for custom RSS (selectors, etc.)
- `detectionMetadata`: JSON metadata from Cloudflare detection
- `status`: `ACTIVE`, `ERROR`, or `INACTIVE`
- `lastFetchedAt`: Last successful fetch timestamp
- `lastError`: Last error message (if status is ERROR)

**Enums**:
```prisma
enum FeedType {
  NATIVE
  CUSTOM
}

enum SourceStatus {
  ACTIVE
  ERROR
  INACTIVE
}
```

**Indexes**:
- `projectId`: For project's sources queries
- `status`: For filtering by status

### Item

Represents an aggregated feed item.

```prisma
model Item {
  id            String   @id @default(uuid())
  projectId     String
  sourceId      String
  guid          String?  @db.Text
  url           String   @db.Text
  title         String
  author        String?
  publishedAt   DateTime?
  contentSnippet String?  @db.Text
  contentHtml   String?  @db.Text
  project       Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  source        Source   @relation(fields: [sourceId], references: [id], onDelete: Cascade)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@unique([projectId, url])
  @@index([projectId])
  @@index([sourceId])
  @@index([publishedAt])
}
```

**Fields**:
- `id`: UUID primary key
- `projectId`: Foreign key to Project
- `sourceId`: Foreign key to Source
- `guid`: Feed item GUID (nullable)
- `url`: Item URL (unique per project)
- `title`: Item title
- `author`: Author name (nullable)
- `publishedAt`: Publication date (nullable)
- `contentSnippet`: Plain text excerpt (first 500 chars)
- `contentHtml`: Full HTML content

**Unique Constraint**:
- `(projectId, url)`: Prevents duplicate items per project

**Indexes**:
- `projectId`: For project's items queries
- `sourceId`: For source's items queries
- `publishedAt`: For date-based sorting and filtering

## Relationships

```
User
  ├── Account[] (1:many)
  ├── Session[] (1:many)
  └── Project[] (1:many)

Project
  ├── User (many:1)
  ├── Source[] (1:many)
  └── Item[] (1:many)

Source
  ├── Project (many:1)
  └── Item[] (1:many)

Item
  ├── Project (many:1)
  └── Source (many:1)
```

## Cascading Deletes

- Deleting a User deletes all their Projects
- Deleting a Project deletes all its Sources and Items
- Deleting a Source deletes all its Items
- Deleting an Account or Session deletes when User is deleted

## Migrations

Migrations are managed with Prisma Migrate:

```bash
# Create a new migration
npm run db:migrate

# Apply migrations in production
npx prisma migrate deploy

# Reset database (dev only)
npx prisma migrate reset
```

## Query Examples

### Get Project with Sources

```typescript
const project = await db.project.findUnique({
  where: { id: projectId },
  include: {
    sources: {
      orderBy: { createdAt: 'desc' }
    }
  }
});
```

### Get Items for Project

```typescript
const items = await db.item.findMany({
  where: { projectId },
  include: { source: true },
  orderBy: { publishedAt: 'desc' },
  take: 50
});
```

### Upsert Item (Prevent Duplicates)

```typescript
await db.item.upsert({
  where: {
    projectId_url: {
      projectId,
      url: itemUrl
    }
  },
  create: {
    projectId,
    sourceId,
    url: itemUrl,
    title,
    // ... other fields
  },
  update: {
    title,
    // ... update fields
  }
});
```

## Performance Considerations

1. **Indexes**: All foreign keys and frequently queried fields are indexed
2. **Unique Constraints**: Prevent duplicate items per project
3. **Cascading Deletes**: Automatic cleanup of related records
4. **Selective Queries**: Use `select` to fetch only needed fields
5. **Connection Pooling**: Handled by Neon adapter

## Future Schema Changes

When modifying the schema:

1. Update `prisma/schema.prisma`
2. Create migration: `npm run db:migrate`
3. Generate Prisma client: `npm run db:generate`
4. Update TypeScript types (auto-generated)
5. Update application code if needed

