/*
  Warnings:

  - You are about to drop the column `ePODSignedName` on the `Load` table. All the data in the column will be lost.
  - You are about to drop the column `lastKnownAccuracy` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `lastKnownAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `lastKnownLat` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `lastKnownLng` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "DriverLocation" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "DriverStatus" ALTER COLUMN "capacityTag" SET DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "JobOffer" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Load" DROP COLUMN "ePODSignedName";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "lastKnownAccuracy",
DROP COLUMN "lastKnownAt",
DROP COLUMN "lastKnownLat",
DROP COLUMN "lastKnownLng";
