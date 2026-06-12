-- Add Garmin sync/backfill control fields and explicit backfill job tracking.
ALTER TABLE "GarminConnection"
  ADD COLUMN "lastIncrementalSyncAt" TIMESTAMP(3),
  ADD COLUMN "lastWebhookAt" TIMESTAMP(3),
  ADD COLUMN "historicalBackfillStatus" TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "historicalBackfillStartedAt" TIMESTAMP(3),
  ADD COLUMN "historicalBackfillFinishedAt" TIMESTAMP(3),
  ADD COLUMN "rateLimitedUntil" TIMESTAMP(3);

CREATE TABLE "GarminBackfillJob" (
  "id" SERIAL NOT NULL,
  "uuid" TEXT NOT NULL,
  "userId" INTEGER NOT NULL,
  "connectionId" INTEGER NOT NULL,
  "summaryType" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "from" TIMESTAMP(3) NOT NULL,
  "to" TIMESTAMP(3) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "requestedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "GarminBackfillJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GarminBackfillJob_uuid_key" ON "GarminBackfillJob"("uuid");
CREATE UNIQUE INDEX "GarminBackfillJob_connectionId_summaryType_from_to_key" ON "GarminBackfillJob"("connectionId", "summaryType", "from", "to");
CREATE INDEX "GarminBackfillJob_userId_status_idx" ON "GarminBackfillJob"("userId", "status");
CREATE INDEX "GarminBackfillJob_connectionId_summaryType_status_idx" ON "GarminBackfillJob"("connectionId", "summaryType", "status");

ALTER TABLE "GarminBackfillJob" ADD CONSTRAINT "GarminBackfillJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GarminBackfillJob" ADD CONSTRAINT "GarminBackfillJob_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "GarminConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
