# Developer Workflows

## Local setup

1. Install dependencies: `pnpm install`
2. Copy env template: `cp .env.example .env`
3. Run app + API: `pnpm dev`

## Type safety

- Run `pnpm typecheck` before committing.

## Database

- Drizzle schema lives in `packages/db/src/schema.ts`.
- Migration config is `packages/db/drizzle.config.ts`.

## Deployment

- Target Railway services: `app`, `postgres`, `minio`.
- Keep API and frontend on one public domain with `/api/*` routes.
