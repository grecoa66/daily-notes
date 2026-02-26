import { createRoute } from "@tanstack/react-router";

import { Button } from "@/web/components/ui/button";
import { rootRoute } from "@/web/routes/__root";

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
});

function HomePage() {
  const getApiHealthUrl = () => {
    if (window.location.hostname === "localhost" && window.location.port === "5173") {
      const apiOrigin = import.meta.env.VITE_API_ORIGIN ?? "http://localhost:4004";
      return `${apiOrigin}/api/health`;
    }

    return `${window.location.origin}/api/health`;
  };

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">Daily Notes foundation is live.</h1>
        <p className="max-w-2xl text-sm text-zinc-600">
          This scaffold includes a single-domain app shell, Fastify API, Tailwind, shadcn-ready setup,
          Temporal baseline, and Drizzle schema package.
        </p>
      </div>
      <div className="flex gap-3">
        <Button onClick={() => window.open(getApiHealthUrl(), "_blank")}>API Health</Button>
        <Button variant="outline" onClick={() => window.location.assign("/docs")}>Docs Next</Button>
      </div>
    </section>
  );
}
