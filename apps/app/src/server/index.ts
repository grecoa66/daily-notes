import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";

import fastifyStatic from "@fastify/static";
import fastifyFormbody from "@fastify/formbody";
import Fastify from "fastify";

import { getRequestUser, registerAuthRoutes } from "./auth.js";
import { env } from "./env.js";
import { registerNotesRoutes } from "./routes-notes.js";

const app = Fastify({ logger: true });

app.register(fastifyFormbody);

registerAuthRoutes(app);
registerNotesRoutes(app);

app.get("/api/health", async () => {
  return {
    ok: true,
    service: "daily-notes-app",
    now: new Date().toISOString(),
  };
});

app.get("/api/me", async (request, reply) => {
  let user = null;
  try {
    user = await getRequestUser(request);
  } catch (error) {
    return reply.code(503).send({
      message: "Authentication database is not configured.",
      detail: error instanceof Error ? error.message : "Unknown error",
    });
  }

  if (!user) {
    return reply.code(401).send({ message: "Unauthorized" });
  }

  return { user };
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webDistPath = path.resolve(__dirname, "../web");
const indexHtmlPath = path.join(webDistPath, "index.html");

if (existsSync(webDistPath)) {
  app.register(fastifyStatic, {
    root: webDistPath,
    wildcard: false,
    prefix: "/",
    decorateReply: false,
  });
}

app.get("/*", async (_request, reply) => {
  const requestPath = _request.raw.url ?? "/";

  if (requestPath.startsWith("/api/")) {
    return reply.code(404).send({ message: "Not Found" });
  }

  try {
    const indexHtml = await fs.readFile(indexHtmlPath, "utf-8");
    reply.type("text/html").send(indexHtml);
  } catch {
    if (env.NODE_ENV === "development") {
      return reply.redirect(`http://localhost:5173${requestPath}`);
    }

    reply
      .code(503)
      .type("application/json")
      .send({ message: "Web bundle not found. Run `pnpm build` first." });
  }
});

const start = async (): Promise<void> => {
  try {
    await app.listen({ port: env.PORT, host: "0.0.0.0" });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

void start();
