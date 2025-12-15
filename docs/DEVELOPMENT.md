# Development Guide

Comprehensive guide for developers and AI agents working on the News Aggregator project.

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn package manager
- Neon Postgres database (or local PostgreSQL)
- Contentstack OAuth credentials

### Initial Setup

1. **Clone the repository** (if applicable)

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

4. **Set up database**:
   ```bash
   # Generate Prisma client
   npm run db:generate
   
   # Run migrations
   npm run db:migrate
   ```

5. **Start development server**:
   ```bash
   npm run dev
   ```

6. **Open browser**:
   ```
   http://localhost:3000
   ```

## Development Workflow

### Code Structure

The project follows Next.js 16 App Router conventions:

- **`app/`**: Next.js routes and layouts
- **`lib/`**: Core business logic and utilities
- **`components/`**: React components
- **`prisma/`**: Database schema and migrations
- **`docs/`**: Documentation

### Adding a New Feature

1. **Plan the feature**:
   - Database changes? Update `prisma/schema.prisma`
   - New API route? Create in `app/api/`
   - New UI component? Create in `components/`

2. **Create database migration** (if needed):
   ```bash
   npm run db:migrate
   ```

3. **Implement the feature**:
   - Write business logic in `lib/`
   - Create API routes in `app/api/`
   - Build UI components in `components/`

4. **Test locally**:
   ```bash
   npm run dev
   ```

5. **Run linter**:
   ```bash
   npm run lint
   ```

### Database Changes

1. **Update schema** (`prisma/schema.prisma`)

2. **Create migration**:
   ```bash
   npm run db:migrate
   # Enter migration name when prompted
   ```

3. **Generate Prisma client**:
   ```bash
   npm run db:generate
   ```

4. **Update code** to use new schema

### Adding a New API Route

1. **Create route file**:
   ```
   app/api/[resource]/route.ts
   ```

2. **Export HTTP methods**:
   ```typescript
   export async function GET(request: NextRequest) {
     // Implementation
   }
   
   export async function POST(request: NextRequest) {
     // Implementation
   }
   ```

3. **Add authentication** (if needed):
   ```typescript
   const session = await auth();
   if (!session) {
     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
   }
   ```

4. **Handle errors**:
   ```typescript
   try {
     // Implementation
   } catch (error) {
     return NextResponse.json(
       { error: error.message },
       { status: 500 }
     );
   }
   ```

### Adding a New UI Component

1. **Create component file**:
   ```
   components/[feature-name].tsx
   ```

2. **Use shadcn/ui components** (if applicable):
   ```typescript
   import { Button } from "@/components/ui/button";
   import { Card } from "@/components/ui/card";
   ```

3. **Follow TypeScript best practices**:
   - Type all props
   - Use React Server Components when possible
   - Use Client Components (`"use client"`) only when needed

## Code Style

### TypeScript

- Use strict mode (enabled in `tsconfig.json`)
- Type all function parameters and return values
- Use Prisma-generated types when possible
- Avoid `any` type (use `unknown` if needed)

### React

- Prefer Server Components over Client Components
- Use `"use client"` only when necessary (interactivity, hooks)
- Extract reusable logic into custom hooks
- Use shadcn/ui components for UI consistency

### File Naming

- Components: `PascalCase.tsx` (e.g., `AddSourceDialog.tsx`)
- Utilities: `kebab-case.ts` (e.g., `fetch-utils.ts`)
- API routes: `route.ts` (Next.js convention)

## Testing

### Manual Testing

1. **Test locally**:
   ```bash
   npm run dev
   ```

2. **Test API endpoints**:
   ```bash
   curl http://localhost:3000/api/projects
   ```

3. **Test cron endpoint**:
   ```bash
   curl -X POST http://localhost:3000/api/cron/daily-refresh \
     -H "x-cron-secret: YOUR_CRON_SECRET"
   ```

### Database Testing

1. **Use Prisma Studio**:
   ```bash
   npm run db:studio
   ```

2. **Query database directly**:
   ```typescript
   import { db } from "@/lib/db";
   const projects = await db.project.findMany();
   ```

## Common Tasks

### Adding a New Feed Source Type

1. Update `FeedType` enum in `prisma/schema.prisma`
2. Update `lib/refresh.ts` to handle new type
3. Update UI components to display new type

### Adding a New Date Format

1. Update `lib/date-utils.ts`
2. Add new parsing pattern
3. Test with various date formats

### Adding a New Article Selector

1. Update `lib/article-detection.ts`
2. Add selector to `ARTICLE_SELECTORS` array
3. Test with various websites

## Debugging

### Common Issues

**Build Errors**:
```bash
# Clear Next.js cache
rm -rf .next
npm run build
```

**Prisma Errors**:
```bash
# Regenerate Prisma client
npm run db:generate
```

**Type Errors**:
```bash
# Check TypeScript
npx tsc --noEmit
```

### Logging

- Use `console.log()` for development
- Use `console.error()` for errors
- Consider structured logging for production

## Git Workflow

1. **Create feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make changes** and commit:
   ```bash
   git add .
   git commit -m "Add feature description"
   ```

3. **Push and create PR**:
   ```bash
   git push origin feature/your-feature-name
   ```

## Deployment

### Vercel Deployment

1. **Connect repository** to Vercel

2. **Set environment variables**:
   - `DATABASE_URL`
   - `AUTH_SECRET`
   - `NEXTAUTH_URL`
   - `CRON_SECRET`
   - Contentstack OAuth credentials

3. **Deploy**:
   - Vercel automatically deploys on push
   - Or deploy manually from dashboard

### Database Migrations in Production

Add to Vercel build command:
```bash
DATABASE_URL=$POSTGRES_URL_NON_POOLING prisma migrate deploy && next build
```

## Best Practices

1. **Keep functions small and focused**
2. **Extract common logic into utilities**
3. **Use TypeScript types everywhere**
4. **Handle errors gracefully**
5. **Document complex logic**
6. **Follow existing code patterns**
7. **Test before committing**

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)

## Getting Help

1. Check existing documentation in `docs/`
2. Review similar code in the codebase
3. Check error messages and logs
4. Review Prisma and Next.js documentation

