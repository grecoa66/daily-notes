# Stack Decisions

- Frontend: TanStack Router + React + Vite + Tailwind + shadcn/ui.
- Backend: Fastify + Zod.
- Database: PostgreSQL with Drizzle ORM.
- Auth: Auth.js, providers GitHub and Google, database sessions.
- Storage: MinIO on Railway.
- Hosting: Railway single-domain app deployment.

## Why this stack

- Keeps one provider for deploy and storage while retaining PostgreSQL.
- Supports rich text editing with server-derived markdown/text fields.
- Minimizes CORS/session complexity by serving API and UI under one domain.
