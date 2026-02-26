# Daily Notes

A daily note taking app that behaves like one long reverse-chronological sheet.

## Stack

- TanStack Router + React + Vite
- Fastify API (single domain)
- Drizzle ORM + PostgreSQL
- Tailwind CSS + shadcn/ui base setup
- Railway hosting (`app`, `postgres`, `minio`)

## Workspace

- `apps/app`: frontend + API runtime
- `packages/db`: Drizzle schema and DB client

## Getting started

1. `pnpm install`
2. `cp .env.example .env`
3. `pnpm dev`

## Current scaffold status

- Basic TanStack app shell is wired.
- Fastify `/api/health` route is wired.
- Auth.js OAuth scaffold is wired at `/api/auth/*` (GitHub + Google, DB sessions).
- Session-aware endpoint is available at `/api/me`.
- Notes APIs are wired (`/api/threads`, `/api/threads/:id/entries`, backfill, thread search).
- Drizzle schema includes auth + thread + daily entry + attachment tables.
- AI context docs are added in `docs/ai/` and `AGENTS.md`.

## API endpoints (MVP scaffold)

- `GET /api/threads`
- `POST /api/threads`
- `PATCH /api/threads/:threadId`
- `GET /api/threads/:threadId/entries?limit=30&offset=0`
- `PUT /api/threads/:threadId/entries/:localDate`
- `POST /api/threads/:threadId/entries/backfill`
- `GET /api/threads/:threadId/search?q=query`

## OAuth local setup

- Homepage URL: `http://localhost:4004`
- GitHub callback: `http://localhost:4004/api/auth/callback/github`
- Google callback: `http://localhost:4004/api/auth/callback/google`

Never commit real OAuth secrets to git. Keep them only in local `.env` and Railway variables.
