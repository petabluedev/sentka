/*
  Warnings:

  - The `pickupDate` column on the `Load` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Load" DROP COLUMN "pickupDate",
ADD COLUMN     "pickupDate" TIMESTAMP(3);
