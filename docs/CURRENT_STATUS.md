# Project Status Documentation: Maitr SaaS Platform

**Last Updated:** January 2025  
**Architecture:** Vite SPA + Express Backend + PostgreSQL  
**Authentication:** Clerk (Managed Authentication)  
**Hosting:** Netlify (Frontend) + Railway (Backend & Database)

---

## 1. High-Level Architecture

### Tech Stack

#### Frontend

- **Framework:** React 18.3.1 with TypeScript
- **Build Tool:** Vite 7.1.2 (SPA mode)
- **Styling:** Tailwind CSS 3.4.17 + PostCSS
- **Components:** Radix UI (Accessible component library)
- **State Management:** React Query (TanStack) + Local State + Persistence
- **Forms:** React Hook Form + Zod validation
- **Animation:** Framer Motion
- **HTTP Client:** Axios with Clerk token injection

#### Backend

- **Runtime:** Node.js (ES Modules)
- **Framework:** Express 5.1.0
- **Authentication Provider:** Clerk (@clerk/clerk-sdk-node)
- **Database ORM:** Prisma 5.22.0
- **Validation:** Zod

#### Database

- **Provider:** PostgreSQL (Neon)
- **Database Name:** `neondb`
- **Connection Pool:** Netlify Postgres Pooler

#### Hosting & Deployment

- **Frontend Hosting:** Netlify (deployed via `npm run build`)
- **Backend Deployment:** Netlify Serverless Functions (`/.netlify/functions/`)
- **Database Host:** Neon (PostgreSQL SaaS)

### Infrastructure Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Browser                           │
│  (React SPA - Vite)  maitr.de                              │
│                     index.html + JS/CSS                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ 1. Fetch `/api/*` requests
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                  Netlify Frontend (CDN)                      │
│ - Serves static SPA (dist/spa/)                             │
│ - Redirects /api/* → /.netlify/functions/api/:splat        │
│ - Redirects /* → index.html (SPA routing)                  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ 2. API requests routed to serverless
                       │
┌──────────────────────▼──────────────────────────────────────┐
│         Netlify Serverless Functions (Compute)              │
│  /.netlify/functions/api                                   │
│  - Express Server (dist/server/*)                           │
│  - Clerk Token Verification                                 │
│  - Lazy User Sync to DB                                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ 3. Database queries (Prisma Client)
                       │
┌──────────────────────▼──────────────────────────────────────┐
│            PostgreSQL (Neon - ep-bitter-silence)            │
│  - User (clerkId, email, fullName, role)                   │
│  - Business, WebApp, Tenant, Restaurant, etc.              │
│  - Connection Pool: NETLIFY_DATABASE_URL                   │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. Authentication Flow (Deep Dive)

### Lazy Sync Mechanism

The **Lazy Sync** pattern ensures that Clerk manages authentication while Prisma maintains the user record in the database. On every authenticated request, the backend checks if the user exists in the DB; if not, it creates the record automatically.

### Detailed Authentication Flow

#### Step 1: Frontend - Clerk Session Setup

**File:** `client/App.tsx`

```
1. ClerkProvider wraps entire app
   - VITE_CLERK_PUBLISHABLE_KEY injected from .env
   - Clerk modal UI components available globally
```

#### Step 2: Frontend - Token Acquisition

**File:** `client/pages/Configurator.tsx` (example authenticated page)

```javascript
import { useAuth } from "@clerk/clerk-react";

export default function Configurator() {
  const { getToken, isSignedIn } = useAuth();
  // getToken() → returns Promise<string | null>
  // Used in callbacks to include Bearer token in API requests
}
```

#### Step 3: Frontend - Dynamic API Client Creation

**File:** `client/lib/api.ts` & `client/lib/apiClient.ts`

The frontend uses a factory pattern to create authenticated API clients:

```javascript
// createApiClient(getToken) → axios instance with interceptor
const apiClient = axios.create({ baseURL: "/api" });
apiClient.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

**Key Pages Using This Pattern:**

- `client/pages/Dashboard.tsx` - passes token to `configurationApi.getAll(token)`
- `client/pages/Configurator.tsx` - passes token to `configurationApi.save(configData, token)`
- `client/lib/webapps.ts` - `publishWebApp(subdomain, config, token)`

#### Step 4: HTTP Request - Bearer Token Attached

Frontend sends:

```
POST /api/configurations
Authorization: Bearer eyJhbGci0.eyJzdWIiOiJ1c2VyXzJq...
Content-Type: application/json

{ "businessName": "My Café", ... }
```

#### Step 5: Backend - Token Verification

**File:** `server/middleware/auth.ts`

```javascript
export async function requireAuth(req, res, next) {
  // 1. Extract token from Authorization header
  const token = req.headers.authorization.slice(7); // Remove "Bearer "

  // 2. Verify with Clerk
  const verified = await verifyClerkToken(token);
  // Returns: { sub: "user_2j...", email: "user@example.com" }

  // 3. Lazy Sync: Get or create Prisma user
  const prismaUser = await getOrCreateUser(verified.sub, verified.email);
  // Returns: { id: "uuid", clerkId: "user_2j...", email: "..." }

  // 4. Attach to request object
  req.user = {
    id: prismaUser.id,
    email: prismaUser.email,
    clerkId: prismaUser.clerkId,
  };

  next();
}
```

#### Step 6: Backend - Clerk Token Verification

**File:** `server/utils/clerk.ts`

```javascript
export async function verifyClerkToken(token: string): Promise<VerifiedToken> {
  // Uses @clerk/clerk-sdk-node
  const decoded = await verifyToken(token, {
    secretKey: process.env.CLERK_SECRET_KEY,
  });

  return {
    sub: decoded.sub,           // Clerk User ID
    email: decoded.email,       // User's email
    firstName: decoded.firstName,
    lastName: decoded.lastName,
  };
}
```

#### Step 7: Backend - Lazy Sync (Create User if Not Exists)

**File:** `server/utils/clerk.ts`

```javascript
export async function getOrCreateUser(clerkId: string, email?: string) {
  // Step 7a: Check if user already exists
  let user = await prisma.user.findUnique({ where: { clerkId } });
  if (user) return user; // Already exists, return immediately

  // Step 7b: Create new user (first time signing in)
  if (!email) throw new Error("Cannot create user without email");

  console.log(`[Lazy Sync] Creating new user: clerkId=${clerkId}, email=${email}`);
  user = await prisma.user.create({
    data: {
      clerkId,      // Maps to Clerk
      email,        // From Clerk token
      role: "OWNER", // Default role
    },
  });

  return user;
}
```

#### Step 8: Backend - Request Handler Executes

**File:** `server/routes/configurations.ts` (example)

```javascript
export async function saveConfiguration(req, res) {
  // req.user is now populated by requireAuth middleware
  const userId = req.user.id; // Prisma UUID (NOT Clerk ID)

  const config = {
    ...req.body,
    userId, // Associate with Prisma user
  };

  const result = await configurationApi.save(config);
  res.json({ success: true, data: result });
}
```

### Complete Authentication Flow Diagram

```
Browser                  Frontend                Backend              Database
  │                        │                        │                    │
  │──(click login button)──→ Clerk Modal           │                    │
  │←──(Clerk token)───────── Clerk                 │                    │
  │                        │                        │                    │
  │─────────(API call)────→ createApiClient        │                    │
  │                        │ ├─ await getToken()   │                    │
  │                        │ └─ POST /api/configs  │                    │
  │                        │    + Authorization    │                    │
  │                        │                        │                    │
  │                        │──────────────────────→ requireAuth          │
  │                        │                        │ ├─ Extract token   │
  │                        │                        │ ├─ verifyClerkToken│
  │                        │                        │ ├─ Verify with Clerk
  │                        │                        │ │ (CLERK_SECRET_KEY)
  │                        │                        │                    │
  │                        │                        │──────────────────→ SELECT user WHERE clerkId = ?
  │                        │                        │                    │
  │                        │                        │←─────────────────── Result: null (first time)
  │                        │                        │                    │
  │                        │                        │──────────────────→ INSERT user (clerkId, email, role)
  │                        │                        │                    │
  │                        │                        │←─────────────────── Result: { id, clerkId, email }
  │                        │                        │                    │
  │                        │                        │ (req.user set)     │
  │                        │                        │ Handler executes   │
  │                        │                        │                    │
  │                        │                        │──────────────────→ INSERT/UPDATE configuration
  │                        │                        │                    │
  │                        │                        │←─────────────────── Result: { id, config }
  │                        │                        │                    │
  │                        │←──────────────────────── 200 OK + data
  │←────────────────────── Response received
```

### File Chain Summary

| Layer        | File                            | Purpose                                             |
| ------------ | ------------------------------- | --------------------------------------------------- |
| **Frontend** | `client/App.tsx`                | Wraps app in `<ClerkProvider>`                      |
| **Frontend** | `client/pages/Configurator.tsx` | Calls `useAuth()` to get `getToken()`               |
| **Frontend** | `client/lib/api.ts`             | `configurationApi.save(config, token)`              |
| **Frontend** | `client/lib/apiClient.ts`       | Factory: `createApiClient(getToken)`                |
| **Frontend** | `client/lib/webapps.ts`         | `publishWebApp(subdomain, config, token)`           |
| **HTTP**     | N/A                             | Bearer token in Authorization header                |
| **Backend**  | `server/index.ts`               | Mounts `requireAuth` middleware on protected routes |
| **Backend**  | `server/middleware/auth.ts`     | Extracts token, calls verify & sync                 |
| **Backend**  | `server/utils/clerk.ts`         | `verifyClerkToken()` & `getOrCreateUser()`          |
| **Database** | `prisma/schema.prisma`          | User model with `clerkId` unique constraint         |

---

## 3. Database Schema

### Current Prisma Schema (`prisma/schema.prisma`)

#### Core User Model

```prisma
model User {
  id          String       @id @default(uuid())
  clerkId     String       @unique  // Maps to Clerk user ID
  email       String       @unique
  fullName    String?
  role        UserRole     @default(OWNER)
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  // Relations
  businesses  BusinessMember[]
  webApps     WebApp[]
  tenants     Tenant[]
}

enum UserRole {
  OWNER
  ADMIN
  STAFF
}
```

**Key Points:**

- `clerkId` is **UNIQUE** - one Clerk user maps to exactly one Prisma user
- `email` is **UNIQUE** - prevents duplicates
- No `passwordHash` field (auth delegated to Clerk)

#### Business & Menu Models

```prisma
model Business {
  id              String          @id @default(uuid())
  slug            String          @unique
  name            String
  description     String?         @db.Text
  logoUrl         String?
  primaryColor    String          @default("#000000")
  secondaryColor  String          @default("#ffffff")
  fontFamily      String          @default("sans")
  template        String          @default("minimalist")
  openingHours    Json?
  socialLinks     Json?
  contactInfo     Json?
  status          BusinessStatus  @default(DRAFT)

  members         BusinessMember[]
  categories      MenuCategory[]
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
}

model MenuCategory {
  id          String      @id @default(uuid())
  name        String
  businessId  String
  business    Business    @relation(fields: [businessId], references: [id], onDelete: Cascade)
  items       MenuItem[]
}

model MenuItem {
  id          String       @id @default(uuid())
  name        String
  description String?      @db.Text
  price       Decimal      @db.Decimal(10, 2)
  imageUrl    String?
  categoryId  String
  category    MenuCategory @relation(fields: [categoryId], references: [id], onDelete: Cascade)
}
```

#### Web Apps & Publishing

```prisma
model WebApp {
  id          String      @id @default(uuid())
  userId      String
  subdomain   String      @unique
  configData  Json
  publishedAt DateTime?
  updatedAt   DateTime    @updatedAt
  createdAt   DateTime    @default(now())

  user        User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  orders      OrderEvent[]
}

model OrderEvent {
  id              String    @id @default(uuid())
  webAppId        String
  orderId         String?
  menuItemId      String?
  menuItemName    String
  orderedAt       DateTime  @default(now())
  orderSource     String    // 'stripe' | 'pos_api' | 'manual'
  userAvatarUrl   String?

  webApp          WebApp    @relation(fields: [webAppId], references: [id], onDelete: Cascade)

  @@index([webAppId])
  @@index([orderedAt])
}
```

#### Multi-Tenancy Models

```prisma
model Tenant {
  id              String      @id @default(uuid())
  slug            String      @unique
  userId          String
  schemaName      String      @unique
  restaurantId    String
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  user            User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  restaurants     Restaurant[]
}

model Restaurant {
  id              String    @id @default(uuid())
  tenantId        String
  name            String
  configJson      Json?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  tenant          Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
}
```

### Key Relationships

```
┌─────────────────────────────────────┐
│  Clerk (External Service)           │
│  - User ID (sub)                    │
│  - Email                            │
│  - Token Management                 │
└─────────────────┬───────────────────┘
                  │ clerkId mapping
                  │ (unique constraint)
                  ▼
            ┌──────────┐
            │   User   │  1:N ┌───────────────┐
            └──────────┼─────▶│ BusinessMember│
                  │    │      └───────────────┘
                  │    │ 1:N
                  │    └─────▶┌────────┐
                  │           │ WebApp │──────┐
                  │           └────────┘      │ 1:N
                  │                           │
                  │ 1:N                       ▼
                  └──────────┐         ┌──────────────┐
                             │         │ OrderEvent   │
                             │         └──────────────┘
                             ▼
                      ┌────────────┐
                      │  Tenant    │
                      └────────────┘
                             │ 1:N
                             ▼
                      ┌──────────────┐
                      │ Restaurant   │
                      └──────────────┘
```

---

## 4. API Structure

### Main API Router

**File:** `server/routes/index.ts`

### Protected Endpoints (Require Clerk Token)

All endpoints under `/api/` that are protected require the `requireAuth` middleware:

#### User API

```
GET  /api/users/me
     - Returns: { user: { id, email, fullName, role } }
     - Protected: Yes (requireAuth)

PUT  /api/users/profile
     - Body: { fullName: string }
     - Returns: { user: { id, email, fullName, role } }
     - Protected: Yes (requireAuth)
```

#### Configuration API

```
POST /api/configurations
     - Body: { businessName, template, colors, ... }
     - Returns: { id, userId, config_data, ... }
     - Protected: Yes (requireAuth)

GET  /api/configurations
     - Query: None
     - Returns: { configurations: [...] }
     - Protected: Yes (requireAuth)

GET  /api/configurations/:id
     - Params: id (configuration UUID)
     - Returns: { configuration: {...} }
     - Protected: Yes (requireAuth)

PUT  /api/configurations/:id
     - Body: { ...updated_config }
     - Returns: { configuration: {...} }
     - Protected: Yes (requireAuth)

DELETE /api/configurations/:id
     - Params: id
     - Returns: { success: true }
     - Protected: Yes (requireAuth)

POST /api/configurations/:id/publish
     - Body: { config?: {...} }
     - Returns: { configuration: {..., publishedUrl, previewUrl } }
     - Protected: Yes (requireAuth)
```

#### Web Apps API

```
POST /api/apps/publish
     - Body: { subdomain, config }
     - Returns: { id, subdomain, publishedUrl, previewUrl }
     - Protected: Yes (Bearer token)

GET  /api/apps
     - Returns: { apps: [...] }
     - Protected: Yes (Bearer token)

GET  /api/apps/:id
     - Returns: { ...app_details }
     - Protected: Yes (Bearer token)

PUT  /api/apps/:id
     - Body: { config: {...} }
     - Returns: { ...updated_app }
     - Protected: Yes (Bearer token)
```

### Public Endpoints (No Authentication Required)

```
GET  /api/sites/:subdomain
     - Returns: Published site configuration
     - Protected: No (public viewing)

GET  /api/demo
     - Returns: Demo configuration
     - Protected: No

GET  /api/instagram
     - Returns: Instagram photos
     - Protected: No

GET  /health
     - Returns: { status: "ok" }
     - Protected: No (health check)

GET  /api/ping
     - Returns: { message: "ping" }
     - Protected: No (health check)
```

### Protection Mechanism

Protected routes are wrapped with `requireAuth` middleware:

```javascript
// In server/index.ts
app.use("/api/configurations", requireAuth);
app.use("/api/users", requireAuth, usersRouter);

// requireAuth validates Bearer token and populates req.user
```

---

## 5. Current Folder Structure

### Root Level

```
.
├── .env                           # Environment variables (local dev)
├── .env.example                   # Template for required env vars
├── package.json                   # Dependencies & build scripts
├── vite.config.ts                 # Vite configuration (dev + build)
├── vite.config.server.ts          # Vite server build config
├── vitest.config.ts               # Test configuration
├── tsconfig.json                  # TypeScript configuration
├── prisma/
│   └── schema.prisma              # Database schema
├── netlify.toml                   # Netlify deployment config
├── netlify/                       # Netlify functions
│   └── functions/
│       └── api.ts                 # Serverless API entry point
└── docs/                          # Documentation
    └── CURRENT_STATUS.md          # This file
```

### Frontend (`client/`)

```
client/
├── App.tsx                        # Root component (ClerkProvider wrapper)
├── global.css                     # Global Tailwind styles
├── pages/                         # Page components
│   ├── Index.tsx                  # Landing page
│   ├── Configurator.tsx           # Main app configurator (13KB)
│   ├── Dashboard.tsx              # User dashboard
│   ├── Profile.tsx                # User profile (Clerk integration)
│   ├── Login.tsx                  # Login page (Clerk modal)
│   ├── Signup.tsx                 # Signup page (Clerk modal)
│   ├── ModeSelection.tsx          # Workflow mode selection
│   ├── AutoConfigurator.tsx       # Auto-config mode
│   ├── AdvancedConfigurator.tsx   # Advanced config mode
│   ├── Site.tsx                   # Published site viewer
│   └── NotFound.tsx               # 404 page
├── components/
│   ├── ErrorBoundary.tsx          # Error handling
│   ├── RequireAuth.tsx            # Route protection (useAuth)
│   ├── editor/                    # Configuration editor
│   │   ├── CardBasedEditor.tsx
│   │   └── cards/                 # Editor UI sections
│   │       ├── MenuItemsCard.tsx
│   │       ├── SettingsCard.tsx
│   │       ├── PublishCard.tsx
│   │       └── ...
│   ├── preview/                   # Phone frame preview
│   │   ├── LivePhoneFrame.tsx
│   │   └── phone-portal.tsx
│   ├── sections/                  # Site sections
│   │   ├── MenuSection.tsx
│   │   ├── GalleryGrid.tsx
│   │   └── ...
│   ├── template/                  # Template registry
│   │   └── TemplateRegistry.tsx
│   ├── ui/                        # Shadcn UI components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   └── ...
│   └── qr/                        # QR code generation
│       └── QRCode.tsx
├── lib/
│   ├── apiClient.ts               # Axios factory (createApiClient)
│   ├── api.ts                     # API function wrappers
│   ├── webapps.ts                 # Web app publishing
│   ├── stepPersistence.ts         # State persistence
│   ├── utils.ts                   # Utility functions
│   └── schemaGenerator.ts         # Schema generation
├── hooks/
│   ├── use-toast.ts               # Toast notifications
│   ├── useDebounce.tsx            # Debounce hook
│   ├── useRecentOrders.ts         # Recent orders hook
│   └── use-mobile.tsx             # Mobile detection
├── types/
│   └── n8n.ts                     # n8n integration types
└── utils/
    └── debug.ts                   # Debug utilities
```

### Backend (`server/`)

```
server/
├── index.ts                       # Express app setup
├── db/
│   └── prisma.ts                  # Prisma client singleton
├── middleware/
│   └── auth.ts                    # requireAuth middleware
├── utils/
│   └── clerk.ts                   # Clerk utilities (verifyClerkToken, getOrCreateUser)
├── routes/
│   ├── index.ts                   # Main API router
│   ├── configurations.ts          # Configuration endpoints
│   ├── webapps.ts                 # Web app endpoints
│   ├── users.ts                   # User profile endpoints
│   ├── orders.ts                  # Order event endpoints
│   ├── subdomains.ts              # Subdomain routing
│   ├── config.ts                  # Config by slug
│   ├── instagram.ts               # Instagram integration
│   ├── demo.ts                    # Demo endpoint
│   ├── schema.ts                  # Schema generation
│   ├── autogen.ts                 # Auto-generation
│   └── n8nProxy.ts                # n8n proxy
├── webhooks/
│   └── stripe.ts                  # Stripe webhook handling
└── services/
    └── orderService.ts            # Order business logic
```

### Database (`prisma/`)

```
prisma/
└── schema.prisma                  # Prisma schema (User, Business, WebApp, Tenant, etc.)
```

---

## 6. Environment Variables

### Frontend Environment Variables (Vite)

**Location:** `.env` (root)  
**Access:** Via `import.meta.env.VITE_*`

| Variable                            | Value         | Purpose                                |
| ----------------------------------- | ------------- | -------------------------------------- |
| `VITE_CLERK_PUBLISHABLE_KEY`        | `pk_test_...` | Clerk public key for ClerkProvider     |
| `VITE_STACK_PROJECT_ID`             | UUID          | Stack Auth (legacy, may be deprecated) |
| `VITE_STACK_PUBLISHABLE_CLIENT_KEY` | Key string    | Stack Auth client key (legacy)         |

### Backend Environment Variables (Node.js)

**Location:** `.env` (root)  
**Access:** Via `process.env.*`

| Variable               | Value                                   | Purpose                                             |
| ---------------------- | --------------------------------------- | --------------------------------------------------- |
| `DATABASE_URL`         | `postgresql://...@ep-bitter-silence...` | Neon PostgreSQL connection string                   |
| `NETLIFY_DATABASE_URL` | `postgresql://...@ep-bitter-silence...` | Netlify proxy connection string (same as above)     |
| `CLERK_SECRET_KEY`     | `sk_test_...`                           | Clerk secret key for server-side token verification |
| `JWT_SECRET`           | Secret string                           | Legacy JWT secret (may be deprecated)               |
| `SITE_URL`             | `https://maitr.de`                      | Production site URL                                 |
| `PUBLIC_BASE_DOMAIN`   | `maitr.de`                              | Base domain for subdomains                          |
| `PING_MESSAGE`         | `ping`                                  | Health check message                                |

### Example `.env.example`

```bash
# Clerk Authentication
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://user:password@ep-bitter-silence.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
NETLIFY_DATABASE_URL=${DATABASE_URL}

# Site Configuration
SITE_URL=https://maitr.de
PUBLIC_BASE_DOMAIN=maitr.de

# Legacy (may be deprecated)
VITE_STACK_PROJECT_ID=...
VITE_STACK_PUBLISHABLE_CLIENT_KEY=...
STACK_SECRET_SERVER_KEY=...
JWT_SECRET=...
```

### Netlify Configuration

**Location:** `netlify.toml`

```toml
[build]
command = "npm run build"
functions = "netlify/functions"
publish = "dist/spa"

[[redirects]]
from = "/api/*"
to = "/.netlify/functions/api/:splat"
status = 200

[[redirects]]
from = "/*"
to = "/index.html"
status = 200
```

**How It Works:**

1. Frontend build output → `dist/spa/` (served by Netlify CDN)
2. API requests `/api/*` → routed to `/.netlify/functions/api/` (serverless Express)
3. SPA routing → any unmatched route → `index.html` (client-side React Router handles it)

---

## 7. Development Workflow

### Local Development

```bash
# Install dependencies
pnpm install

# Start dev server (Vite + Express)
npm run dev
# Opens http://localhost:8080

# In separate terminal, watch Prisma changes
npx prisma db push
```

**What Happens:**

- Vite dev server runs on port 8080
- Express server integrated via Vite plugin (see `vite.config.ts`)
- Database changes synchronized via `npx prisma db push`
- HMR (Hot Module Reload) enabled for React components

### Building for Production

```bash
# Build both client and server
npm run build

# Outputs:
# - dist/spa/          (frontend SPA)
# - dist/server/       (backend code)

# Deploy to Netlify (automated via git push)
git push origin main
```

### Database Migrations

```bash
# Create migration from schema changes
npx prisma migrate dev --name description

# Apply pending migrations
npx prisma db push

# Reset database (dev only!)
npx prisma db push --force-reset
```

---

## 8. Key Implementation Notes

### Clerk Integration Status

✅ **Completed:**

- Frontend ClerkProvider setup in `client/App.tsx`
- Clerk modal components in Login/Signup pages
- Backend token verification in `server/utils/clerk.ts`
- Lazy sync user creation in `getOrCreateUser()`
- Protected routes via `requireAuth` middleware
- Dynamic API client with Bearer token injection

### Database Synchronization

✅ **Completed:**

- Prisma schema with `clerkId` unique constraint
- Neon PostgreSQL connection via `DATABASE_URL`
- Netlify pooler support via `NETLIFY_DATABASE_URL`
- Lazy sync on every authenticated request

### Authentication Files Chain

```
Frontend:
  client/App.tsx
  ├── ClerkProvider
  ├── ClerkSyncListener (if exists)
  └── Routes

Page/Component:
  ├── useAuth() → getToken()
  ├── useUser() → user state
  └── API calls with token

API Layer:
  client/lib/api.ts (configurationApi, sessionApi)
  client/lib/apiClient.ts (createApiClient factory)
  client/lib/webapps.ts (publishWebApp with token)

Backend:
  server/index.ts
  ├── requireAuth middleware on /api/* routes
  ├── server/middleware/auth.ts
  └── server/utils/clerk.ts
      ├── verifyClerkToken()
      └── getOrCreateUser()

Database:
  prisma/schema.prisma
  └── User model with clerkId mapping
```

### Current Limitations & TODOs

- **Legacy Auth System:** Stack Auth references still in `.env` (may be removed)
- **Tenancy Model:** Multi-tenancy via Prisma (not Clerk Organizations)
- **Role Management:** Basic OWNER/ADMIN/STAFF roles (no granular permissions)
- **Session Validation:** Token validated on every request (can be optimized with caching)

---

## 9. Deployment Architecture

### Netlify Frontend

- **Build Command:** `npm run build:client`
- **Output Directory:** `dist/spa/`
- **Asset Optimization:** CSS/JS bundling, minification
- **CDN:** Global CDN for static assets
- **Redirects:** `/api/*` → serverless functions, `/*` → SPA fallback

### Netlify Serverless Backend

- **Function:** `netlify/functions/api.ts`
- **Runtime:** Node.js
- **Build Command:** `npm run build:server`
- **Output:** `dist/server/**/*.js`
- **Cold Starts:** Minimal due to Node.js warmup

### Neon PostgreSQL

- **Instance:** `ep-bitter-silence` (production)
- **Connection Pool:** Netlify built-in pooler
- **Schema:** Managed via Prisma migrations
- **Backups:** Automatic (Neon managed)

---

## 10. References & Further Reading

- **Clerk Documentation:** https://clerk.com/docs
- **Prisma ORM:** https://www.prisma.io/docs
- **Express.js:** https://expressjs.com/
- **Vite Build Tool:** https://vitejs.dev/
- **Netlify Functions:** https://docs.netlify.com/functions/overview/
- **Neon PostgreSQL:** https://neon.tech/docs

---

**Document Version:** 1.0  
**Last Updated:** January 2025  
**Author:** Maitr Architecture Team
