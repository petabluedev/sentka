-- AlterTable
ALTER TABLE "Load" ADD COLUMN     "ePODRequestedAt" TIMESTAMP(3),
ADD COLUMN     "ePODRequestedById" TEXT;

-- AddForeignKey
ALTER TABLE "Load" ADD CONSTRAINT "Load_ePODRequestedById_fkey" FOREIGN KEY ("ePODRequestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
