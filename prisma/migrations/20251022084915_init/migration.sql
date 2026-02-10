-- CreateTable
CREATE TABLE "Load" (
    "id" TEXT NOT NULL,
    "shipperId" TEXT,
    "pickupCity" TEXT NOT NULL,
    "pickupState" TEXT,
    "dropoffCity" TEXT NOT NULL,
    "dropoffState" TEXT,
    "vehicle" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'POSTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Load_pkey" PRIMARY KEY ("id")
);
