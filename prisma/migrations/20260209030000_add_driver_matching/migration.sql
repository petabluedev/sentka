-- Enums
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "AssignmentStatus" AS ENUM ('UNASSIGNED', 'OFFERING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELED');
CREATE TYPE "DriverAvailability" AS ENUM ('OFFLINE', 'ONLINE', 'ON_TRIP', 'PAUSED');
CREATE TYPE "JobOfferStatus" AS ENUM ('OFFERED', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'CANCELED');
CREATE TYPE "VehicleType" AS ENUM ('SEDAN', 'SUV', 'VAN', 'BOX_TRUCK', 'CAR_HAULER');

-- Load assignment + coordinates
ALTER TABLE "Load"
  ADD COLUMN "pickupLat" DOUBLE PRECISION,
  ADD COLUMN "pickupLng" DOUBLE PRECISION,
  ADD COLUMN "dropoffLat" DOUBLE PRECISION,
  ADD COLUMN "dropoffLng" DOUBLE PRECISION,
  ADD COLUMN "assignedDriverId" TEXT,
  ADD COLUMN "assignmentStatus" "AssignmentStatus" NOT NULL DEFAULT 'UNASSIGNED',
  ADD COLUMN "assignmentVersion" INTEGER NOT NULL DEFAULT 0;

-- Driver location
CREATE TABLE "DriverLocation" (
  "driverId" TEXT NOT NULL,
  "lat" DOUBLE PRECISION NOT NULL,
  "lng" DOUBLE PRECISION NOT NULL,
  "accuracyM" INTEGER,
  "headingDeg" INTEGER,
  "speedMps" DOUBLE PRECISION,
  "capturedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "DriverLocation_pkey" PRIMARY KEY ("driverId")
);

-- Driver status
CREATE TABLE "DriverStatus" (
  "driverId" TEXT NOT NULL,
  "availability" "DriverAvailability" NOT NULL DEFAULT 'OFFLINE',
  "vehicleType" "VehicleType",
  "capacityTag" TEXT[],
  "homeZone" TEXT,
  "lastSeenAt" TIMESTAMPTZ(3),
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "DriverStatus_pkey" PRIMARY KEY ("driverId")
);

-- Job offers
CREATE TABLE "JobOffer" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "jobId" TEXT NOT NULL,
  "driverId" TEXT NOT NULL,
  "offerStatus" "JobOfferStatus" NOT NULL,
  "offeredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "respondedAt" TIMESTAMPTZ(3),
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  "score" DOUBLE PRECISION NOT NULL,
  "distanceKm" DOUBLE PRECISION NOT NULL,
  "attempt" INTEGER NOT NULL DEFAULT 1,

  CONSTRAINT "JobOffer_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX "JobOffer_jobId_driverId_attempt_key" ON "JobOffer"("jobId", "driverId", "attempt");
CREATE INDEX "JobOffer_jobId_offerStatus_idx" ON "JobOffer"("jobId", "offerStatus");
CREATE INDEX "JobOffer_driverId_offeredAt_idx" ON "JobOffer"("driverId", "offeredAt");

-- Foreign keys
ALTER TABLE "Load" ADD CONSTRAINT "Load_assignedDriverId_fkey" FOREIGN KEY ("assignedDriverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DriverLocation" ADD CONSTRAINT "DriverLocation_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DriverStatus" ADD CONSTRAINT "DriverStatus_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JobOffer" ADD CONSTRAINT "JobOffer_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Load"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JobOffer" ADD CONSTRAINT "JobOffer_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- PostGIS column/index if extension exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') THEN
    ALTER TABLE "DriverLocation" ADD COLUMN IF NOT EXISTS "geom" geography(Point, 4326);
    CREATE INDEX IF NOT EXISTS "DriverLocation_geom_idx" ON "DriverLocation" USING GIST ("geom");
  END IF;
END $$;
