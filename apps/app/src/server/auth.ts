import { Auth } from "@auth/core";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import type { Provider } from "@auth/core/providers";
import GitHub from "@auth/core/providers/github";
import Google from "@auth/core/providers/google";
import { eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { parse as parseCookie, serialize as serializeCookie } from "cookie";
import { z } from "zod";

import { accounts, sessions, users, verificationTokens } from "@daily-notes/db";

import { getDb } from "./db.js";
import { env } from "./env.js";

function buildProviders(): Provider[] {
  const providers: Provider[] = [];

  if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) {
    providers.push(
      GitHub({
        clientId: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
        allowDangerousEmailAccountLinking: true,
      }),
    );
  }

  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    providers.push(
      Google({
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        allowDangerousEmailAccountLinking: true,
      }),
    );
  }

  return providers;
}

const credentialsSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-zA-Z0-9_-]+$/),
  email: z.string().email(),
  password: z.string().min(8).max(200),
  timezone: z.string().min(1).max(100).optional(),
});

const loginSchema = z.object({
  identifier: z.string().min(1).max(200),
  password: z.string().min(8).max(200),
});

function getSessionCookieName(isSecure: boolean): string {
  return isSecure ? "__Secure-authjs.session-token" : "authjs.session-token";
}

function setSessionCookie(reply: FastifyReply, token: string, isSecure: boolean, expires: Date): void {
  const cookie = serializeCookie(getSessionCookieName(isSecure), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecure,
    path: "/",
    expires,
  });
  reply.header("set-cookie", cookie);
}

function clearSessionCookie(reply: FastifyReply, isSecure: boolean): void {
  const cookie = serializeCookie(getSessionCookieName(isSecure), "", {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecure,
    path: "/",
    expires: new Date(0),
  });
  reply.header("set-cookie", cookie);
}

function isSecureRequest(request: FastifyRequest): boolean {
  const proto = request.headers["x-forwarded-proto"];
  if (typeof proto === "string") {
    return proto.split(",")[0]!.trim() === "https";
  }

  return request.protocol === "https";
}

async function createDatabaseSession(userId: string): Promise<{ token: string; expires: Date }> {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
  const db = getDb();

  await db.insert(sessions).values({
    sessionToken: token,
    userId,
    expires,
  });

  return { token, expires };
}

function getRequestOrigin(request: FastifyRequest): string {
  const forwardedProto = request.headers["x-forwarded-proto"];
  const forwardedHost = request.headers["x-forwarded-host"];

  const proto =
    typeof forwardedProto === "string"
      ? forwardedProto.split(",")[0]!.trim()
      : request.protocol;

  const host =
    typeof forwardedHost === "string"
      ? forwardedHost
        : typeof request.headers.host === "string"
          ? request.headers.host
        : "localhost:4004";

  return `${proto}://${host}`;
}

function toWebRequest(request: FastifyRequest): Request {
  const url = new URL(request.raw.url ?? "/", getRequestOrigin(request));
  const headers = new Headers();

  for (const [key, value] of Object.entries(request.headers)) {
    if (typeof value === "undefined") {
      continue;
    }
    headers.set(key, Array.isArray(value) ? value.join(",") : value);
  }

  const init: RequestInit = {
    method: request.method,
    headers,
  };

  if (request.method !== "GET" && request.method !== "HEAD" && request.body) {
    const contentType = headers.get("content-type") ?? "";

    if (contentType.includes("application/x-www-form-urlencoded") && typeof request.body === "object") {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(request.body as Record<string, unknown>)) {
        if (typeof value === "string") {
          params.append(key, value);
        }
      }
      init.body = params;
    } else if (contentType.includes("application/json") && typeof request.body === "object") {
      init.body = JSON.stringify(request.body);
    } else if (typeof request.body === "string") {
      init.body = request.body;
    }
  }

  return new Request(url, init);
}

async function writeWebResponse(reply: FastifyReply, authResponse: Response): Promise<void> {
  reply.code(authResponse.status);

  const setCookie = authResponse.headers.getSetCookie();
  if (setCookie.length > 0) {
    reply.header("set-cookie", setCookie);
  }

  for (const [key, value] of authResponse.headers.entries()) {
    if (key.toLowerCase() === "set-cookie") {
      continue;
    }
    reply.header(key, value);
  }

  const contentType = authResponse.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const payload = await authResponse.json();
    reply.send(payload);
    return;
  }

  const arrayBuffer = await authResponse.arrayBuffer();
  reply.send(Buffer.from(arrayBuffer));
}

function createAuthHandler() {
  const providers = buildProviders();

  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (providers.length === 0) {
      reply.code(503).send({
        message: "No OAuth providers configured. Set GitHub and/or Google credentials.",
      });
      return;
    }

    let db;
    try {
      db = getDb();
    } catch (error) {
      reply.code(503).send({
        message: "DATABASE_URL is required for authentication.",
        detail: error instanceof Error ? error.message : "Unknown error",
      });
      return;
    }

    const webRequest = toWebRequest(request);

    const authResponse = await Auth(webRequest, {
      adapter: DrizzleAdapter(db, {
        usersTable: users,
        accountsTable: accounts,
        sessionsTable: sessions,
        verificationTokensTable: verificationTokens,
      }),
      providers,
      session: {
        strategy: "database",
      },
      trustHost: true,
      secret: env.AUTH_SECRET,
      basePath: "/api/auth",
    });

    await writeWebResponse(reply, authResponse);
  };
}

export function registerAuthRoutes(app: FastifyInstance): void {
  const authHandler = createAuthHandler();

  app.post("/api/auth/register", async (request, reply) => {
    const parsed = credentialsSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: parsed.error.flatten() });
    }

    const normalizedEmail = parsed.data.email.trim().toLowerCase();
    const normalizedUsername = parsed.data.username.trim().toLowerCase();

    const db = getDb();
    const existing = await db.query.users.findFirst({
      where: (usersTable, { or, eq }) =>
        or(eq(usersTable.email, normalizedEmail), eq(usersTable.username, normalizedUsername)),
    });

    if (existing) {
      return reply.code(409).send({ message: "Email or username already exists" });
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);

    const [user] = await db
      .insert(users)
      .values({
        email: normalizedEmail,
        username: normalizedUsername,
        name: parsed.data.username,
        timezone: parsed.data.timezone ?? "UTC",
        passwordHash,
      })
      .returning();

    const session = await createDatabaseSession(user.id);
    setSessionCookie(reply, session.token, isSecureRequest(request), session.expires);

    return reply.code(201).send({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        timezone: user.timezone,
      },
    });
  });

  app.post("/api/auth/login", async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: parsed.error.flatten() });
    }

    const normalizedIdentifier = parsed.data.identifier.trim().toLowerCase();
    const db = getDb();
    const user = await db.query.users.findFirst({
      where: (usersTable, { or, eq }) =>
        or(eq(usersTable.email, normalizedIdentifier), eq(usersTable.username, normalizedIdentifier)),
    });

    if (!user || !user.passwordHash) {
      return reply.code(401).send({ message: "Invalid credentials" });
    }

    const validPassword = await bcrypt.compare(parsed.data.password, user.passwordHash);
    if (!validPassword) {
      return reply.code(401).send({ message: "Invalid credentials" });
    }

    const session = await createDatabaseSession(user.id);
    setSessionCookie(reply, session.token, isSecureRequest(request), session.expires);

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        timezone: user.timezone,
      },
    };
  });

  app.post("/api/auth/logout", async (request, reply) => {
    const cookieHeader = request.headers.cookie;
    if (cookieHeader) {
      const cookies = parseCookie(cookieHeader);
      const sessionToken = cookies["authjs.session-token"] ?? cookies["__Secure-authjs.session-token"];

      if (sessionToken) {
        const db = getDb();
        await db.delete(sessions).where(eq(sessions.sessionToken, sessionToken));
      }
    }

    clearSessionCookie(reply, isSecureRequest(request));
    return reply.code(204).send();
  });

  app.route({
    method: ["GET", "POST"],
    url: "/api/auth/*",
    handler: authHandler,
  });
}

export async function getRequestUser(request: FastifyRequest) {
  const cookieHeader = request.headers.cookie;
  if (!cookieHeader) {
    return null;
  }

  const cookies = parseCookie(cookieHeader);
  const sessionToken = cookies["authjs.session-token"] ?? cookies["__Secure-authjs.session-token"];

  if (!sessionToken) {
    return null;
  }

  const db = getDb();

  const session = await db.query.sessions.findFirst({
    where: (sessionsTable, { and, eq, gt }) =>
      and(eq(sessionsTable.sessionToken, sessionToken), gt(sessionsTable.expires, new Date())),
  });

  if (!session) {
    return null;
  }

  const user = await db.query.users.findFirst({
    where: (usersTable, { eq }) => eq(usersTable.id, session.userId),
  });

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    username: user.username,
    name: user.name,
    image: user.image,
    timezone: user.timezone,
  };
}
