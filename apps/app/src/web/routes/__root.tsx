import { Link, Outlet, createRootRoute } from "@tanstack/react-router";
import { useTheme } from "@/web/lib/theme-provider";

export const rootRoute = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  const { mode, setMode } = useTheme();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/80 bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-sm font-semibold tracking-tight">
              Daily Notes
            </Link>
            <span className="hidden text-xs text-muted-foreground sm:inline">
              TanStack + Fastify + Railway
            </span>
          </div>

          <div className="inline-flex items-center gap-2">
            <div
              className="inline-flex rounded-full border border-border bg-background text-xs"
              role="tablist"
              aria-label="Theme"
            >
              {(["system", "light", "dark"] as const).map((value) => {
                const isActive = mode === value;
                const label =
                  value === "system" ? "System" : value === "light" ? "Light" : "Dark";
                return (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    className={[
                      "px-3 py-1 first:rounded-l-full last:rounded-r-full transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    ].join(" ")}
                    onClick={() => setMode(value)}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
