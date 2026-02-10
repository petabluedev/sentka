-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'REQUIRES_ACTION', 'SUCCEEDED', 'FAILED', 'REFUNDED', 'CANCELED');

-- DropForeignKey
ALTER TABLE "PasswordReset" DROP CONSTRAINT "PasswordReset_userId_fkey";

-- AlterTable
ALTER TABLE "Load" ADD COLUMN     "ePODApprovedAt" TIMESTAMP(3),
ADD COLUMN     "ePODApprovedById" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "connectAccountId" TEXT;

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "loadId" TEXT NOT NULL,
    "payerId" TEXT NOT NULL,
    "payeeId" TEXT,
    "payeeConnectId" TEXT,
    "transferId" TEXT,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "paymentIntentId" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "captured" BOOLEAN NOT NULL DEFAULT false,
    "releasedAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Payment_paymentIntentId_key" ON "Payment"("paymentIntentId");

-- AddForeignKey
ALTER TABLE "Load" ADD CONSTRAINT "Load_ePODApprovedById_fkey" FOREIGN KEY ("ePODApprovedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordReset" ADD CONSTRAINT "PasswordReset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "Load"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
