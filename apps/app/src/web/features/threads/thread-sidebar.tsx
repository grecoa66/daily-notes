import { Button } from "@/web/components/ui/button";

import type { Thread } from "./types";

type ThreadSidebarProps = {
  threads: Thread[];
  selectedThreadId: string | null;
  onSelectThread: (threadId: string) => void;

  newThreadTitle: string;
  onNewThreadTitleChange: (value: string) => void;
  onCreateThread: () => void;
  isCreatingThread: boolean;

  backfillDate: string;
  onBackfillDateChange: (value: string) => void;
  onBackfill: () => void;
  isBackfilling: boolean;

  onLogout: () => void;
  isLoggingOut: boolean;
};

export function ThreadSidebar({
  threads,
  selectedThreadId,
  onSelectThread,
  newThreadTitle,
  onNewThreadTitleChange,
  onCreateThread,
  isCreatingThread,
  backfillDate,
  onBackfillDateChange,
  onBackfill,
  isBackfilling,
  onLogout,
  isLoggingOut,
}: ThreadSidebarProps) {
  return (
    <aside className="space-y-4 rounded-lg border border-border bg-card p-4">
      <h2 className="text-sm font-semibold">Threads</h2>

      <div className="space-y-2">
        <input
          value={newThreadTitle}
          onChange={(event) => onNewThreadTitleChange(event.target.value)}
          placeholder="New thread title"
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
        />
        <Button
          className="w-full"
          disabled={isCreatingThread || !newThreadTitle.trim()}
          onClick={onCreateThread}
        >
          {isCreatingThread ? "Creating..." : "Create Thread"}
        </Button>
      </div>

      <div className="space-y-2">
        {threads.map((thread) => {
          const isSelected = thread.id === selectedThreadId;
          return (
            <button
              key={thread.id}
              type="button"
              onClick={() => onSelectThread(thread.id)}
              className={`w-full rounded-md border px-3 py-2 text-left text-sm transition ${
                isSelected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              {thread.title}
            </button>
          );
        })}

        {threads.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No threads yet. Create one to start writing.
          </p>
        ) : null}
      </div>

      <div className="space-y-2 border-t border-border pt-3">
        <p className="text-xs font-medium text-muted-foreground">Backfill missed day</p>
        <input
          type="date"
          value={backfillDate}
          onChange={(event) => onBackfillDateChange(event.target.value)}
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
        />
        <Button
          className="w-full"
          variant="outline"
          disabled={!selectedThreadId || isBackfilling || !backfillDate}
          onClick={onBackfill}
        >
          {isBackfilling ? "Adding..." : "Add Missed Day"}
        </Button>
      </div>

      <Button className="w-full" variant="outline" onClick={onLogout}>
        {isLoggingOut ? "Signing out..." : "Sign Out"}
      </Button>
    </aside>
  );
}
