/*
  Warnings:

  - You are about to drop the column `date` on the `Load` table. All the data in the column will be lost.
  - You are about to drop the column `from` on the `Load` table. All the data in the column will be lost.
  - You are about to drop the column `to` on the `Load` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `Load` table. All the data in the column will be lost.
  - Added the required column `dropoffCity` to the `Load` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pickupCity` to the `Load` table without a default value. This is not possible if the table is not empty.
  - Added the required column `vehicleType` to the `Load` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Load" DROP COLUMN "date",
DROP COLUMN "from",
DROP COLUMN "to",
DROP COLUMN "type",
ADD COLUMN     "dropoffCity" TEXT NOT NULL,
ADD COLUMN     "pickupCity" TEXT NOT NULL,
ADD COLUMN     "pickupDate" TEXT,
ADD COLUMN     "vehicleType" TEXT NOT NULL;
