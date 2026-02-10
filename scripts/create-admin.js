const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 120000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

async function main() {
  const email = process.env.ADMIN_EMAIL || "admin@blue.com";
  const username = process.env.ADMIN_USERNAME || "admin1";
  const name = process.env.ADMIN_NAME || "tunde";
  const password = process.env.ADMIN_PASSWORD || "admin123";

  const existingByEmail = await prisma.user.findUnique({ where: { email } });
  if (existingByEmail) {
    await prisma.user.update({
      where: { id: existingByEmail.id },
      data: { username, name, role: "ADMIN", password: hashPassword(password) },
    });
    console.log(`Updated admin ${email}`);
    return;
  }

  const existingByUsername = await prisma.user.findUnique({ where: { username } });
  if (existingByUsername) {
    await prisma.user.update({
      where: { id: existingByUsername.id },
      data: { email, name, role: "ADMIN", password: hashPassword(password) },
    });
    console.log(`Updated admin ${email} (username match)`);
    return;
  }

  await prisma.user.create({
    data: {
      email,
      username,
      name,
      password: hashPassword(password),
      role: "ADMIN",
    },
  });
  console.log(`Created admin ${email}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
