process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({ module: "CommonJS" });
require("ts-node/register");
require("tsconfig-paths/register");

const assert = require("assert");
const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");
const { approveEarningForJob, openDisputeForJob } = require("../../src/lib/earnings");
const { createInstantPayoutForDriver, createWeeklyPayoutForDriver } = require("../../src/lib/payouts");

const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 120000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

async function setupTestData() {
  const suffix = Date.now().toString(36);
  const driver = await prisma.user.create({
    data: {
      email: `driver_${suffix}@test.local`,
      username: `driver_${suffix}`,
      password: hashPassword("testpass123"),
      role: "DRIVER",
    },
  });
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
      postedById: shipper.id,
    },
  });
  await prisma.bid.create({
    data: {
      loadId: load.id,
      driverId: driver.id,
      amountCents: 115000,
      status: "ACCEPTED",
      acceptedAt: new Date(),
    },
  });
  return { driver, shipper, load };
}

async function cleanup(driverId, shipperId) {
  const payouts = await prisma.payout.findMany({ where: { driverId }, select: { id: true } });
  const earnings = await prisma.earning.findMany({ where: { driverId }, select: { id: true } });
  const refIds = [...payouts.map((p) => p.id), ...earnings.map((e) => e.id)];
  if (refIds.length) {
    await prisma.ledgerEntry.deleteMany({ where: { refId: { in: refIds } } });
  }
  await prisma.payout.deleteMany({ where: { driverId } });
  await prisma.earning.deleteMany({ where: { driverId } });
  await prisma.bid.deleteMany({ where: { driverId } });
  await prisma.load.deleteMany({ where: { postedById: shipperId } });
  await prisma.user.deleteMany({ where: { id: { in: [driverId, shipperId] } } });
}

async function testDuplicatePayoutPrevention() {
  const { driver, shipper, load } = await setupTestData();
  try {
    await approveEarningForJob({
      jobId: load.id,
      driverId: driver.id,
      amountCents: 115000,
    });

    const first = await createWeeklyPayoutForDriver(driver.id);
    assert.ok(first, "Expected weekly payout to be created");

    const second = await createWeeklyPayoutForDriver(driver.id);
    assert.strictEqual(second, null, "Expected no second payout for same earnings");

    const payouts = await prisma.payout.findMany({ where: { driverId: driver.id } });
    assert.strictEqual(payouts.length, 1, "Expected exactly one payout record");
  } finally {
    await cleanup(driver.id, shipper.id);
  }
}

async function testDisputeBlocksPayout() {
  const { driver, shipper, load } = await setupTestData();
  try {
    await approveEarningForJob({
      jobId: load.id,
      driverId: driver.id,
      amountCents: 115000,
    });

    const disputed = await openDisputeForJob(load.id);
    assert.ok(disputed && disputed.status === "PENDING", "Expected earning to revert to PENDING");

    const instant = await createInstantPayoutForDriver(driver.id);
    assert.strictEqual(instant, null, "Expected no instant payout when earnings are pending");
  } finally {
    await cleanup(driver.id, shipper.id);
  }
}

async function run() {
  await testDuplicatePayoutPrevention();
  await testDisputeBlocksPayout();
  console.log("Earnings payout tests passed.");
}

run()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
