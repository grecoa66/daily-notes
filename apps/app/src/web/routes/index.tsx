import { createRoute } from "@tanstack/react-router";

import { AuthGate } from "@/web/features/auth/auth-gate";
import { WorkspaceHeader } from "@/web/features/auth/workspace-header";
import { ActiveEntryProvider } from "@/web/features/entries/active-entry-context";
import { EntryList } from "@/web/features/entries/entry-list";
import { ThreadSidebar } from "@/web/features/threads/thread-sidebar";
import { ThreadsProvider } from "@/web/features/threads/threads-context";
import { rootRoute } from "@/web/routes/__root";

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
});

function HomePage() {
  return (
    <AuthGate>
      <ThreadsProvider>
        <ActiveEntryProvider>
          <section className="space-y-6">
            <WorkspaceHeader />
            <div className="grid gap-6 md:grid-cols-[260px_1fr]">
              <ThreadSidebar />
              <EntryList />
            </div>
          </section>
        </ActiveEntryProvider>
      </ThreadsProvider>
    </AuthGate>
  );
}
