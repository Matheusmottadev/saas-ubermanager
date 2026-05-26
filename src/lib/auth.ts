import argon2 from "argon2";
import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";

import { prisma } from "@/lib/prisma";

const SESSION_COOKIE_NAME = "urbann_session";
const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30;
const DEMO_USER_EMAIL = "123@g.com";
const DEMO_USER_PASSWORD = "123";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function hashPassword(password: string) {
  return argon2.hash(password, {
    type: argon2.argon2id,
  });
}

export async function verifyPassword(passwordHash: string, password: string) {
  return argon2.verify(passwordHash, password);
}

async function deleteExpiredSessions() {
  await prisma.session.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });
}

export async function ensureBootstrapUser() {
  const usersCount = await prisma.user.count();
  if (usersCount > 0) {
    return;
  }

  const existingDemoUser = await prisma.user.findUnique({
    where: {
      email: DEMO_USER_EMAIL,
    },
  });

  if (existingDemoUser) {
    return;
  }

  await prisma.user.create({
    data: {
      email: DEMO_USER_EMAIL,
      passwordHash: await hashPassword(DEMO_USER_PASSWORD),
    },
  });
}

export async function createUserSession(userId: string) {
  await deleteExpiredSessions();

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_MS);

  await prisma.session.create({
    data: {
      expiresAt,
      tokenHash: hashSessionToken(token),
      userId,
    },
  });

  return {
    expiresAt,
    token,
  };
}

export async function getCurrentSession() {
  await deleteExpiredSessions();

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }

  const session = await prisma.session.findUnique({
    include: {
      user: true,
    },
    where: {
      tokenHash: hashSessionToken(token),
    },
  });

  if (!session) {
    return null;
  }

  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session.delete({
      where: {
        id: session.id,
      },
    });
    return null;
  }

  return session;
}

export async function getCurrentUser() {
  const session = await getCurrentSession();
  return session?.user ?? null;
}

export function buildSessionCookie(token: string, expiresAt: Date) {
  return {
    expires: expiresAt,
    httpOnly: true,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    value: token,
  };
}

export function buildClearedSessionCookie() {
  return {
    expires: new Date(0),
    httpOnly: true,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    value: "",
  };
}

export async function clearCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    await prisma.session.deleteMany({
      where: {
        tokenHash: hashSessionToken(token),
      },
    });
  }
}

export async function authenticateUser(email: string, password: string) {
  await ensureBootstrapUser();

  const user = await prisma.user.findUnique({
    where: {
      email: normalizeEmail(email),
    },
  });

  if (!user) {
    return null;
  }

  const isValid = await verifyPassword(user.passwordHash, password);
  return isValid ? user : null;
}

export { DEMO_USER_EMAIL, DEMO_USER_PASSWORD, SESSION_COOKIE_NAME, normalizeEmail };
