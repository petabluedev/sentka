-- Clean up legacy ledger tables/types if they exist (dev only)
DROP TABLE IF EXISTS "LedgerEntry" CASCADE;
DROP TABLE IF EXISTS "Account" CASCADE;
DROP TYPE IF EXISTS "AccountType";

-- CreateEnum
CREATE TYPE "EarningStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID');

-- CreateEnum
CREATE TYPE "PayoutMethod" AS ENUM ('WEEKLY_ACH', 'INSTANT_DEBIT');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('CREATED', 'PROCESSING', 'SUCCEEDED', 'FAILED');

-- CreateEnum
CREATE TYPE "LedgerRefType" AS ENUM ('EARNING', 'PAYOUT');

-- CreateEnum
CREATE TYPE "PayoutDestinationType" AS ENUM ('BANK_ACH', 'DEBIT_CARD');

-- CreateTable
CREATE TABLE "Earning" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "status" "EarningStatus" NOT NULL DEFAULT 'PENDING',
    "approvedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "payoutId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Earning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "amountGrossCents" INTEGER NOT NULL,
    "feeAmountCents" INTEGER NOT NULL,
    "amountNetCents" INTEGER NOT NULL,
    "method" "PayoutMethod" NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'CREATED',
    "destinationMask" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "refType" "LedgerRefType" NOT NULL,
    "refId" TEXT NOT NULL,
    "debitAccount" TEXT NOT NULL,
    "creditAccount" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayoutDestination" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "type" "PayoutDestinationType" NOT NULL,
    "tokenReference" TEXT NOT NULL,
    "mask" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayoutDestination_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Earning_jobId_key" ON "Earning"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "LedgerEntry_refType_refId_debitAccount_creditAccount_key" ON "LedgerEntry"("refType", "refId", "debitAccount", "creditAccount");

-- CreateIndex
CREATE UNIQUE INDEX "PayoutDestination_driverId_type_tokenReference_key" ON "PayoutDestination"("driverId", "type", "tokenReference");

-- AddForeignKey
ALTER TABLE "Earning" ADD CONSTRAINT "Earning_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Load"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Earning" ADD CONSTRAINT "Earning_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Earning" ADD CONSTRAINT "Earning_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "Payout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutDestination" ADD CONSTRAINT "PayoutDestination_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
