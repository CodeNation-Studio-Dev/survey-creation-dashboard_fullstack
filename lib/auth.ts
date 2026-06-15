import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ensureSchema } from "./db";
import type { AuthUser } from "./types";

const SESSION_COOKIE = "survey_studio_session";
const SESSION_TTL_DAYS = 14;

function asText(value: unknown) {
  return typeof value === "string" ? value : "";
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");

  if (!salt || !hash) {
    return false;
  }

  const candidate = scryptSync(password, salt, 64);
  const original = Buffer.from(hash, "hex");

  if (candidate.length !== original.length) {
    return false;
  }

  return timingSafeEqual(candidate, original);
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;

  if (!sessionToken) {
    return null;
  }

  const sql = await ensureSchema();

  if (!sql) {
    return null;
  }

  const rows = (await sql`
    SELECT users.id, users.email, users.created_at
    FROM auth_sessions
    INNER JOIN users ON users.id = auth_sessions.user_id
    WHERE auth_sessions.session_token = ${sessionToken}
      AND auth_sessions.expires_at > NOW()
    LIMIT 1
  `) as Array<Record<string, unknown>>;

  if (!rows[0]) {
    cookieStore.delete(SESSION_COOKIE);
    return null;
  }

  return {
    id: asText(rows[0].id),
    email: asText(rows[0].email),
    createdAt: asText(rows[0].created_at),
  };
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth");
  }

  return user;
}

export async function registerWithPassword(email: string, password: string) {
  const sql = await ensureSchema();

  if (!sql) {
    throw new Error("Configura DATABASE_URL antes de registrar usuarios.");
  }

  const normalizedEmail = email.trim().toLowerCase();

  const existing = (await sql`
    SELECT id
    FROM users
    WHERE email = ${normalizedEmail}
    LIMIT 1
  `) as Array<Record<string, unknown>>;

  if (existing[0]) {
    throw new Error("El correo ya esta registrado.");
  }

  const userId = crypto.randomUUID();
  const passwordHash = hashPassword(password);

  await sql`
    INSERT INTO users (id, email, password_hash)
    VALUES (${userId}, ${normalizedEmail}, ${passwordHash})
  `;

  return {
    id: userId,
    email: normalizedEmail,
  };
}

export async function loginWithPassword(email: string, password: string) {
  const sql = await ensureSchema();

  if (!sql) {
    throw new Error("Configura DATABASE_URL antes de iniciar sesion.");
  }

  const normalizedEmail = email.trim().toLowerCase();
  const rows = (await sql`
    SELECT id, email, password_hash
    FROM users
    WHERE email = ${normalizedEmail}
    LIMIT 1
  `) as Array<Record<string, unknown>>;

  const row = rows[0];

  if (!row || !verifyPassword(password, asText(row.password_hash))) {
    throw new Error("Correo o contrasena invalidos.");
  }

  return {
    id: asText(row.id),
    email: asText(row.email),
  };
}

export async function changePasswordForUser(
  userId: string,
  currentPassword: string,
  nextPassword: string,
) {
  const sql = await ensureSchema();

  if (!sql) {
    throw new Error("Configura DATABASE_URL antes de actualizar la contrasena.");
  }

  const rows = (await sql`
    SELECT password_hash
    FROM users
    WHERE id = ${userId}
    LIMIT 1
  `) as Array<Record<string, unknown>>;

  const storedHash = asText(rows[0]?.password_hash);

  if (!storedHash || !verifyPassword(currentPassword, storedHash)) {
    throw new Error("La contrasena actual no es valida.");
  }

  const nextPasswordHash = hashPassword(nextPassword);

  await sql`
    UPDATE users
    SET password_hash = ${nextPasswordHash}
    WHERE id = ${userId}
  `;
}

export async function createUserSession(userId: string) {
  const sql = await ensureSchema();

  if (!sql) {
    throw new Error("Configura DATABASE_URL antes de crear sesiones.");
  }

  const token = randomBytes(32).toString("hex");

  await sql`
    INSERT INTO auth_sessions (id, user_id, session_token, expires_at)
    VALUES (
      ${crypto.randomUUID()},
      ${userId},
      ${token},
      NOW() + INTERVAL '14 days'
    )
  `;

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  });
}

export async function clearUserSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    const sql = await ensureSchema();

    if (sql) {
      await sql`
        DELETE FROM auth_sessions
        WHERE session_token = ${token}
      `;
    }
  }

  cookieStore.delete(SESSION_COOKIE);
}