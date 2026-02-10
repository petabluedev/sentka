/*
  Warnings:

  - The primary key for the `Load` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `dropoffCity` on the `Load` table. All the data in the column will be lost.
  - You are about to drop the column `dropoffState` on the `Load` table. All the data in the column will be lost.
  - You are about to drop the column `pickupCity` on the `Load` table. All the data in the column will be lost.
  - You are about to drop the column `pickupState` on the `Load` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `Load` table. All the data in the column will be lost.
  - You are about to drop the column `shipperId` on the `Load` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Load` table. All the data in the column will be lost.
  - The `id` column on the `Load` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `from` to the `Load` table without a default value. This is not possible if the table is not empty.
  - Added the required column `priceCents` to the `Load` table without a default value. This is not possible if the table is not empty.
  - Added the required column `to` to the `Load` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `Load` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Load" DROP CONSTRAINT "Load_pkey",
DROP COLUMN "dropoffCity",
DROP COLUMN "dropoffState",
DROP COLUMN "pickupCity",
DROP COLUMN "pickupState",
DROP COLUMN "price",
DROP COLUMN "shipperId",
DROP COLUMN "status",
ADD COLUMN     "date" TEXT,
ADD COLUMN     "distance" TEXT,
ADD COLUMN     "enclosed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "from" TEXT NOT NULL,
ADD COLUMN     "operable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "priceCents" INTEGER NOT NULL,
ADD COLUMN     "to" TEXT NOT NULL,
ADD COLUMN     "type" TEXT NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "Load_pkey" PRIMARY KEY ("id");
