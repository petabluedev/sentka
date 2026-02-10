-- CreateEnum
CREATE TYPE "BidStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELED');

-- CreateTable
CREATE TABLE "Bid" (
    "id" TEXT NOT NULL,
    "loadId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "status" "BidStatus" NOT NULL DEFAULT 'PENDING',
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bid_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "Load"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
