-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastLoginAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "schemaVersion" VARCHAR(10) NOT NULL DEFAULT 'v1',
    "eventType" VARCHAR(50) NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "visitorId" VARCHAR(64) NOT NULL,
    "sessionId" VARCHAR(64) NOT NULL,
    "userId" TEXT,
    "entityType" VARCHAR(50),
    "entityId" VARCHAR(100),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsDailyRollup" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "totalSessions" INTEGER NOT NULL DEFAULT 0,
    "uniqueVisitors" INTEGER NOT NULL DEFAULT 0,
    "pageViews" INTEGER NOT NULL DEFAULT 0,
    "productViews" INTEGER NOT NULL DEFAULT 0,
    "cartAdditions" INTEGER NOT NULL DEFAULT 0,
    "checkoutsStarted" INTEGER NOT NULL DEFAULT 0,
    "ordersPlaced" INTEGER NOT NULL DEFAULT 0,
    "grossRevenue" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "newRegistrations" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalyticsDailyRollup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsOutbox" (
    "id" TEXT NOT NULL,
    "eventType" VARCHAR(50) NOT NULL,
    "idempotencyKey" VARCHAR(128) NOT NULL,
    "payload" JSONB NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 5,
    "nextRetryAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "lockedBy" VARCHAR(64),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "AnalyticsOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnalyticsEvent_eventType_createdAt_idx" ON "AnalyticsEvent"("eventType", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_visitorId_createdAt_idx" ON "AnalyticsEvent"("visitorId", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_sessionId_idx" ON "AnalyticsEvent"("sessionId");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_userId_createdAt_idx" ON "AnalyticsEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_entityType_entityId_idx" ON "AnalyticsEvent"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_createdAt_idx" ON "AnalyticsEvent"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsDailyRollup_date_key" ON "AnalyticsDailyRollup"("date");

-- CreateIndex
CREATE INDEX "AnalyticsDailyRollup_date_idx" ON "AnalyticsDailyRollup"("date");

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsOutbox_idempotencyKey_key" ON "AnalyticsOutbox"("idempotencyKey");

-- CreateIndex
CREATE INDEX "AnalyticsOutbox_status_nextRetryAt_idx" ON "AnalyticsOutbox"("status", "nextRetryAt");

-- CreateIndex
CREATE INDEX "AnalyticsOutbox_createdAt_idx" ON "AnalyticsOutbox"("createdAt");

-- AddForeignKey
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
