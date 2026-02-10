-- Add payout rail + idempotency fields
CREATE TYPE "PayoutRail" AS ENUM ('FEDNOW', 'RTP', 'INSTANT_DEBIT', 'ACH_SAME_DAY', 'ACH_STANDARD');

ALTER TABLE "Payout"
  ADD COLUMN "railUsed" "PayoutRail",
  ADD COLUMN "providerReferenceId" TEXT,
  ADD COLUMN "idempotencyKey" TEXT,
  ADD COLUMN "initiatedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Payout_driverId_idempotencyKey_key" ON "Payout"("driverId", "idempotencyKey");
