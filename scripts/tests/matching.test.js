process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({ module: "CommonJS" });
require("ts-node/register");
require("tsconfig-paths/register");

const assert = require("assert");
const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");
const { haversineKm, assignNearestDriver, acceptJobOffer } = require("../../src/lib/matching");

const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 120000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

async function createDriver(suffix, lat, lng) {
  const driver = await prisma.user.create({
    data: {
      email: `driver_${suffix}@test.local`,
      username: `driver_${suffix}`,
      password: hashPassword("testpass123"),
      role: "DRIVER",
    },
  });
  await prisma.driverStatus.create({
    data: {
      driverId: driver.id,
      availability: "ONLINE",
      lastSeenAt: new Date(),
    },
  });
  await prisma.driverLocation.create({
    data: {
      driverId: driver.id,
      lat,
      lng,
      capturedAt: new Date(),
    },
  });
  return driver;
}

async function setupJob(suffix, pickupLat, pickupLng) {
  const shipper = await prisma.user.create({
    data: {
      email: `shipper_${suffix}@test.local`,
      username: `shipper_${suffix}`,
      password: hashPassword("testpass123"),
      role: "SHIPPER",
    },
  });
  const load = await prisma.load.create({
    data: {
      vehicle: "Sedan",
      pickupCity: "Dallas",
      dropoffCity: "Austin",
      priceCents: 120000,
      vehicleType: "SEDAN",
      pickupLat,
      pickupLng,
      postedById: shipper.id,
    },
  });
  return { shipper, load };
}

async function cleanup(ids) {
  if (!ids) return;
  await prisma.jobOffer.deleteMany({ where: { jobId: ids.loadId } });
  await prisma.driverLocation.deleteMany({ where: { driverId: { in: ids.driverIds } } });
  await prisma.driverStatus.deleteMany({ where: { driverId: { in: ids.driverIds } } });
  await prisma.load.deleteMany({ where: { id: ids.loadId } });
  await prisma.user.deleteMany({ where: { id: { in: [ids.shipperId, ...ids.driverIds] } } });
}

async function testHaversine() {
  const dallas = { lat: 32.7767, lng: -96.7970 };
  const austin = { lat: 30.2672, lng: -97.7431 };
  const distance = haversineKm(dallas.lat, dallas.lng, austin.lat, austin.lng);
  assert.ok(distance > 250 && distance < 350, "Dallas→Austin distance should be ~300km");
}

async function testAssignmentFlow() {
  const suffix = Date.now().toString(36);
  const driverNear = await createDriver(`${suffix}_near`, 32.7767, -96.7970);
  const driverFar = await createDriver(`${suffix}_far`, 29.7604, -95.3698); // Houston
  const { shipper, load } = await setupJob(suffix, 32.7767, -96.7970);
  try {
    const first = await assignNearestDriver(load.id);
    assert.strictEqual(first.status, "offered", "Expected an offer to be created");

    const offers = await prisma.jobOffer.findMany({ where: { jobId: load.id } });
    assert.strictEqual(offers.length, 1, "Expected one offer");
    assert.strictEqual(offers[0].driverId, driverNear.id, "Expected nearest driver to get offer");

    const jobAfterAccept = await acceptJobOffer(driverNear.id, offers[0].id);
    assert.strictEqual(jobAfterAccept.assignedDriverId, driverNear.id, "Job should be assigned to driver");

    const second = await assignNearestDriver(load.id);
    assert.strictEqual(second.status, "already_assigned", "Should not reassign assigned job");

    // Ensure another driver cannot overwrite assignment
    let failed = false;
    try {
      await acceptJobOffer(driverFar.id, offers[0].id);
    } catch {
      failed = true;
    }
    assert.ok(failed, "Second acceptance should fail");
  } finally {
    await cleanup({ loadId: load.id, shipperId: shipper.id, driverIds: [driverNear.id, driverFar.id] });
  }
}

async function testNoDuplicateOffer() {
  const suffix = Date.now().toString(36);
  const driver = await createDriver(`${suffix}_dup`, 32.7767, -96.7970);
  const { shipper, load } = await setupJob(`${suffix}_dup`, 32.7767, -96.7970);
  try {
    await assignNearestDriver(load.id);
    await assignNearestDriver(load.id);
    const offers = await prisma.jobOffer.findMany({ where: { jobId: load.id } });
    assert.strictEqual(offers.length, 1, "Expected only one active offer");
  } finally {
    await cleanup({ loadId: load.id, shipperId: shipper.id, driverIds: [driver.id] });
  }
}

async function run() {
  await testHaversine();
  await testAssignmentFlow();
  await testNoDuplicateOffer();
  console.log("Matching tests passed.");
}

run()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
