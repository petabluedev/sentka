/*
  Warnings:

  - The primary key for the `Load` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `distance` column on the `Load` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Load" DROP CONSTRAINT "Load_pkey",
DROP COLUMN "distance",
ADD COLUMN     "distance" INTEGER,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "Load_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Load_id_seq";
