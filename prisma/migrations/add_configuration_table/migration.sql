-- CreateTable Configuration
CREATE TABLE "Configuration" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL DEFAULT '',
    "businessType" TEXT NOT NULL DEFAULT '',
    "location" TEXT,
    "slogan" TEXT,
    "uniqueDescription" TEXT,
    "template" TEXT NOT NULL DEFAULT '',
    "primaryColor" TEXT NOT NULL DEFAULT '#111827',
    "secondaryColor" TEXT NOT NULL DEFAULT '#6B7280',
    "fontFamily" TEXT NOT NULL DEFAULT 'sans-serif',
    "menuItems" JSONB NOT NULL DEFAULT '[]',
    "gallery" JSONB NOT NULL DEFAULT '[]',
    "openingHours" JSONB NOT NULL DEFAULT '{}',
    "reservationsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "maxGuests" INTEGER NOT NULL DEFAULT 10,
    "onlineOrdering" BOOLEAN NOT NULL DEFAULT false,
    "onlineStore" BOOLEAN NOT NULL DEFAULT false,
    "teamArea" BOOLEAN NOT NULL DEFAULT false,
    "contactMethods" JSONB NOT NULL DEFAULT '[]',
    "socialMedia" JSONB NOT NULL DEFAULT '{}',
    "selectedPages" JSONB NOT NULL DEFAULT '["home"]',
    "customPages" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "publishedUrl" TEXT,
    "previewUrl" TEXT,
    "domainName" TEXT,
    "selectedDomain" TEXT,
    "paymentOptions" JSONB NOT NULL DEFAULT '[]',
    "offers" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Configuration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Configuration_userId_idx" ON "Configuration"("userId");

-- CreateIndex
CREATE INDEX "Configuration_status_idx" ON "Configuration"("status");

-- AddForeignKey
ALTER TABLE "Configuration" ADD CONSTRAINT "Configuration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
