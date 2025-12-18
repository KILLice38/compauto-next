# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**compauto-next** - Next.js 15 e-commerce application for turbocharger parts with admin panel, built with App Router, Prisma ORM, NextAuth, and PostgreSQL.

## Development Commands

### Setup and Development
```bash
# Install dependencies
pnpm install

# Run development server with Turbopack
pnpm dev

# Build for production
pnpm build

# Start production server (on all network interfaces)
pnpm start-server

# Type checking
pnpm types

# Linting
pnpm lint

# Code formatting
pnpm prettify
```

### Database Management
```bash
# Create new migration
pnpm prisma migrate dev --name migration_name

# Apply migrations (production)
pnpm prisma migrate deploy

# Reset database (deletes all data)
pnpm prisma migrate reset

# Generate Prisma Client after schema changes
pnpm prisma generate

# Open Prisma Studio (database GUI at localhost:5555)
pnpm prisma studio

# Seed database with 14 test turbocharger products
pnpm db:seed
```

**Important**: The seed script (`prisma/seed.ts`) clears all existing products and creates fresh test data with generated images in `/public/uploads/seed/`.

## Architecture

### Route Structure

The app uses Next.js 15 App Router with route groups:

- **`app/(site)/`** - Public-facing e-commerce site
  - Catalog with filtering, sorting, search
  - Product detail pages
  - Home page with novelty section

- **`app/admin/`** - Protected admin panel
  - Product management (CRUD)
  - Authentication required via middleware
  - Login page at `/admin/login`

- **`app/api/`** - API routes
  - `auth/[...nextauth]/` - NextAuth authentication
  - `products/` - Product CRUD operations
  - `upload/` - Image upload with variant generation
  - `cleanup/` - Manual cleanup of temporary files (auth required)
  - `cron/cleanup/` - Automated cleanup endpoint (CRON_SECRET required)

### Authentication & Security

**NextAuth** configuration in `app/api/auth/authOptions.ts`:
- JWT strategy with credentials provider
- bcrypt password hashing
- Session managed via JWT tokens
- Custom sign-in page: `/admin/login`

**Middleware** (`middleware.ts`) enforces:
- Authentication check for `/admin/*` routes (except `/admin/login`)
- CSP (Content Security Policy) with nonce for inline scripts
- Security headers: X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy
- Development mode allows `unsafe-eval` for HMR

**Rate Limiting** (`app/api/lib/rateLimit.ts`):
- In-memory rate limiting (for production, migrate to Redis as documented in RATE_LIMITING.md)
- AUTH_STRICT preset: 5 attempts/min, 15-min block (used for auth endpoints)
- Usage: `checkRateLimit(req, identifier, RateLimitPresets.AUTH_STRICT)`
- Returns 429 with `Retry-After`, `X-RateLimit-*` headers

### Database Schema

**Prisma models** (`prisma/schema.prisma`):

```prisma
Product {
  id          Int
  slug        String @unique
  img         String           // Main image path
  gallery     String[]         // Array of gallery image paths
  title       String
  description String
  details     String[]         // Array of detail points
  price       Int
  engineModel String
  autoMark    String          // Car brand
  compressor  String          // Compressor type
  createdAt   DateTime
  updatedAt   DateTime
}

User {
  id             String @id @default(cuid())
  email          String @unique
  hashedPassword String
  name           String?
  createdAt      DateTime
}
```

Indexes on: `createdAt`, `price`, `autoMark`, `compressor`, `engineModel`

### Image Handling

**Image Variants System** (`app/lib/imageVariants.ts`):
- All images stored in WebP format
- Four variants auto-generated on upload:
  - `__source.webp` - Original quality
  - `__card.webp` - 400px wide for catalog cards
  - `__detail.webp` - 800px wide for product detail
  - `__thumb.webp` - 100px wide for thumbnails
- Utility functions: `sourceUrl()`, `variantUrl()`
- Sharp library used for image processing

**Upload Flow**:
1. Images uploaded to `/public/uploads/tmp/[uuid]/`
2. Variants generated via Sharp
3. On product save, moved to `/public/uploads/products/[slug]/`
4. Temporary files cleaned up automatically (see Cleanup System)

### Cleanup System

**Automatic cleanup** of temporary uploads older than 24 hours:
- Manual trigger: `POST /api/cleanup` (requires admin auth)
- Cron endpoint: `GET /api/cron/cleanup` (requires `CRON_SECRET` header)
- Vercel Cron configured in `vercel.json` - runs daily at 2:00 UTC
- See `CLEANUP_SETUP.md` for detailed configuration options

### Environment Variables

Required in `.env`:
```bash
# NextAuth
NEXTAUTH_SECRET=<random-secret>
NEXTAUTH_URL=<your-domain>

# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/db?schema=public"

# Initial Admin User (for seeding)
ADMIN_EMAIL=<email>
ADMIN_PASSWORD=<password>

# Cron Job Security
CRON_SECRET=<random-secret>  # Generate with: openssl rand -base64 32
```

### Component Organization

Components in `app/components/`:
- Each component in its own directory with co-located styles (SCSS modules)
- Key components: `header`, `footer`, `nav`, `products`, `product`, `filters`, `gallery`, `burger`, `toast`
- Admin components in `app/admin/components/`: `adminList`, `adminForm`

### Error Handling

**Error Boundary** (`app/components/errorBoundary/`):
- Prevents entire app crash when individual components fail
- Two-level protection:
  - `ClientErrorBoundary` wraps entire app in `app/layout.tsx`
  - `AdminErrorBoundary` wraps admin panel in `app/admin/layout.tsx`
- Features:
  - Fallback UI with recovery options
  - Error logging (development) and tracking hooks (production)
  - "Try again" and "Reload page" actions
  - Custom fallback support via props
- See `ERROR_BOUNDARY_GUIDE.md` for detailed usage

**What Error Boundary catches:**
- Rendering errors in child components
- Lifecycle method errors
- Constructor errors

**What it doesn't catch (use try-catch):**
- Event handler errors
- Async errors (setTimeout, fetch)
- Server-side errors

### Styling

- SCSS modules for component styles
- Global styles in `app/globals.scss`
- Reset CSS included via `reset-css` package
- Responsive utilities in `app/utils/getCssVariable.ts`

### Key Utilities

- `app/lib/prisma.ts` - Prisma client singleton
- `app/lib/products.ts` - Product data fetching helpers
- `app/utils/catalogUtils.ts` - Catalog filtering/sorting logic
- `app/utils/useCatalog.ts` - Catalog state management hook
- `app/api/lib/fileUtils.ts` - File system operations for uploads
- `app/api/lib/cleanup.ts` - Temporary file cleanup logic

### SEO & Metadata

**Dynamic Sitemap** (`app/sitemap.ts`):
- Automatically generated sitemap.xml at build time
- Includes all product pages with `lastModified` timestamps
- Updates based on Product table `updatedAt` field
- Accessible at `/sitemap.xml`

**Robots.txt** (`app/robots.ts`):
- Dynamic robots.txt generation
- Blocks crawling of `/admin/`, `/private/`, `/test/`
- References sitemap at `https://comp-auto.ru/sitemap.xml`

**Product Metadata** (`app/(site)/catalog/[slug]/page.tsx`):
- Each product page has `generateMetadata()` function
- Generates title, description, OpenGraph tags
- Canonical URLs for SEO
- Image meta tags for social sharing

## Testing Rate Limiting

```bash
# Send 6 auth requests to trigger rate limit
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/auth/signin \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
done
```

## Production Considerations

1. **Rate Limiting**: Migrate from in-memory to Redis for multi-instance deployments (see RATE_LIMITING.md)
2. **Image Storage**: Consider cloud storage (S3, Cloudinary) for scalability
3. **Database**: Ensure PostgreSQL connection pooling configured
4. **CSP**: Review and tighten Content Security Policy for production domains
5. **Cleanup Cron**: Verify `CRON_SECRET` is set in production environment
