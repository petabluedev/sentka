import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  clearAuthCookies,
  createSession,
  hashPassword,
  roleFromInput,
  withAuthCookies,
} from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const name = (body.name ?? "").toString().trim();
    const email = (body.email ?? "").toString().trim().toLowerCase();
    const password = (body.password ?? "").toString();
    const role = roleFromInput(body.role);
    const rawUsername = (body.username ?? "").toString().trim();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Missing name, email, or password" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const username = await generateUsername(rawUsername || name || email);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        username,
        role,
        password: hashPassword(password),
        profile: {
          create: {
            companyName: body.companyName ?? null,
            phone: body.phone ?? null,
            city: body.city ?? null,
            state: body.state ?? null,
          },
        },
      },
    });

    const { token, expiresAt } = await createSession(user.id, req.headers.get("user-agent") ?? undefined, true);
    const res = NextResponse.json(
      { user: { id: user.id, email: user.email, name: user.name, role: user.role, username: user.username } },
      { status: 201 }
    );
    return withAuthCookies(res, token, user.role, expiresAt);
  } catch (err) {
    console.error("POST /api/auth/register error", err);
    return clearAuthCookies(NextResponse.json({ error: "Server error" }, { status: 500 }));
  }
}

async function generateUsername(seed: string) {
  const base = slugify(seed);
  const candidates = [base, `${base}${Math.floor(Math.random() * 900 + 100)}`];
  for (const handle of candidates) {
    if (!handle) continue;
    const exists = await prisma.user.findUnique({ where: { username: handle } });
    if (!exists) return handle;
  }
  // fallback: keep trying with random suffixes
  for (let i = 0; i < 5; i++) {
    const handle = `${base}${Math.floor(Math.random() * 9000 + 1000)}`;
    const exists = await prisma.user.findUnique({ where: { username: handle } });
    if (!exists) return handle;
  }
  throw new Error("Could not generate username");
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24) || `user${Math.floor(Math.random() * 900 + 100)}`;
}
