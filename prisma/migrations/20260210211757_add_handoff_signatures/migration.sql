-- AlterTable
ALTER TABLE "Load" ADD COLUMN     "ePODSignature" TEXT,
ADD COLUMN     "pickupHandoffAt" TIMESTAMP(3),
ADD COLUMN     "pickupHandoffById" TEXT,
ADD COLUMN     "pickupHandoffSignature" TEXT;

-- AddForeignKey
ALTER TABLE "Load" ADD CONSTRAINT "Load_pickupHandoffById_fkey" FOREIGN KEY ("pickupHandoffById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
