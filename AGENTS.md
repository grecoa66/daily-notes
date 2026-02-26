# Daily Notes Agent Context

## Inherited global rule

- You are operating in an environment where `ast-grep` is installed. For any code search that requires understanding of syntax or code structure, default to `ast-grep --lang [language] -p '<pattern>'`. Avoid text-only search tools unless plain-text search is explicitly requested.

## Project architecture

- Monorepo with pnpm workspaces.
- `apps/app`: single-domain runtime serving both UI and API.
- `packages/db`: Drizzle schema/client and migrations.
- Deployment target: Railway only (`app`, `postgres`, `minio`).

## Product invariants

- A thread is a reverse-chronological timeline of daily entries.
- Daily entries are unique per `(thread_id, local_date)`.
- New daily entries are created lazily when the user interacts that day.
- Users can backfill missed dates manually.
- User timezone is authoritative and stored in DB (`users.timezone`).
- Temporal API semantics should drive date calculations.

## Content invariants

- Editor is rich text with markdown-friendly authoring.
- Canonical persisted content is editor JSON.
- Server derives and persists plain text and markdown on each write.
- Search is plain-text only in MVP.

## Auth and access

- Auth.js with GitHub and Google OAuth.
- Open signup.
- Allow linking multiple OAuth providers to one user.
- Use database-backed sessions.

## Upload constraints

- Use MinIO (S3-compatible) hosted in Railway.
- Allowlist formats in MVP: `image/jpeg`, `image/png`, `image/webp`, `image/heic`, `application/pdf`, `text/plain`, `text/markdown`, `text/csv`, `application/zip`.
- Enforce file size and user quota limits.

## Coding conventions

- TypeScript first.
- Validate API boundaries with Zod.
- Avoid silent fallback logic for date/auth/storage failures.
- Keep route handlers thin and move core logic to services as complexity grows.
