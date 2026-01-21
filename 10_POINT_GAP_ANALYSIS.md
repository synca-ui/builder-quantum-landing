# 🎯 10-Point Gap Analysis & Refactoring Guide

**Context:** 30ss days to Maitr SaaS launch. This document provides exact code locations, specific gaps, and refactoring instructions for production readiness.

**Severity Legend:**
- 🔴 **CRITICAL** = Blocks launch, requires immediate fix
- 🟠 **HIGH** = Affects users, needs attention in Week 1
- 🟡 **MEDIUM** = Technical debt, should fix before Week 2
- 🟢 **LOW** = Nice-to-have, post-launch optimization

---

## 1️⃣ NEONDB SCHEMA: Multi-Tenancy & Marketplace Readiness

### Current State Assessment

**Location:** `prisma/schema.prisma`

**✅ What's Good:**
- Clerk auth integration (User model with `clerkId`)
- Basic Configuration model exists
- WebApp model for published sites
- OrderEvent for social proof

**❌ Critical Gaps:**

#### Gap 1.1: No Tenant Isolation in Configuration
**Severity:** 🔴 CRITICAL

**Current Problem:**
```prisma
model Configuration {
  id            String    @id @default(uuid())
  userId        String      // User can access ANY config with this userId
  // ❌ NO BUSINESS/WORKSPACE CONSTRAINT
  // ❌ User1 could query User2's configurations
}
```

**Impact:** **Multi-tenant data leak risk**. A restaurant owner can access another restaurant's config via API manipulation.

**Fix:**
```prisma
// ADDED: Explicit workspace/business association
model Configuration {
  id              String    @id @default(uuid())
  userId          String    // Primary owner
  
  // ✅ FIX: Add businessId for workspace isolation
  businessId      String?   // Owner's primary business
  business        Business? @relation(fields: [businessId], references: [id])
  
  // Ensures: userId + businessId = unique pair (one config per business)
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([userId, businessId])  // ✅ ADD THIS
  @@index([userId, businessId])   // ✅ ADD THIS
}
```

**Implementation Steps:**
1. Add `businessId` field to `Configuration`
2. Create migration: `pnpm prisma migrate dev --name add_business_isolation`
3. Update API query (see Section 2)
4. Add RLS policy (see Section 2)

---

#### Gap 1.2: Template Marketplace Not Linked to Configuration
**Severity:** 🟠 HIGH

**Current Problem:**
```prisma
model Template {
  id              String    @id  
  name            String
  // ❌ NO RELATION TO CONFIGURATION
  // ❌ Cannot track which templates are used
  // ❌ Cannot aggregate usage data for marketplace
}

model Configuration {
  template        String    @default("")  // Just a string!
  // ❌ Should be a foreign key to Template.id
}
```

**Impact:** Cannot build marketplace analytics. Cannot enforce premium templates.

**Fix:**
```prisma
model Template {
  id              String    @id
  name            String
  description     String    @db.Text
  category        String    // "cafe", "restaurant", "bar"
  isPremium       Boolean   @default(false)
  designTokens    Json
  layout          Json
  preview         Json
  
  creator         String    @default("maitr")
  downloads       Int       @default(0)
  avgRating       Float     @default(0)
  version         String    @default("1.0.0")
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  // ✅ ADD RELATIONS
  configurations  Configuration[]  // Configurations using this template
  ratings         TemplateRating[]  // User ratings
  
  @@index([isPremium])
  @@index([category])
  @@index([downloads])
}

model Configuration {
  // ... existing fields ...
  
  template        String    @default("")  // Keep for now (legacy)
  
  // ✅ ADD THIS: Explicit template relation
  selectedTemplate String?
  templateData    Template? @relation(fields: [selectedTemplate], references: [id])
  
  // ... rest of fields ...
}

// ✅ NEW: Track template usage & ratings
model TemplateRating {
  id              String    @id @default(uuid())
  templateId      String
  userId          String
  rating          Int       // 1-5 stars
  comment         String?
  
  template        Template  @relation(fields: [templateId], references: [id], onDelete: Cascade)
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([templateId, userId])  // One rating per user per template
}
```

**Implementation:**
1. Add `selectedTemplate` to Configuration
2. Add `Template`, `TemplateRating` models
3. Seed 4 default templates into `Template` table
4. Create migration

---

#### Gap 1.3: n8n Scraper Results Not Properly Stored
**Severity:** 🟠 HIGH

**Current Problem:**
- No database table for scraper jobs
- Cannot track job status
- Cannot link scraped data to configuration

**Fix:**
```prisma
// ✅ NEW: n8n Scraper Pipeline
model ScraperJob {
  id              String    @id @default(uuid())
  
  // Input
  businessName    String
  businessType    String
  websiteUrl      String    @unique
  
  // Execution
  n8nExecutionId  String?   // Link to n8n execution
  status          String    @default("pending")  // pending, processing, completed, failed
  
  // Results (raw from n8n)
  extractedData   Json?     // Raw HTML/text from scraping
  suggestedConfig Json?     // Pre-populated Configuration (AI-extracted)
  
  // Linking to user
  userId          String?   // User who initiated scrape
  linkedConfigId  String?   // Configuration created from this scrape
  
  // Timestamps
  createdAt       DateTime  @default(now())
  startedAt       DateTime?
  completedAt     DateTime?
  failureReason   String?
  
  user            User?     @relation(fields: [userId], references: [id], onDelete: SetNull)
  linkedConfig    Configuration? @relation(fields: [linkedConfigId], references: [id], onDelete: SetNull)
  
  @@index([status])
  @@index([userId])
  @@index([createdAt])
}
```

---

#### Gap 1.4: Payment/Subscription Status Missing
**Severity:** 🟠 HIGH

**Current Problem:**
- No way to track Stripe subscription status
- Cannot enforce premium features
- No audit trail for billing events

**Fix:**
```prisma
// ✅ NEW: Subscription Management
model Subscription {
  id              String    @id @default(uuid())
  userId          String    @unique
  
  // Stripe references
  stripeCustomerId String? @unique
  stripeSubscriptionId String? @unique
  
  // Plan info
  plan            String    @default("free")  // "free", "basic", "pro", "enterprise"
  status          String    @default("active")  // "active", "paused", "canceled", "past_due"
  
  // Features
  maxSites        Int       @default(1)        // Number of published websites allowed
  maxUsers        Int       @default(1)        // Team members allowed
  
  // Billing
  currentPeriodStart DateTime?
  currentPeriodEnd DateTime?
  canceledAt      DateTime?
  
  // Metadata
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([status])
  @@index([stripeCustomerId])
}

// ✅ NEW: Audit log for compliance
model BillingEvent {
  id              String    @id @default(uuid())
  userId          String
  subscriptionId  String?
  
  eventType       String    // "subscription_created", "payment_succeeded", "refund_issued"
  amount          Int?      // Cents
  currency        String    @default("EUR")
  
  stripeEventId   String?   @unique
  metadata        Json?
  
  createdAt       DateTime  @default(now())
  
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId, createdAt])
}
```

---

### Summary: NeonDB Schema Fixes

**Required Migrations (in order):**
```bash
# 1. Add business isolation
pnpm prisma migrate dev --name add_business_isolation_to_configuration

# 2. Add template marketplace
pnpm prisma migrate dev --name add_template_marketplace

# 3. Add scraper pipeline
pnpm prisma migrate dev --name add_scraper_jobs

# 4. Add subscription management
pnpm prisma migrate dev --name add_subscription_billing

# 5. Run all at once
pnpm prisma migrate deploy
```

**Data Seeding (after migrations):**
```typescript
// Create file: prisma/seed-templates.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TEMPLATES = [
  { id: "minimalist", name: "Minimalist", ... },
  { id: "modern", name: "Modern", ... },
  // ... 4 total
];

async function main() {
  for (const template of TEMPLATES) {
    await prisma.template.upsert({
      where: { id: template.id },
      update: {},
      create: template,
    });
  }
}

main().catch(console.error);
```

**Timeline:** ⏱️ 4 hours (schema + migrations + seeding)

---

## 2️⃣ CLERK AUTH: Row-Level Security (RLS)

### Current State Assessment

**Locations:** 
- `server/middleware/auth.ts` (token verification)
- `server/utils/clerk.ts` (user sync)

**✅ What's Good:**
- Clerk token verification working
- Lazy sync creating users in Prisma
- Basic requireAuth middleware

**❌ Critical Gaps:**

#### Gap 2.1: No Row-Level Security (RLS) on Configuration Access
**Severity:** 🔴 CRITICAL

**Current Problem:**
```typescript
// File: server/routes/configurations.ts (line 76+)
export async function saveConfiguration(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const userId = req.user.id;
  const configData = {
    ...req.body,
    userId,  // ✅ Good: userId is set from token
    updatedAt: new Date().toISOString(),
  };

  // ❌ PROBLEM: Only checks if req.user exists
  // ❌ NOTHING prevents req.body from setting businessId to another user's business
}
```

**Attack Scenario:**
```javascript
// Attacker:
POST /api/configurations
{
  "businessId": "attacker-friend-business-uuid",  // Different user's business
  "businessName": "Hacked Restaurant",
  "userId": "legitimate-user-id"  // Set from req.user.id correctly
}
// Result: Attacker creates config in their friend's business
```

**Fix:**

```typescript
// File: server/routes/configurations.ts

// ✅ NEW: RLS helper function
async function authorizeUserBusiness(
  userId: string,
  businessId: string | undefined
): Promise<boolean> {
  if (!businessId) {
    // User can create configs without explicit businessId
    return true;
  }

  // Check if user owns or is member of this business
  const membership = await prisma.businessMember.findFirst({
    where: {
      userId,
      businessId,
    },
  });

  return !!membership;
}

// ✅ UPDATED: saveConfiguration with RLS
export async function saveConfiguration(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const userId = req.user.id;
  const { businessId } = req.body;

  // ✅ FIX: Verify user owns/can access this businessId
  if (businessId) {
    const authorized = await authorizeUserBusiness(userId, businessId);
    if (!authorized) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You do not have access to this business",
      });
    }
  }

  // Safe to proceed
  const configData = {
    ...req.body,
    userId,
    businessId,
    updatedAt: new Date().toISOString(),
  };

  // ... save to database
}

// ✅ NEW: getConfiguration with RLS
export async function getConfiguration(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { id } = req.params;
  const userId = req.user.id;

  // ✅ FIX: Query with userId filter
  const config = await prisma.configuration.findFirst({
    where: {
      id,
      userId,  // ← User can only see their own configs
    },
  });

  if (!config) {
    return res.status(404).json({ error: "Not found" });
  }

  res.json({ data: config });
}

// ✅ NEW: listConfigurations with RLS
export async function getConfigurations(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const userId = req.user.id;

  // ✅ CRITICAL: Filter by userId
  const configs = await prisma.configuration.findMany({
    where: { userId },  // ← Only user's own configs
    orderBy: { updatedAt: "desc" },
  });

  res.json({ data: configs });
}

// ✅ NEW: deleteConfiguration with RLS
export async function deleteConfiguration(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { id } = req.params;
  const userId = req.user.id;

  // ✅ CRITICAL: Verify ownership before delete
  const existing = await prisma.configuration.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    return res.status(403).json({
      error: "Forbidden",
      message: "Configuration not found or not owned by user",
    });
  }

  await prisma.configuration.delete({ where: { id } });
  res.json({ success: true });
}
```

---

#### Gap 2.2: Team Members Cannot Access Shared Configurations
**Severity:** 🟡 MEDIUM

**Current Problem:**
- Only configuration owner can access
- Team members cannot view/edit shared configs
- No role-based permissions

**Fix:**
```typescript
// ✅ NEW: Helper for team access
async function getUserBusinessAccess(userId: string): Promise<string[]> {
  const memberships = await prisma.businessMember.findMany({
    where: { userId },
    select: { businessId: true },
  });
  return memberships.map(m => m.businessId);
}

// ✅ UPDATED: getConfigurations with team support
export async function getConfigurations(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const userId = req.user.id;
  
  // Get all businesses user has access to
  const businessIds = await getUserBusinessAccess(userId);

  // ✅ FIX: Include team members' configs
  const configs = await prisma.configuration.findMany({
    where: {
      OR: [
        { userId },  // User's own configs
        { businessId: { in: businessIds } },  // Team business configs
      ],
    },
    orderBy: { updatedAt: "desc" },
  });

  res.json({ data: configs });
}
```

---

#### Gap 2.3: No Audit Trail for Access
**Severity:** 🟡 MEDIUM

**Current Problem:**
- No logging of who accessed what
- Cannot detect unauthorized access attempts
- Cannot comply with GDPR audit requirements

**Fix:**
```prisma
// ✅ NEW: Audit log model
model AuditLog {
  id              String    @id @default(uuid())
  userId          String
  action          String    // "config_accessed", "config_modified", "config_deleted"
  resource        String    // "configuration"
  resourceId      String
  
  ipAddress       String?
  userAgent       String?
  
  success         Boolean   @default(true)
  errorMessage    String?
  
  createdAt       DateTime  @default(now())
  
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId, createdAt])
  @@index([action, createdAt])
}
```

```typescript
// ✅ NEW: Audit logging middleware
export function createAuditLogger(req: Request) {
  return async (
    action: string,
    resourceId: string,
    success: boolean = true,
    errorMessage?: string
  ) => {
    if (!req.user) return;

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action,
        resource: "configuration",
        resourceId,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
        success,
        errorMessage,
      },
    });
  };
}

// Usage in routes:
export async function getConfiguration(req: Request, res: Response) {
  const audit = createAuditLogger(req);
  
  try {
    // ... get config ...
    await audit("config_accessed", id, true);
    res.json({ data: config });
  } catch (e) {
    await audit("config_accessed", id, false, (e as Error).message);
    res.status(500).json({ error: "Server error" });
  }
}
```

---

### Summary: Clerk Auth Fixes

**Implementation Order:**
1. **Week 1, Day 1:** Add RLS checks to all configuration endpoints
2. **Week 1, Day 2:** Add team member access (businessId filtering)
3. **Week 1, Day 3:** Add audit logging

**Checklist:**
- [ ] Update `getConfigurations()` with userId filter
- [ ] Update `getConfiguration()` with RLS check
- [ ] Update `saveConfiguration()` with businessId authorization
- [ ] Update `deleteConfiguration()` with ownership check
- [ ] Add `getOrCreateBusiness()` helper
- [ ] Add `authorizeUserBusiness()` helper
- [ ] Add audit log model to Prisma schema
- [ ] Add audit middleware to all endpoints

**Timeline:** ⏱️ 6 hours

---

## 3️⃣ n8n PIPELINE: Data Flow Architecture

### Current State Assessment

**Location:** `server/webhooks/stripe.ts` (webhook pattern exists, but not for n8n)

**✅ What's Good:**
- Webhook infrastructure exists (Stripe handler shows pattern)
- Netlify Functions can handle POST requests

**❌ Critical Gaps:**

#### Gap 3.1: No n8n Integration Entry Points
**Severity:** 🔴 CRITICAL

**Current Problem:**
```
n8n workflow (Railway) ----? ---- Maitr Backend
                              (NO CONNECTION)
```

**Fix: Create n8n Webhook Receiver**

```typescript
// File: server/webhooks/n8n.ts (NEW)

import { Request, Response } from "express";
import prisma from "../db/prisma";
import { createAuditLogger } from "../middleware/audit";

interface N8nScraperPayload {
  jobId: string;
  businessName: string;
  businessType: string;
  websiteUrl: string;
  status: "completed" | "failed";
  error?: string;
  
  // Scraped data (if successful)
  extractedData?: {
    menuItems: Array<{ name: string; price?: number }>;
    galleryUrls: string[];
    hours: Record<string, { open: string; close: string }>;
    contact: { phone?: string; email?: string };
    social: Record<string, string>;
  };
}

export async function handleN8nWebhook(req: Request, res: Response) {
  const payload = req.body as N8nScraperPayload;
  const audit = createAuditLogger(req);

  console.log("[n8n] Received scraper webhook:", {
    jobId: payload.jobId,
    status: payload.status,
  });

  try {
    // Verify webhook signature (add n8n secret to env)
    const n8nSecret = process.env.N8N_WEBHOOK_SECRET;
    const signature = req.headers["x-n8n-signature"];
    if (n8nSecret && signature !== n8nSecret) {
      console.warn("[n8n] Invalid signature");
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Find the scraper job
    const scraperJob = await prisma.scraperJob.findUnique({
      where: { id: payload.jobId },
    });

    if (!scraperJob) {
      return res.status(404).json({ error: "Job not found" });
    }

    if (payload.status === "completed" && payload.extractedData) {
      // ✅ SUCCESS: Update job with extracted data
      const updated = await prisma.scraperJob.update({
        where: { id: payload.jobId },
        data: {
          status: "completed",
          completedAt: new Date(),
          extractedData: payload.extractedData,
          
          // Pre-populate configuration suggestion
          suggestedConfig: generateConfigFromExtract(
            scraperJob.businessName,
            scraperJob.businessType,
            payload.extractedData
          ),
        },
      });

      console.log("[n8n] Job completed successfully");
      await audit("scraper_job_completed", payload.jobId, true);

      return res.json({
        success: true,
        jobId: updated.id,
      });
    } else if (payload.status === "failed") {
      // ❌ FAILURE: Mark job as failed
      await prisma.scraperJob.update({
        where: { id: payload.jobId },
        data: {
          status: "failed",
          completedAt: new Date(),
          failureReason: payload.error || "Unknown error",
        },
      });

      await audit("scraper_job_failed", payload.jobId, false, payload.error);

      return res.json({
        success: false,
        error: payload.error,
      });
    }
  } catch (error) {
    console.error("[n8n] Webhook error:", error);
    await audit(
      "scraper_job_error",
      payload.jobId,
      false,
      error instanceof Error ? error.message : "Unknown"
    );

    return res.status(500).json({
      error: "Internal server error",
    });
  }
}

// ✅ Helper: Convert n8n extract to Configuration
function generateConfigFromExtract(
  businessName: string,
  businessType: string,
  extracted: N8nScraperPayload["extractedData"]
) {
  if (!extracted) return null;

  return {
    business: {
      name: businessName,
      type: businessType,
      location: extracted.contact?.email ? extracted.contact.email : undefined,
    },
    design: {
      template: "modern",  // Default template for auto-scraped
      primaryColor: "#4F46E5",
      secondaryColor: "#7C3AED",
      fontFamily: "sans-serif",
    },
    content: {
      menuItems: (extracted.menuItems || []).map((item, i) => ({
        id: `item-${i}`,
        name: item.name,
        price: item.price || 0,
      })),
      gallery: (extracted.galleryUrls || []).map((url, i) => ({
        id: `img-${i}`,
        url,
      })),
      openingHours: extracted.hours || {},
    },
    contact: {
      contactMethods: extracted.contact?.phone ? [extracted.contact.phone] : [],
      socialMedia: extracted.social || {},
      phone: extracted.contact?.phone,
      email: extracted.contact?.email,
    },
  };
}
```

**Register webhook in server:**
```typescript
// File: server/index.ts
import { handleN8nWebhook } from "./webhooks/n8n";

export function createServer() {
  // ... existing setup ...

  // Add n8n webhook BEFORE json middleware
  app.post(
    "/api/webhooks/n8n/scraper",
    express.raw({ type: "application/json" }),
    handleN8nWebhook
  );

  // ... rest of routes ...
}
```

---

#### Gap 3.2: No Scraper Job API Endpoints
**Severity:** 🔴 CRITICAL

**Current Problem:**
- Frontend cannot create scraper jobs
- Frontend cannot poll job status
- No way to accept scraped data

**Fix: Create Scraper Routes**

```typescript
// File: server/routes/scraper.ts (NEW)

import { Request, Response, Router } from "express";
import { requireAuth } from "../middleware/auth";
import prisma from "../db/prisma";

const router = Router();

// ✅ POST: Create scraper job
router.post("/jobs", requireAuth, async (req: Request, res: Response) => {
  const { businessName, businessType, websiteUrl } = req.body;
  const userId = req.user!.id;

  if (!websiteUrl) {
    return res.status(400).json({ error: "websiteUrl required" });
  }

  try {
    // Check if URL was already scraped recently
    const existing = await prisma.scraperJob.findUnique({
      where: { websiteUrl },
    });

    if (existing && existing.status !== "failed") {
      return res.status(400).json({
        error: "URL already being processed or completed",
        jobId: existing.id,
        status: existing.status,
      });
    }

    // Create new scraper job
    const job = await prisma.scraperJob.create({
      data: {
        businessName: businessName || "Unknown",
        businessType: businessType || "restaurant",
        websiteUrl,
        userId,
        status: "pending",
      },
    });

    // ✅ Trigger n8n workflow
    // Call n8n webhook to start scraping
    const n8nUrl = process.env.N8N_WEBHOOK_URL;
    if (n8nUrl) {
      fetch(n8nUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: job.id,
          websiteUrl,
          callbackUrl: `${process.env.API_URL}/api/webhooks/n8n/scraper`,
        }),
      }).catch(err => console.error("[n8n] Trigger failed:", err));
    }

    res.json({
      success: true,
      jobId: job.id,
      status: "pending",
    });
  } catch (error) {
    console.error("Error creating scraper job:", error);
    res.status(500).json({ error: "Failed to create job" });
  }
});

// ✅ GET: Poll job status
router.get("/jobs/:jobId", requireAuth, async (req: Request, res: Response) => {
  const { jobId } = req.params;
  const userId = req.user!.id;

  try {
    const job = await prisma.scraperJob.findUnique({
      where: { id: jobId },
    });

    if (!job || job.userId !== userId) {
      return res.status(404).json({ error: "Job not found" });
    }

    res.json({
      id: job.id,
      status: job.status,
      completedAt: job.completedAt,
      failureReason: job.failureReason,
      // Don't expose full extractedData here (too large)
      // Client polls and receives status, then fetches actual config
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to get job status" });
  }
});

// ✅ POST: Accept scraped data and create configuration
router.post(
  "/jobs/:jobId/accept",
  requireAuth,
  async (req: Request, res: Response) => {
    const { jobId } = req.params;
    const userId = req.user!.id;

    try {
      const job = await prisma.scraperJob.findUnique({
        where: { id: jobId },
      });

      if (!job || job.userId !== userId) {
        return res.status(404).json({ error: "Job not found" });
      }

      if (job.status !== "completed") {
        return res.status(400).json({
          error: "Job not completed",
          status: job.status,
        });
      }

      if (!job.suggestedConfig) {
        return res.status(400).json({
          error: "No configuration available",
        });
      }

      // Create configuration from suggested config
      const config = await prisma.configuration.create({
        data: {
          userId,
          ...job.suggestedConfig,
          status: "draft",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Link scraper job to configuration
      await prisma.scraperJob.update({
        where: { id: jobId },
        data: { linkedConfigId: config.id },
      });

      res.json({
        success: true,
        configId: config.id,
        message: "Configuration created from scraped data",
      });
    } catch (error) {
      console.error("Error accepting scraped data:", error);
      res.status(500).json({ error: "Failed to create configuration" });
    }
  }
);

export default router;
```

Register routes:
```typescript
// File: server/index.ts
import scraperRouter from "./routes/scraper";

app.use("/api/scraper", scraper Router);
```

---

#### Gap 3.3: Frontend Scraper UI Missing
**Severity:** 🟠 HIGH

**Current Problem:**
- No UI for users to input website URL
- No polling logic
- No feedback during scraping

**Fix: Create Frontend Component**

```typescript
// File: client/pages/ScrapeWizard.tsx (NEW)

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import { Loader, CheckCircle, AlertCircle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";

interface ScraperJob {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  completedAt: Date | null;
  failureReason: string | null;
}

export function ScrapeWizard() {
  const { getToken } = useAuth();
  const navigate = useNavigate();

  const [url, setUrl] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<ScraperJob | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Start scraping
  const handleStartScrape = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = await getToken();
      const res = await fetch("/api/scraper/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          websiteUrl: url,
          businessName: "",
          businessType: "restaurant",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to start scraping");
      }

      const data = await res.json();
      setJobId(data.jobId);
      setJob({ ...data, completedAt: null, failureReason: null });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error starting scrape");
    } finally {
      setLoading(false);
    }
  };

  // Poll job status
  useEffect(() => {
    if (!jobId) return;

    const interval = setInterval(async () => {
      try {
        const token = await getToken();
        const res = await fetch(`/api/scraper/jobs/${jobId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error("Failed to fetch status");

        const updated = await res.json();
        setJob(updated);

        // Stop polling when complete or failed
        if (updated.status === "completed" || updated.status === "failed") {
          clearInterval(interval);
        }
      } catch (e) {
        console.error("Polling error:", e);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [jobId, getToken]);

  // Accept scraped config
  const handleAccept = async () => {
    if (!jobId) return;

    try {
      const token = await getToken();
      const res = await fetch(`/api/scraper/jobs/${jobId}/accept`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to accept configuration");

      const data = await res.json();
      // Redirect to configurator with auto-loaded config
      navigate(`/configurator?configId=${data.configId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error accepting config");
    }
  };

  return (
    <div className="max-w-md mx-auto py-12 px-4">
      <h1 className="text-2xl font-bold mb-4">Scrape Your Restaurant</h1>

      {!jobId ? (
        // Input phase
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Website URL</label>
            <Input
              type="url"
              placeholder="https://your-restaurant.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={loading}
            />
          </div>
          {error && <div className="text-red-500 text-sm">{error}</div>}
          <Button
            onClick={handleStartScrape}
            disabled={!url || loading}
            className="w-full"
          >
            {loading ? "Starting..." : "🚀 Start Scraping"}
          </Button>
        </div>
      ) : (
        // Status phase
        <div className="space-y-4">
          {job?.status === "pending" && (
            <>
              <div className="flex items-center justify-center py-8">
                <Loader className="w-8 h-8 animate-spin text-blue-500" />
              </div>
              <p className="text-center text-sm text-gray-600">
                Scraping your website... This may take 1-3 minutes.
              </p>
            </>
          )}

          {job?.status === "completed" && (
            <>
              <div className="flex items-center justify-center py-8">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <p className="text-center text-sm font-medium">
                ✅ Scraping completed!
              </p>
              <p className="text-center text-xs text-gray-600 mb-4">
                We've extracted your menu, photos, and contact info.
              </p>
              <Button onClick={handleAccept} className="w-full">
                👉 Continue to Editor
              </Button>
            </>
          )}

          {job?.status === "failed" && (
            <>
              <div className="flex items-center justify-center py-8">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <p className="text-center text-sm text-red-600">
                Scraping failed: {job.failureReason}
              </p>
              <Button
                onClick={() => {
                  setJobId(null);
                  setUrl("");
                }}
                variant="outline"
                className="w-full"
              >
                Try Again
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
```

---

### Summary: n8n Pipeline Fixes

**Implementation Order:**
1. Add `ScraperJob` model to Prisma schema
2. Create n8n webhook receiver (`server/webhooks/n8n.ts`)
3. Create scraper routes (`server/routes/scraper.ts`)
4. Create frontend ScrapeWizard component
5. Setup n8n workflow on Railway

**Environment Variables Needed:**
```bash
N8N_WEBHOOK_SECRET=your-secret-key
N8N_WEBHOOK_URL=https://n8n.railway.app/webhook/scraper-trigger
API_URL=https://maitr-api.railway.app  # Backend URL for callbacks
```

**Timeline:** ⏱️ 8 hours

---

## 4️⃣ THEME STORE ARCHITECTURE: Remove Hardcoding

### Current State Assessment

**Location:** `client/components/template/TemplateRegistry.tsx` (lines 1-200)

**✅ What's Good:**
- Zod schemas for validation
- TypeScript interfaces

**❌ Critical Gap:**

#### Gap 4.1: Templates Are Hardcoded Frontend Arrays
**Severity:** 🔴 CRITICAL

**Current Problem:**
```typescript
// File: client/components/template/TemplateRegistry.tsx
export const defaultTemplates: Template[] = [
  {
    id: "minimalist",
    name: "Minimalist",
    description: "Narrative, minimal design...",
    // ... entire template definition
  },
  // ❌ HARDCODED: All 4 templates hardcoded
  // ❌ PROBLEM: Cannot add new templates without code change
  // ❌ PROBLEM: Cannot make templates paid/premium
  // ❌ PROBLEM: Cannot track usage metrics
];
```

**Impact:**
- Template Marketplace vision blocked
- Users cannot upload custom themes
- Cannot A/B test templates
- Cannot deprecate old templates

**Fix: Migrate to API-Driven Templates**

**Step 1: Seed Database**
```typescript
// File: prisma/seed-templates.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TEMPLATES = [
  {
    id: "minimalist",
    name: "Minimalist",
    description: "Narrative, minimal design guiding users through full-screen sections.",
    category: "restaurant",
    isPremium: false,
    creator: "maitr",
    version: "1.0.0",
    layout: {
      intent: "narrative",
      navigation: "overlay-hamburger",
      typography: "minimal-sans",
    },
    tokens: {
      colors: {
        primary: "#111827",
        secondary: "#F3F4F6",
        text: "#111827",
        background: "#FFFFFF",
      },
      typography: {
        fontFamily: "sans-serif",
        headingSize: "2.5rem",
        bodySize: "1rem",
      },
    },
    preview: {
      thumbnail: "/templates/minimalist-thumb.png",
      features: ["Ultra Clean", "Fast Loading", "Content Focus"],
    },
  },
  // ... add modern, stylish, cozy
];

async function main() {
  for (const template of TEMPLATES) {
    await prisma.template.upsert({
      where: { id: template.id },
      update: {},
      create: template,
    });
    console.log(`✅ Seeded template: ${template.id}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

**Step 2: Create Template API**
```typescript
// File: server/routes/templates.ts (NEW)

import { Request, Response, Router } from "express";
import { requireAuth } from "../middleware/auth";
import prisma from "../db/prisma";

const router = Router();

// ✅ GET: List templates (public)
router.get("/", async (req: Request, res: Response) => {
  const { category, isPremium } = req.query;

  try {
    const where: any = {};
    if (category) where.category = category;
    if (isPremium !== undefined) where.isPremium = isPremium === "true";

    const templates = await prisma.template.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        isPremium: true,
        preview: true,
        downloads: true,
        avgRating: true,
      },
      orderBy: { downloads: "desc" },
    });

    res.json({ data: templates });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch templates" });
  }
});

// ✅ GET: Get single template with full details (requireAuth for premium)
router.get("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const template = await prisma.template.findUnique({
      where: { id },
    });

    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }

    // Check if user has access to premium template
    if (template.isPremium && req.user) {
      const subscription = await prisma.subscription.findUnique({
        where: { userId: req.user.id },
      });

      if (!subscription || subscription.plan === "free") {
        return res.status(403).json({
          error: "Premium template",
          message: "Upgrade to access this template",
        });
      }
    }

    res.json({ data: template });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch template" });
  }
});

export default router;
```

Register template routes:
```typescript
// File: server/index.ts
import templatesRouter from "./routes/templates";

app.use("/api/templates", templatesRouter);
```

**Step 3: Update Frontend Template Loader**
```typescript
// File: client/components/template/TemplateLoader.tsx (NEW - replaces TemplateRegistry)

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader } from "lucide-react";

interface Template {
  id: string;
  name: string;
  description: string;
  preview: { thumbnail: string; features: string[] };
  isPremium: boolean;
  downloads: number;
}

interface TemplateLoaderProps {
  selectedTemplate: string | null;
  onSelectTemplate: (templateId: string) => void;
  category?: string;
}

export function TemplateLoader({
  selectedTemplate,
  onSelectTemplate,
  category = "restaurant",
}: TemplateLoaderProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ Fetch templates from API
  useEffect(() => {
    fetch(`/api/templates?category=${category}`)
      .then((res) => res.json())
      .then((data) => {
        setTemplates(data.data || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [category]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500">Error loading templates: {error}</div>;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {templates.map((template) => (
        <div
          key={template.id}
          className={`cursor-pointer transition-all rounded-lg border-2 p-4 ${
            selectedTemplate === template.id
              ? "border-teal-500 bg-teal-50"
              : "border-gray-200 hover:border-teal-300"
          }`}
          onClick={() => onSelectTemplate(template.id)}
        >
          {template.preview?.thumbnail && (
            <img
              src={template.preview.thumbnail}
              alt={template.name}
              className="w-full h-32 object-cover rounded mb-2"
            />
          )}
          <h3 className="font-bold text-sm">{template.name}</h3>
          <p className="text-xs text-gray-600 mt-1 line-clamp-2">
            {template.description}
          </p>
          {template.isPremium && (
            <div className="mt-2 text-xs font-semibold text-amber-600">
              👑 Premium
            </div>
          )}
          <div className="text-xs text-gray-500 mt-2">
            ⬇️ {template.downloads.toLocaleString()} downloads
          </div>
        </div>
      ))}
    </div>
  );
}
```

**Step 4: Update TemplateStep Component**
```typescript
// File: client/components/configurator/steps/TemplateStep.tsx

import { TemplateLoader } from "@/components/template/TemplateLoader";
import { useConfiguratorActions, useConfiguratorStore } from "@/store/configuratorStore";

export function TemplateStep({
  nextStep,
  prevStep,
}: {
  nextStep: () => void;
  prevStep: () => void;
}) {
  const actions = useConfiguratorActions();
  const selectedTemplate = useConfiguratorStore((s) => s.design.template);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Choose Your Template</h2>

      {/* ✅ Use API-driven loader instead of hardcoded */}
      <TemplateLoader
        selectedTemplate={selectedTemplate}
        onSelectTemplate={(templateId) => {
          actions.design.updateTemplate(templateId);
        }}
        category="restaurant"
      />

      <div className="flex gap-4 justify-between pt-6">
        <button onClick={prevStep}>← Back</button>
        <button onClick={nextStep}>Next →</button>
      </div>
    </div>
  );
}
```

---

### Summary: Theme Store Fixes

**Implementation:**
1. Add `Template` model to Prisma (already in Gap 1.2)
2. Seed 4 default templates to database
3. Create `/api/templates` endpoint
4. Create `TemplateLoader` component
5. Update `TemplateStep` to use loader
6. Delete hardcoded `defaultTemplates` from TemplateRegistry

**Timeline:** ⏱️ 4 hours

---

## 5️⃣ SEO STRATEGY: Dynamic Meta Tags in Vite

### Current State Assessment

**Location:** `client/pages/Site.tsx`, `client/components/seo/RestaurantJsonLd.tsx`

**✅ What's Good:**
- RestaurantJsonLd component exists (structured data)
- Site component has all data

**❌ Critical Gap:**

#### Gap 5.1: Meta Tags Not Injected into Head
**Severity:** 🔴 CRITICAL

**Current Problem:**
```html
<!-- What Google sees (SSR would provide this) -->
<html>
  <head>
    <title>Document</title>  <!-- ❌ Generic, not restaurant-specific -->
    <!-- ❌ No og:image, og:title, description -->
  </head>
  <body>
    <div id="root"></div>
    <!-- React renders here after bundle loads -->
  </body>
</html>

<!-- What user sees (after React hydration) -->
<title>JuJu Café - Coffee & Community</title>
<!-- But Google already indexed the blank page! -->
```

**Impact:**
- Google sees blank page
- Restaurants invisible in search
- No social media preview
- Score: 0 SEO

**Solution: Hybrid Approach (Pre-rendering + Meta Injection)**

**Step 1: Server-Side Pre-rendering at Publish Time**
```typescript
// File: server/services/PublishingService.ts (NEW)

import { renderToString } from "react-dom/server";
import { Site } from "../../client/pages/Site";
import type { Configuration } from "@prisma/client";

export async function prerenderSite(config: Configuration): Promise<string> {
  // ✅ Render React component to HTML string
  const content = renderToString(
    <Site config={config} />
  );

  // ✅ Inject critical CSS (Tailwind critical path)
  const criticalCSS = await extractCriticalCSS(content);

  // ✅ Build complete HTML
  const html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        
        <!-- ✅ Dynamic Meta Tags -->
        <title>${config.businessName} - ${config.businessType}</title>
        <meta name="description" content="${config.slogan || config.uniqueDescription}">
        <meta name="theme-color" content="${config.primaryColor}">
        
        <!-- ✅ Open Graph (Social Media) -->
        <meta property="og:type" content="business.business">
        <meta property="og:title" content="${config.businessName}">
        <meta property="og:description" content="${config.slogan}">
        <meta property="og:image" content="${config.gallery?.[0]?.url || '/og-default.png'}">
        <meta property="og:url" content="${config.publishedUrl}">
        
        <!-- ✅ Twitter Card -->
        <meta name="twitter:card" content="summary_large_image">
        <meta name="twitter:title" content="${config.businessName}">
        <meta name="twitter:description" content="${config.slogan}">
        <meta name="twitter:image" content="${config.gallery?.[0]?.url}">
        
        <!-- ✅ Structured Data (JSON-LD) -->
        ${generateJsonLd(config)}
        
        <!-- Critical CSS inline -->
        <style>${criticalCSS}</style>
        
        <!-- Preload fonts -->
        <link rel="preload" as="font" href="/fonts/inter.woff2" crossorigin>
      </head>
      <body>
        <div id="root">${content}</div>
        
        <!-- ✅ Pass config as initial state (no extra API call) -->
        <script>
          window.__INITIAL_CONFIG__ = ${JSON.stringify(config)};
        </script>
        
        <script src="/main.js"></script>
      </body>
    </html>
  `;

  return html;
}

function generateJsonLd(config: Configuration): string {
  const jsonLd = {
    "@context": "https://schema.org/",
    "@type": "Restaurant",
    "name": config.businessName,
    "description": config.uniqueDescription,
    "image": config.gallery?.[0]?.url || "/og-default.png",
    "telephone": config.contactMethods?.[0],
    "address": {
      "@type": "PostalAddress",
      "streetAddress": config.location,
    },
    "url": config.publishedUrl,
    "openingHoursSpecification": Object.entries(config.openingHours || {}).map(
      ([day, hours]: any) => ({
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": day,
        "opens": hours.open,
        "closes": hours.close,
      })
    ),
    "menu": `${config.publishedUrl}/menu`,
  };

  return `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`;
}

function extractCriticalCSS(html: string): Promise<string> {
  // Use critical-css library to extract above-the-fold CSS
  // For MVP: return empty string (React will load full CSS)
  return Promise.resolve("");
}
```

**Step 2: Deploy Pre-rendered HTML to Netlify**
```typescript
// File: server/routes/configurations.ts

import { prerenderSite } from "../services/PublishingService";
import { deployToNetlify } from "../services/NetlifyService";

export async function publishConfiguration(req: Request, res: Response) {
  const { id } = req.params;
  const userId = req.user!.id;

  try {
    // Get configuration
    const config = await prisma.configuration.findFirst({
      where: { id, userId },
    });

    if (!config) {
      return res.status(404).json({ error: "Configuration not found" });
    }

    // ✅ Pre-render to HTML
    const html = await prerenderSite(config);

    // ✅ Deploy to Netlify
    const deployResult = await deployToNetlify({
      subdomain: config.subdomain,
      files: {
        "index.html": html,
        "menu/index.html": prerenderMenu(config),
        "gallery/index.html": prerenderGallery(config),
      },
    });

    // Update configuration
    await prisma.configuration.update({
      where: { id },
      data: {
        status: "published",
        publishedUrl: deployResult.url,
        publishedAt: new Date(),
      },
    });

    res.json({
      success: true,
      publishedUrl: deployResult.url,
      message: "Website published and indexed by Google",
    });
  } catch (error) {
    console.error("Publish error:", error);
    res.status(500).json({ error: "Failed to publish" });
  }
}
```

**Step 3: Netlify Service for Deployment**
```typescript
// File: server/services/NetlifyService.ts (NEW)

interface DeployOptions {
  subdomain: string;
  files: Record<string, string>;
}

export async function deployToNetlify(options: DeployOptions): Promise<{
  url: string;
  deployId: string;
}> {
  const netlifyToken = process.env.NETLIFY_AUTH_TOKEN;
  const siteId = process.env.NETLIFY_SITE_ID;

  if (!netlifyToken || !siteId) {
    throw new Error("Netlify credentials not configured");
  }

  // Upload files to Netlify
  const form = new FormData();
  for (const [path, content] of Object.entries(options.files)) {
    form.append("files", new Blob([content]), path);
  }

  const response = await fetch(
    `https://api.netlify.com/api/v1/sites/${siteId}/deploys`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${netlifyToken}`,
      },
      body: form,
    }
  );

  if (!response.ok) {
    throw new Error("Netlify deploy failed");
  }

  const deploy = await response.json() as any;

  return {
    url: deploy.deploy_url || deploy.subdomain,
    deployId: deploy.id,
  };
}
```

---

### Summary: SEO Fixes

**Implementation:**
1. Create `PublishingService.ts` with pre-rendering
2. Create `NetlifyService.ts` for deployment
3. Update publish endpoint to use pre-rendering
4. Update Site.tsx to use `window.__INITIAL_CONFIG__` if available
5. Setup Google Search Console verification

**Environment Variables:**
```bash
NETLIFY_AUTH_TOKEN=your-token
NETLIFY_SITE_ID=your-site-id
```

**Timeline:** ⏱️ 6 hours

---

## 6️⃣ ZUSTAND STATE LOGIC: Persistence & Auto-Save

### Current State Assessment

**Location:** `client/store/configuratorStore.ts`

**✅ What's Good:**
- Domain-driven state structure
- Persistence middleware to localStorage
- Throttle guard prevents infinite loops

**❌ Critical Gaps:**

#### Gap 6.1: No Auto-Sync to Backend
**Severity:** 🔴 CRITICAL

**Current Problem:**
```typescript
// File: client/store/configuratorStore.ts (current)

export const useConfiguratorStore = create<ConfiguratorState>()(
  persist(
    (set, get) => ({
      // ... all actions ...
      updateBusinessName: (name) => {
        set((state) => ({
          business: { ...state.business, name },
        }));
        // ❌ PROBLEM: Updates localStorage only
        // ❌ NO automatic backend sync
        // ❌ If user closes tab, other devices get stale data
      },
    }),
    {
      name: "configurator-store",
      storage: createJSONStorage(() => sessionStorage),
      // ❌ MISSING: Backend persistence middleware
    }
  ),
);
```

**Impact:**
- User makes changes on device A
- Switches to device B
- Sees old data
- Data loss if cache is cleared

**Fix: Add Backend Sync Middleware**

```typescript
// File: client/store/configuratorStore.ts

// ✅ NEW: Backend sync middleware
interface BackendSyncOptions {
  debounceMs?: number;
  onError?: (error: Error) => void;
}

function createBackendSyncMiddleware(options: BackendSyncOptions = {}) {
  const { debounceMs = 2000, onError } = options;
  let syncTimeout: NodeJS.Timeout | null = null;
  let lastSyncedState: string | null = null;

  return (
    config: StateCreator<ConfiguratorState>,
  ) => {
    return (set: any, get: any, api: any) => {
      const originalSet = set;

      // Intercept all state updates
      return config(
        (update: any) => {
          originalSet(update);

          // Debounced backend sync
          if (syncTimeout) clearTimeout(syncTimeout);

          syncTimeout = setTimeout(async () => {
            try {
              const state = get() as ConfiguratorState;
              const config = state.getFullConfiguration();
              const configString = JSON.stringify(config);

              // Only sync if state actually changed
              if (configString === lastSyncedState) {
                console.log("[Sync] No changes, skipping backend sync");
                return;
              }

              lastSyncedState = configString;

              // ✅ Send to backend
              const response = await fetch("/api/configurations", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${await getClerkToken()}`,
                },
                body: JSON.stringify(config),
              });

              if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Sync failed");
              }

              const saved = await response.json();
              console.log("[Sync] Configuration synced", saved.data?.id);

              // Update local configId if this is first save
              if (!state.publishing.publishedUrl && saved.data?.id) {
                originalSet((s: any) => ({
                  publishing: {
                    ...s.publishing,
                    publishedUrl: `draft-${saved.data.id}`,
                  },
                }));
              }
            } catch (error) {
              console.error("[Sync] Error syncing configuration", error);
              if (onError && error instanceof Error) {
                onError(error);
              }
            }
          }, debounceMs);
        },
        get,
        api,
      );
    };
  };
}

// ✅ UPDATED: Apply middleware to store
export const useConfiguratorStore = create<ConfiguratorState>()(
  createBackendSyncMiddleware({
    debounceMs: 3000,
    onError: (error) => {
      console.error("Failed to save configuration:", error);
      // Show toast notification to user
    },
  })(
    persist(
      (set, get) => ({
        // ... all existing actions ...
      }),
      {
        name: "configurator-store",
        storage: createJSONStorage(() => sessionStorage),
        // ✅ ADD THIS: Hydrate from API on mount
        onRehydrateStorage: () => async (state) => {
          if (state) {
            // Optional: Load latest config from API on page load
            try {
              // Commented out for now, can enable for multi-device sync
              // const config = await loadLatestConfiguration();
              // if (config) state.loadConfiguration(config);
            } catch (error) {
              console.error("Failed to hydrate from API:", error);
            }
          }
        },
      },
    ),
  ),
);
```

**Helper Function:**
```typescript
// File: client/lib/api.ts

async function getClerkToken(): Promise<string> {
  const { getToken } = useAuth();
  return (await getToken()) || "";
}
```

---

#### Gap 6.2: No Conflict Resolution for Multi-Device Edits
**Severity:** 🟡 MEDIUM

**Current Problem:**
- User edits on device A (adds menu item)
- User edits on device B (adds different menu item)
- Last update wins, first update lost

**Fix: Last-Write-Wins with Timestamps**

```typescript
// File: client/store/configuratorStore.ts

interface ConfiguratorState {
  // ... existing fields ...
  
  // ✅ NEW: Track last modification time
  _syncMetadata: {
    lastModified: number;  // timestamp
    syncedAt: number;      // when last synced
    isDirty: boolean;      // has unsaved changes
  };
}

// ✅ NEW: Conflict detection
async function checkForConflicts(
  localVersion: ConfiguratorState,
  remoteVersion: ConfiguratorState,
): Promise<"local" | "remote" | "merge"> {
  const timeDiff = Math.abs(
    localVersion._syncMetadata.lastModified - remoteVersion._syncMetadata.lastModified
  );

  // If modified within 5 seconds, likely a conflict
  if (timeDiff < 5000) {
    // Ask user which version to keep
    return "merge";  // or implement 3-way merge
  }

  // Otherwise, last-write-wins
  return localVersion._syncMetadata.lastModified > remoteVersion._syncMetadata.lastModified
    ? "local"
    : "remote";
}
```

---

#### Gap 6.3: Validation Not Enforced on State Changes
**Severity:** 🟡 MEDIUM

**Current Problem:**
```typescript
// User can set invalid data
store.updatePrimaryColor("not-a-hex-color");  // ❌ No validation
store.setBusinessType("restaurant123");       // ❌ Should be enum
```

**Fix: Add Zod Validation**

```typescript
// File: client/store/configuratorStore.ts (update each action)

const updateBusinessName = (name: string) => {
  // ✅ Validate before setting
  try {
    const validated = BusinessInfoSchema.pick({ name: true }).parse({ name });
    checkThrottleGuard("updateBusinessName");
    set((state) => ({
      business: { ...state.business, ...validated },
    }));
  } catch (error) {
    console.error("Validation error:", error);
    throw new Error("Invalid business name");
  }
};

const updatePrimaryColor = (color: string) => {
  // ✅ Validate hex color
  if (!/^#[0-9A-F]{6}$/i.test(color)) {
    throw new Error("Invalid color format. Use hex: #RRGGBB");
  }
  
  checkThrottleGuard("updatePrimaryColor");
  set((state) => ({
    design: { ...state.design, primaryColor: color },
  }));
};
```

---

### Summary: Zustand Fixes

**Implementation:**
1. Add backend sync middleware
2. Add conflict detection logic
3. Add Zod validation to all actions
4. Add dirty state tracking
5. Add save status UI feedback

**Checklist:**
- [ ] Implement `createBackendSyncMiddleware`
- [ ] Update all actions with Zod validation
- [ ] Add `_syncMetadata` to state
- [ ] Update UI to show sync status (Save Progress indicator)
- [ ] Test multi-device conflict scenarios

**Timeline:** ⏱️ 4 hours

---

## 7️⃣ STRIPE INTEGRATION: Payment Status Hooks

### Current State Assessment

**Location:** `server/webhooks/stripe.ts`, `server/routes/orders.ts`

**✅ What's Good:**
- Webhook handler exists
- OrderEvent tracking for social proof
- Stripe signature verification

**❌ Critical Gaps:**

#### Gap 7.1: No Subscription Lifecycle Handling
**Severity:** 🔴 CRITICAL

**Current Problem:**
```typescript
// File: server/webhooks/stripe.ts (current)

export async function handleStripeWebhook(req: Request, res: Response) {
  // ❌ Only tracks payment_intent.succeeded
  // ❌ NO subscription_created handling
  // ❌ NO subscription_deleted handling
  // ❌ NO invoice.payment_failed handling
  // Result: Cannot track plan changes or failed payments
}
```

**Impact:**
- User upgrades to Pro but system doesn't know
- User's subscription cancels but still has access
- No failed payment handling

**Fix: Complete Stripe Webhook Handling**

```typescript
// File: server/webhooks/stripe.ts (UPDATED)

import Stripe from "stripe";
import prisma from "../db/prisma";
import { createAuditLogger } from "../middleware/audit";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

const PLAN_MAP: Record<string, { name: string; maxSites: number; maxUsers: number }> = {
  "price_free": { name: "free", maxSites: 1, maxUsers: 1 },
  "price_basic": { name: "basic", maxSites: 3, maxUsers: 2 },
  "price_pro": { name: "pro", maxSites: 10, maxUsers: 5 },
  "price_enterprise": { name: "enterprise", maxSites: -1, maxUsers: -1 },
};

export async function handleStripeWebhook(req: Request, res: Response) {
  const sig = req.headers["stripe-signature"];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !secret) {
    return res.status(400).json({ error: "Missing signature" });
  }

  let event: Stripe.Event;

  try {
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (error) {
    console.error("[Stripe] Webhook signature verification failed");
    return res.status(400).json({ error: "Invalid signature" });
  }

  try {
    switch (event.type) {
      // ✅ Handle: Customer created a subscription
      case "customer.subscription.created": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCreated(subscription);
        break;
      }

      // ✅ Handle: Subscription updated (plan change, quantity change)
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      // ✅ Handle: Subscription deleted (cancellation)
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      // ✅ Handle: Payment intent succeeded
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentSucceeded(paymentIntent);
        break;
      }

      // ✅ Handle: Payment failed (invoice payment failed)
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }

      // ✅ Handle: Invoice paid (recurring payment)
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(invoice);
        break;
      }

      default:
        console.log(`[Stripe] Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error("[Stripe] Webhook processing error:", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
}

// ✅ NEW: Handle subscription creation
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const customer = await stripe.customers.retrieve(customerId);
  const userId = (customer.metadata?.userId) as string;

  if (!userId) {
    console.error("[Stripe] No userId in customer metadata");
    return;
  }

  const planId = (subscription.items.data[0]?.price.id) as string;
  const plan = PLAN_MAP[planId] || PLAN_MAP["price_free"];

  // Create subscription record
  await prisma.subscription.upsert({
    where: { userId },
    update: {
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      plan: plan.name,
      status: "active",
      maxSites: plan.maxSites,
      maxUsers: plan.maxUsers,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    },
    create: {
      userId,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      plan: plan.name,
      status: "active",
      maxSites: plan.maxSites,
      maxUsers: plan.maxUsers,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    },
  });

  // Log billing event
  await prisma.billingEvent.create({
    data: {
      userId,
      eventType: "subscription_created",
      stripeEventId: subscription.id,
      metadata: { plan: plan.name },
    },
  });

  console.log("[Stripe] Subscription created:", { userId, plan: plan.name });
}

// ✅ NEW: Handle subscription update
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const customer = await stripe.customers.retrieve(customerId);
  const userId = (customer.metadata?.userId) as string;

  if (!userId) return;

  const planId = (subscription.items.data[0]?.price.id) as string;
  const plan = PLAN_MAP[planId] || PLAN_MAP["price_free"];

  await prisma.subscription.update({
    where: { userId },
    data: {
      plan: plan.name,
      maxSites: plan.maxSites,
      maxUsers: plan.maxUsers,
    },
  });

  console.log("[Stripe] Subscription updated:", { userId, plan: plan.name });
}

// ✅ NEW: Handle subscription deletion
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const customer = await stripe.customers.retrieve(customerId);
  const userId = (customer.metadata?.userId) as string;

  if (!userId) return;

  await prisma.subscription.update({
    where: { userId },
    data: {
      status: "canceled",
      plan: "free",
      maxSites: 1,
      maxUsers: 1,
      canceledAt: new Date(),
    },
  });

  console.log("[Stripe] Subscription canceled:", { userId });
}

// ✅ NEW: Handle payment succeeded
async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const customerId = paymentIntent.customer as string;
  if (!customerId) return;

  const customer = await stripe.customers.retrieve(customerId);
  const userId = (customer.metadata?.userId) as string;

  if (!userId) return;

  await prisma.billingEvent.create({
    data: {
      userId,
      eventType: "payment_succeeded",
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      stripeEventId: paymentIntent.id,
    },
  });
}

// ✅ NEW: Handle payment failed
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  if (!customerId) return;

  const customer = await stripe.customers.retrieve(customerId);
  const userId = (customer.metadata?.userId) as string;

  if (!userId) return;

  // Mark subscription as past due
  await prisma.subscription.update({
    where: { userId },
    data: { status: "past_due" },
  });

  await prisma.billingEvent.create({
    data: {
      userId,
      eventType: "payment_failed",
      amount: invoice.amount_due,
      stripeEventId: invoice.id,
    },
  });

  // ✅ Send email to user
  // await sendPaymentFailureEmail(user.email, invoice.amount_due);
  console.log("[Stripe] Payment failed for user:", userId);
}

// ✅ NEW: Handle invoice paid (recurring)
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  if (!customerId) return;

  const customer = await stripe.customers.retrieve(customerId);
  const userId = (customer.metadata?.userId) as string;

  if (!userId) return;

  // Mark subscription as active (in case was past_due)
  await prisma.subscription.update({
    where: { userId },
    data: { status: "active" },
  });

  await prisma.billingEvent.create({
    data: {
      userId,
      eventType: "invoice_paid",
      amount: invoice.amount_paid,
      stripeEventId: invoice.id,
    },
  });

  console.log("[Stripe] Invoice paid for user:", userId);
}
```

---

#### Gap 7.2: No Feature Gating Based on Subscription
**Severity:** 🟠 HIGH

**Current Problem:**
- No check if user can create > 1 site (free plan limit)
- No check if user can add team members (plan limit)
- No enforcement of premium templates

**Fix: Add Subscription Middleware**

```typescript
// File: server/middleware/subscription.ts (NEW)

import { Request, Response, NextFunction } from "express";
import prisma from "../db/prisma";

export async function requireSubscriptionTier(tier: "free" | "basic" | "pro") {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    const userTier = subscription?.plan || "free";
    const tierRanking = { free: 0, basic: 1, pro: 2, enterprise: 3 };

    if (tierRanking[userTier as keyof typeof tierRanking] <
        tierRanking[tier]) {
      return res.status(403).json({
        error: "Upgrade required",
        requiredPlan: tier,
        currentPlan: userTier,
      });
    }

    return next();
  };
}

// ✅ Usage: Protect premium features
router.post(
  "/configurations",
  requireAuth,
  requireSubscriptionTier("basic"),  // Only basic+ can create sites
  saveConfiguration,
);
```

---

#### Gap 7.3: No Payment Portal Link
**Severity:** 🟡 MEDIUM

**Current Problem:**
- User cannot manage subscription
- User cannot update payment method
- User cannot download invoices

**Fix: Add Billing Portal Endpoint**

```typescript
// File: server/routes/billing.ts (NEW)

import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth";
import Stripe from "stripe";
import prisma from "../db/prisma";

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

// ✅ GET: Create billing portal session
router.post("/portal", requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.id;

  try {
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription?.stripeCustomerId) {
      return res.status(400).json({
        error: "No subscription found",
      });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${process.env.APP_URL}/dashboard/billing`,
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error("Billing portal error:", error);
    res.status(500).json({ error: "Failed to create portal session" });
  }
});

export default router;
```

---

### Summary: Stripe Fixes

**Implementation:**
1. Expand `handleStripeWebhook` with all event types
2. Create `Subscription` and `BillingEvent` models
3. Add subscription middleware for feature gating
4. Add billing portal endpoint
5. Update frontend to link to billing portal

**Stripe Configuration (Dashboard):**
- [ ] Set webhook endpoint: `https://api.railway.app/api/webhooks/stripe`
- [ ] Enable events: `customer.subscription.*`, `payment_intent.succeeded`, `invoice.*`
- [ ] Copy webhook secret to env: `STRIPE_WEBHOOK_SECRET`

**Timeline:** ⏱️ 5 hours

---

## 8️⃣ PLUGIN/ADD-ON SLOTS: Site.tsx Anchors

### Current State Assessment

**Location:** `client/pages/Site.tsx` (monolithic, ~700 lines)

**✅ What's Good:**
- Renders all sections (home, menu, gallery, etc.)

**❌ Critical Gaps:**

#### Gap 8.1: No Plugin Slot Anchors in Site Renderer
**Severity:** 🔴 CRITICAL

**Current Problem:**
```typescript
// File: client/pages/Site.tsx (current)
export default function SiteRenderer({ config }) {
  // ... 700 lines of hardcoded sections ...
  
  return (
    <div>
      <header>...</header>
      <HomeSection />
      <MenuSection />
      <GallerySection />
      <ContactSection />
      {/* ❌ NO HOOKS FOR PLUGINS */}
    </div>
  );
}
```

**Impact:**
- Cannot add Calendly button
- Cannot add POS embed
- Cannot add chat widget
- Plugin system blocked

**Fix: Add Plugin Slot Architecture**

```typescript
// File: client/components/PluginSlot.tsx (NEW)

import { useEffect, useState } from "react";

interface PluginSlotProps {
  slot: string;  // e.g., "header-nav-after", "footer-before"
  config: any;   // Configuration for the slot
}

export function PluginSlot({ slot, config }: PluginSlotProps) {
  const [plugins, setPlugins] = useState<any[]>([]);

  useEffect(() => {
    // Fetch plugins registered for this slot
    fetch(`/api/plugins?slot=${slot}`)
      .then(r => r.json())
      .then(data => setPlugins(data.plugins || []))
      .catch(err => console.error(`Error loading plugins for slot ${slot}:`, err));
  }, [slot]);

  return (
    <>
      {plugins.map(plugin => (
        <LazyPlugin
          key={plugin.id}
          plugin={plugin}
          config={config}
        />
      ))}
    </>
  );
}

// ✅ Dynamic plugin loader
function LazyPlugin({ plugin, config }: any) {
  const [Component, setComponent] = useState<React.ComponentType<any> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load plugin from CDN or local registry
    import(`/plugins/${plugin.id}/index.js`)
      .then(module => setComponent(() => module.default))
      .catch(err => {
        console.error(`Failed to load plugin ${plugin.id}:`, err);
        setError(err.message);
      });
  }, [plugin.id]);

  if (error) {
    console.warn(`Plugin ${plugin.id} failed to load:`, error);
    return null;  // Fail gracefully
  }

  if (!Component) {
    return null;  // Still loading
  }

  return <Component config={config} />;
}
```

**Updated Site.tsx with Slots:**

```typescript
// File: client/pages/Site.tsx (REFACTORED)

import { PluginSlot } from "@/components/PluginSlot";

function SiteRenderer({ config }) {
  return (
    <div style={{ background: styles.userBackground }}>
      {/* Header */}
      <header>
        <Logo />
        {/* ✅ SLOT: Add nav items from plugins (e.g., Calendly button) */}
        <PluginSlot slot="header-nav-after" config={config} />
      </header>

      {/* Main content */}
      <main className="pb-20">
        {renderPageContent()}
      </main>

      {/* Footer */}
      <footer>
        <ContactInfo />
        {/* ✅ SLOT: Add footer items from plugins (e.g., chat widget) */}
        <PluginSlot slot="footer-before" config={config} />
      </footer>

      {/* ✅ SLOT: Modal overlays from plugins (e.g., email capture) */}
      <PluginSlot slot="modal-root" config={config} />
    </div>
  );
}
```

---

#### Gap 8.2: No Plugin Registry Endpoint
**Severity:** 🟠 HIGH

**Current Problem:**
- Frontend cannot discover plugins
- No way to list plugins by slot

**Fix: Create Plugin Registry API**

```typescript
// File: server/routes/plugins.ts (NEW)

import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth";
import prisma from "../db/prisma";

const router = Router();

// ✅ GET: List plugins by slot
router.get("/", async (req: Request, res: Response) => {
  const { slot, configId } = req.query;

  try {
    // If configId provided, get installed plugins for that config
    if (configId) {
      const addOns = await prisma.addOnInstance.findMany({
        where: { configId: configId as string },
        include: {
          // Assuming AddOnInstance has a relation to AddOnRegistry
          // addOn: true,
        },
      });

      return res.json({ plugins: addOns });
    }

    // Otherwise, list all available plugins for a slot
    if (slot) {
      const plugins = await prisma.addOnRegistry.findMany({
        where: {
          isPublished: true,
          // Filter by slot (assuming manifest contains slot info)
        },
      });

      return res.json({ plugins });
    }

    res.status(400).json({ error: "Provide slot or configId" });
  } catch (error) {
    console.error("Error fetching plugins:", error);
    res.status(500).json({ error: "Failed to fetch plugins" });
  }
});

// ✅ POST: Install plugin for a configuration
router.post(
  "/:pluginId/install",
  requireAuth,
  async (req: Request, res: Response) => {
    const { pluginId } = req.params;
    const { configId } = req.body;
    const userId = req.user!.id;

    try {
      // Verify user owns config
      const config = await prisma.configuration.findFirst({
        where: { id: configId, userId },
      });

      if (!config) {
        return res.status(404).json({
          error: "Configuration not found",
        });
      }

      // Get plugin details
      const plugin = await prisma.addOnRegistry.findUnique({
        where: { id: pluginId },
      });

      if (!plugin || !plugin.isPublished) {
        return res.status(404).json({
          error: "Plugin not found",
        });
      }

      // Create plugin instance
      const instance = await prisma.addOnInstance.create({
        data: {
          configId,
          addOnId: pluginId,
          config: {},
          status: "active",
        },
      });

      res.json({
        success: true,
        instanceId: instance.id,
      });
    } catch (error) {
      console.error("Error installing plugin:", error);
      res.status(500).json({ error: "Failed to install plugin" });
    }
  }
);

export default router;
```

---

### Summary: Plugin Slots Fixes

**Implementation:**
1. Create `PluginSlot` component
2. Add slots to `Site.tsx` at key locations
3. Create `/api/plugins` endpoint
4. Define plugin manifest format

**Key Slots:**
```
header-nav-after      // Add nav items
footer-before         // Before footer
modal-root           // Full-page overlays
hero-overlay         // Hero section overlays
menu-after-items     // Below menu section
```

**Timeline:** ⏱️ 4 hours

---

## 9️⃣ DASHBOARD & TRACKING: Data Aggregation

### Current State Assessment

**Location:** No dashboard yet

**❌ Critical Gap:**

#### Gap 9.1: No User Dashboard to View Site Stats
**Severity:** 🔴 CRITICAL

**Current Problem:**
- User publishes site, has no visibility into performance
- No visitor stats
- No popular menu items
- No conversion tracking

**Fix: Create Dashboard with Analytics**

```typescript
// File: server/routes/analytics.ts (NEW)

import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth";
import prisma from "../db/prisma";

const router = Router();

// ✅ GET: Site statistics
router.get("/sites/:configId", requireAuth, async (req: Request, res: Response) => {
  const { configId } = req.params;
  const userId = req.user!.id;

  try {
    // Verify user owns site
    const config = await prisma.configuration.findFirst({
      where: { id: configId, userId },
    });

    if (!config) {
      return res.status(404).json({ error: "Site not found" });
    }

    // Get site metrics
    const webApp = await prisma.webApp.findUnique({
      where: { configId },
      include: {
        orders: {
          orderBy: { orderedAt: "desc" },
          take: 100,
        },
      },
    });

    // Aggregate menu item stats
    const menuStats = aggregateMenuStats(webApp?.orders || []);

    res.json({
      site: {
        id: config.id,
        name: config.businessName,
        status: config.status,
        publishedUrl: config.publishedUrl,
      },
      stats: {
        totalOrders: webApp?.orders.length || 0,
        lastOrder: webApp?.orders[0]?.orderedAt,
        topItems: menuStats.topItems,
        orderTrend: calculateTrend(webApp?.orders || []),
      },
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

// ✅ Helper: Aggregate menu item popularity
function aggregateMenuStats(orders: any[]) {
  const itemCounts = new Map<string, number>();

  orders.forEach(order => {
    const current = itemCounts.get(order.menuItemName) || 0;
    itemCounts.set(order.menuItemName, current + 1);
  });

  const topItems = Array.from(itemCounts.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  return { topItems };
}

// ✅ Helper: Calculate order trend (last 7 days)
function calculateTrend(orders: any[]) {
  const days = 7;
  const trend = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    const count = orders.filter(o => {
      const orderDate = new Date(o.orderedAt);
      return orderDate.toDateString() === date.toDateString();
    }).length;

    trend.push({
      date: date.toISOString().split("T")[0],
      orders: count,
    });
  }

  return trend;
}

export default router;
```

**Register analytics routes:**
```typescript
// File: server/index.ts
import analyticsRouter from "./routes/analytics";

app.use("/api/analytics", analyticsRouter);
```

---

#### Gap 9.2: No Frontend Dashboard Component
**Severity:** 🔴 CRITICAL

**Fix: Create Dashboard Page**

```typescript
// File: client/pages/Dashboard.tsx

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import { Bar, Line, LineChart, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function Dashboard() {
  const { getToken } = useAuth();
  const [sites, setSites] = useState<any[]>([]);
  const [selectedSite, setSelectedSite] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user's sites
  useEffect(() => {
    async function fetchSites() {
      const token = await getToken();
      const res = await fetch("/api/configurations", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setSites(data.data || []);
      if (data.data?.length > 0) {
        setSelectedSite(data.data[0].id);
      }
      setLoading(false);
    }

    fetchSites();
  }, [getToken]);

  // Fetch stats for selected site
  useEffect(() => {
    if (!selectedSite) return;

    async function fetchStats() {
      const token = await getToken();
      const res = await fetch(`/api/analytics/sites/${selectedSite}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setStats(data);
    }

    fetchStats();
  }, [selectedSite, getToken]);

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">📊 Dashboard</h1>

      {/* Site selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Select Site</label>
        <select
          value={selectedSite || ""}
          onChange={(e) => setSelectedSite(e.target.value)}
          className="px-4 py-2 border rounded"
        >
          {sites.map(site => (
            <option key={site.id} value={site.id}>
              {site.businessName} ({site.status})
            </option>
          ))}
        </select>
      </div>

      {stats && (
        <div className="space-y-6">
          {/* Metrics */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Total Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.stats.totalOrders}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Last Order</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm">
                  {stats.stats.lastOrder
                    ? new Date(stats.stats.lastOrder).toLocaleDateString()
                    : "No orders yet"}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Top Item</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm font-medium">
                  {stats.stats.topItems[0]?.name || "N/A"}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order trend chart */}
          <Card>
            <CardHeader>
              <CardTitle>Orders (Last 7 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={stats.stats.orderTrend}>
                  <CartesianGrid />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="orders" stroke="#2563eb" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top items chart */}
          <Card>
            <CardHeader>
              <CardTitle>Top Menu Items</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.stats.topItems}>
                  <CartesianGrid />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
```

---

### Summary: Dashboard Fixes

**Implementation:**
1. Create `/api/analytics/sites/:configId` endpoint
2. Create aggregation helpers (menu stats, trends)
3. Create `Dashboard.tsx` page with charts
4. Add sidebar link to dashboard

**Timeline:** ⏱️ 4 hours

---

## 🔟 DEPLOYMENT READINESS: Backend/Frontend Separation

### Current State Assessment

**Locations:** 
- Frontend: Netlify
- Backend: Railway (Node.js)
- Database: Neon

**✅ What's Good:**
- Clear separation (Vite on Netlify, Express on Railway)
- Database isolated on NeonDB

**❌ Critical Gaps:**

#### Gap 10.1: CORS Not Configured for Production
**Severity:** 🔴 CRITICAL

**Current Problem:**
```typescript
// File: server/index.ts (current)

app.use(cors());  // ❌ OPEN TO ALL ORIGINS

// Result: Any website can call your API
// Risk: Credential leaks, abuse, data theft
```

**Fix: Restrict CORS to Production Domains**

```typescript
// File: server/index.ts (UPDATED)

import cors from "cors";

const allowedOrigins = [
  process.env.APP_URL || "http://localhost:5173",
  "https://maitr.de",  // Main app
  "https://*.maitr.de",  // Published sites
];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Check if origin is in whitelist
    if (allowedOrigins.includes(origin) ||
        /https:\/\/[\w-]+\.maitr\.de/.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,  // Allow cookies
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  maxAge: 86400,  // 24 hours
};

app.use(cors(corsOptions));
```

---

#### Gap 10.2: No Rate Limiting
**Severity:** 🔴 CRITICAL

**Current Problem:**
- Attackers can spam your API
- No protection against brute force
- No quota enforcement

**Fix: Add Rate Limiting Middleware**

```typescript
// File: server/middleware/rateLimit.ts (NEW)

import rateLimit from "express-rate-limit";

// ✅ Auth endpoint: strict limit (prevent brute force)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5,  // 5 requests per window
  message: "Too many login attempts, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

// ✅ API endpoint: moderate limit
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 100,  // 100 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
});

// ✅ Public endpoint: permissive
export const publicLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
});
```

**Apply middleware:**
```typescript
// File: server/index.ts

import { authLimiter, apiLimiter, publicLimiter } from "./middleware/rateLimit";

// Auth endpoints (strict)
app.post("/api/auth/login", authLimiter, ...);

// Protected API (moderate)
app.use("/api/configurations", apiLimiter);
app.use("/api/analytics", apiLimiter);

// Public endpoints (permissive)
app.use("/api/templates", publicLimiter);
app.get("/api/sites/:subdomain", publicLimiter, ...);
```

---

#### Gap 10.3: No Security Headers
**Severity:** 🟠 HIGH

**Current Problem:**
- No CSP (Content Security Policy)
- No X-Frame-Options (clickjacking)
- Browsers can cache sensitive data

**Fix: Add Helmet Middleware**

```typescript
// File: server/index.ts

import helmet from "helmet";

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],  // For error tracking
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://api.clerk.dev"],
      },
    },
    hsts: {
      maxAge: 31536000,  // 1 year
      includeSubDomains: true,
      preload: true,
    },
  })
);
```

---

#### Gap 10.4: No Input Validation Across All Endpoints
**Severity:** 🟠 HIGH

**Current Problem:**
- SQL injection risk
- XSS attack vectors
- Type confusion bugs

**Fix: Add Zod Validation Middleware**

```typescript
// File: server/middleware/validate.ts (NEW)

import { ZodSchema } from "zod";
import { Request, Response, NextFunction } from "express";

export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: result.error.issues,
      });
    }

    req.body = result.data;
    next();
  };
}

// Usage:
import { ConfigurationSchema } from "./schemas/configuration";

router.post(
  "/configurations",
  requireAuth,
  validateBody(ConfigurationSchema),
  saveConfiguration
);
```

---

#### Gap 10.5: No Health Check Endpoint (for Monitoring)
**Severity:** 🟡 MEDIUM

**Current Problem:**
- Cannot monitor backend health
- Railway cannot auto-restart failed services

**Fix:**
```typescript
// File: server/index.ts

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    checks: {
      database: await checkDatabaseConnection(),
      stripe: await checkStripeConnection(),
    },
  });
});

async function checkDatabaseConnection(): Promise<string> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return "ok";
  } catch {
    return "error";
  }
}

async function checkStripeConnection(): Promise<string> {
  try {
    await stripe.customers.list({ limit: 1 });
    return "ok";
  } catch {
    return "error";
  }
}
```

---

#### Gap 10.6: Environments Not Properly Separated
**Severity:** 🟡 MEDIUM

**Current Problem:**
```bash
# Only one DATABASE_URL
DATABASE_URL=postgresql://...prod...

# No separate staging/dev environments
```

**Fix: Environment Configuration**

```bash
# .env.production (Railway production)
NODE_ENV=production
CLERK_SECRET_KEY=sk_live_...
DATABASE_URL=postgresql://...prod...
STRIPE_SECRET_KEY=sk_live_...
LOG_LEVEL=info

# .env.staging (Railway staging/test)
NODE_ENV=staging
CLERK_SECRET_KEY=sk_test_...
DATABASE_URL=postgresql://...staging...
STRIPE_SECRET_KEY=sk_test_...
LOG_LEVEL=debug

# .env.local (local development)
NODE_ENV=development
CLERK_SECRET_KEY=sk_test_...
DATABASE_URL=postgresql://...local...
STRIPE_SECRET_KEY=sk_test_...
LOG_LEVEL=debug
```

Register in Railway:
```bash
# In Railway Dashboard → Project → Variables
# Set NODE_ENV=production for main branch
# Set NODE_ENV=staging for staging branch
```

---

### Summary: Deployment Readiness Fixes

**Implementation:**
1. Configure CORS for production domains
2. Add rate limiting middleware
3. Add Helmet security headers
4. Add Zod validation middleware
5. Add health check endpoint
6. Setup environment separation

**Pre-Launch Checklist:**
- [ ] CORS restricted to maitr.de
- [ ] Rate limiting enabled on all endpoints
- [ ] Security headers set
- [ ] Input validation on all endpoints
- [ ] Health check monitored
- [ ] Error logging (Sentry) configured
- [ ] Database backups automated (Neon)
- [ ] Stripe webhook verified
- [ ] Environment variables masked (no logs)

**Timeline:** ⏱️ 5 hours

---

## MASTER SUMMARY TABLE

| # | Gap | Severity | Issue | Fix Time | Impact |
|---|-----|----------|-------|----------|--------|
| 1 | NeonDB Schema | 🔴 | Missing tables for marketplace/multi-tenancy | 4h | Cannot scale |
| 2 | Clerk Auth | 🔴 | No RLS on configurations | 6h | **Data leak risk** |
| 3 | n8n Pipeline | 🔴 | No webhook receiver or scraper UI | 8h | Cannot onboard users |
| 4 | Theme Store | 🔴 | Hardcoded templates block marketplace | 4h | Cannot add new themes |
| 5 | SEO Strategy | 🔴 | Client-side rendering kills rankings | 6h | **Cannot be discovered** |
| 6 | Zustand State | 🔴 | No backend sync, no validation | 4h | Data loss on reload |
| 7 | Stripe Integration | 🔴 | Only payment tracking, no subscription | 5h | Cannot charge users |
| 8 | Plugin Slots | 🔴 | No anchors for add-ons in Site.tsx | 4h | Plugin system blocked |
| 9 | Dashboard | 🔴 | No visibility into site performance | 4h | Poor UX |
| 10 | Deployment | 🔴 | No CORS/rate limit/security headers | 5h | **Security vulnerabilities** |

---

## IMPLEMENTATION PRIORITY

**CRITICAL PATH (Must finish before launch):**
1. Gap 2 (RLS) - Security
2. Gap 1 (Schema) - Foundation
3. Gap 5 (SEO) - Business requirement
4. Gap 7 (Stripe) - Revenue
5. Gap 3 (n8n) - User onboarding

**HIGH PRIORITY (Before Week 1):**
6. Gap 4 (Theme Store)
7. Gap 10 (Deployment)
8. Gap 6 (Zustand)

**MEDIUM PRIORITY (Can do Week 2):**
9. Gap 8 (Plugins)
10. Gap 9 (Dashboard)

---

**Total Implementation Time:** ~55 hours = ~7 days at 8h/day

**Recommended Timeline:** Start Monday, complete by next Friday (before launch)

