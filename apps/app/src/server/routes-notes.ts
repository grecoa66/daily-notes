import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";

import { dailyEntries, threads } from "@daily-notes/db";

import { getRequestUser } from "./auth.js";
import { deriveContent } from "./content.js";
import { getDb } from "./db.js";

const localDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

const createThreadBodySchema = z.object({
  title: z.string().min(1).max(200),
});

const updateThreadBodySchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    archived: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field is required");

const saveEntryBodySchema = z.object({
  contentJson: z.unknown(),
});

const backfillEntryBodySchema = z.object({
  localDate: localDateSchema,
  contentJson: z.unknown().optional(),
});

const threadParamsSchema = z.object({
  threadId: z.string().uuid(),
});

const threadEntryParamsSchema = z.object({
  threadId: z.string().uuid(),
  localDate: localDateSchema,
});

const entriesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(5000).default(2000),
  offset: z.coerce.number().int().min(0).default(0),
});

const searchQuerySchema = z.object({
  q: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

async function requireUser(request: FastifyRequest, reply: FastifyReply) {
  const user = await getRequestUser(request);

  if (!user) {
    reply.code(401).send({ message: "Unauthorized" });
    return null;
  }

  return user;
}

async function findThreadForUser(threadId: string, userId: string) {
  const db = getDb();
  return db.query.threads.findFirst({
    where: (threadsTable, { and, eq }) => and(eq(threadsTable.id, threadId), eq(threadsTable.userId, userId)),
  });
}

export function registerNotesRoutes(app: FastifyInstance): void {
  app.get("/api/threads", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const db = getDb();
    const rows = await db.query.threads.findMany({
      where: (threadsTable, { eq }) => eq(threadsTable.userId, user.id),
      orderBy: (threadsTable, { desc }) => [desc(threadsTable.updatedAt)],
    });

    return { threads: rows };
  });

  app.post("/api/threads", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const parsed = createThreadBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: parsed.error.flatten() });
    }

    const db = getDb();
    const [thread] = await db
      .insert(threads)
      .values({
        userId: user.id,
        title: parsed.data.title,
      })
      .returning();

    return reply.code(201).send({ thread });
  });

  app.patch("/api/threads/:threadId", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const params = threadParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({ message: params.error.flatten() });
    }

    const parsed = updateThreadBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: parsed.error.flatten() });
    }

    const existing = await findThreadForUser(params.data.threadId, user.id);
    if (!existing) {
      return reply.code(404).send({ message: "Thread not found" });
    }

    const db = getDb();
    const [thread] = await db
      .update(threads)
      .set({
        ...parsed.data,
      })
      .where(and(eq(threads.id, existing.id), eq(threads.userId, user.id)))
      .returning();

    return { thread };
  });

  app.get("/api/threads/:threadId/entries", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const params = threadParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({ message: params.error.flatten() });
    }

    const query = entriesQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.code(400).send({ message: query.error.flatten() });
    }

    const existing = await findThreadForUser(params.data.threadId, user.id);
    if (!existing) {
      return reply.code(404).send({ message: "Thread not found" });
    }

    const db = getDb();
    const entries = await db.query.dailyEntries.findMany({
      where: (entryTable, { and, eq }) => and(eq(entryTable.threadId, existing.id), eq(entryTable.userId, user.id)),
      orderBy: (entryTable, { desc }) => [desc(entryTable.localDate)],
      limit: query.data.limit,
      offset: query.data.offset,
    });

    return { entries };
  });

  app.put("/api/threads/:threadId/entries/:localDate", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const params = threadEntryParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({ message: params.error.flatten() });
    }

    const parsed = saveEntryBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: parsed.error.flatten() });
    }

    const existing = await findThreadForUser(params.data.threadId, user.id);
    if (!existing) {
      return reply.code(404).send({ message: "Thread not found" });
    }

    const derived = deriveContent(parsed.data.contentJson);
    const db = getDb();

    const [entry] = await db
      .insert(dailyEntries)
      .values({
        threadId: existing.id,
        userId: user.id,
        localDate: params.data.localDate,
        contentJson: derived.contentJson,
        contentText: derived.contentText,
        contentMarkdown: derived.contentMarkdown,
      })
      .onConflictDoUpdate({
        target: [dailyEntries.threadId, dailyEntries.localDate],
        set: {
          contentJson: derived.contentJson,
          contentText: derived.contentText,
          contentMarkdown: derived.contentMarkdown,
          updatedAt: new Date(),
        },
      })
      .returning();

    await db.update(threads).set({ updatedAt: new Date() }).where(eq(threads.id, existing.id));

    return { entry };
  });

  app.post("/api/threads/:threadId/entries/backfill", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const params = threadParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({ message: params.error.flatten() });
    }

    const parsed = backfillEntryBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: parsed.error.flatten() });
    }

    const existing = await findThreadForUser(params.data.threadId, user.id);
    if (!existing) {
      return reply.code(404).send({ message: "Thread not found" });
    }

    const derived = deriveContent(
      parsed.data.contentJson ?? {
        type: "doc",
        content: [{ type: "paragraph" }],
      },
    );

    const db = getDb();
    const [entry] = await db
      .insert(dailyEntries)
      .values({
        threadId: existing.id,
        userId: user.id,
        localDate: parsed.data.localDate,
        contentJson: derived.contentJson,
        contentText: derived.contentText,
        contentMarkdown: derived.contentMarkdown,
      })
      .onConflictDoNothing()
      .returning();

    if (!entry) {
      return reply.code(409).send({ message: "Entry already exists for that local date" });
    }

    await db.update(threads).set({ updatedAt: new Date() }).where(eq(threads.id, existing.id));

    return reply.code(201).send({ entry });
  });

  app.get("/api/threads/:threadId/search", async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) {
      return;
    }

    const params = threadParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({ message: params.error.flatten() });
    }

    const query = searchQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.code(400).send({ message: query.error.flatten() });
    }

    const existing = await findThreadForUser(params.data.threadId, user.id);
    if (!existing) {
      return reply.code(404).send({ message: "Thread not found" });
    }

    const db = getDb();
    const entries = await db.query.dailyEntries.findMany({
      where: (entryTable, { and, eq, ilike }) =>
        and(
          eq(entryTable.threadId, existing.id),
          eq(entryTable.userId, user.id),
          ilike(entryTable.contentText, `%${query.data.q}%`),
        ),
      orderBy: (entryTable, { desc }) => [desc(entryTable.localDate)],
      limit: query.data.limit,
    });

    return {
      query: query.data.q,
      entries,
    };
  });
}
