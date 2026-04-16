import { useState } from "react";

import { Button } from "@/web/components/ui/button";
import { useLogout } from "@/web/features/auth/hooks";
import { blankDoc } from "@/web/features/editor/document";
import { useActiveEntry } from "@/web/features/entries/active-entry-context";
import { useBackfillEntry } from "@/web/features/entries/hooks";

import { useCreateThread } from "./hooks";
import { useThreads } from "./threads-context";

export function ThreadSidebar() {
  const { threads, selectedThreadId, selectThread } = useThreads();
  const { setActiveEntryId } = useActiveEntry();

  const [newThreadTitle, setNewThreadTitle] = useState("");
  const [backfillDate, setBackfillDate] = useState("");

  const createThread = useCreateThread();
  const backfillEntry = useBackfillEntry();
  const logout = useLogout();

  const createThreadError =
    createThread.isError && createThread.error instanceof Error
      ? createThread.error.message
      : null;
  const backfillError =
    backfillEntry.isError && backfillEntry.error instanceof Error
      ? backfillEntry.error.message
      : null;

  const handleCreateThread = () => {
    const title = newThreadTitle.trim();
    if (!title) {
      return;
    }

    createThread.mutate(title, {
      onSuccess: (payload) => {
        setNewThreadTitle("");
        selectThread(payload.thread.id);
      },
    });
  };

  const handleBackfill = () => {
    if (!selectedThreadId || !backfillDate) {
      return;
    }

    backfillEntry.mutate(
      {
        threadId: selectedThreadId,
        localDate: backfillDate,
        contentJson: blankDoc,
      },
      {
        onSuccess: (payload) => {
          setBackfillDate("");
          setActiveEntryId(payload.entry.id);
        },
      },
    );
  };

  return (
    <aside className="space-y-4 rounded-lg border border-border bg-card p-4">
      <h2 className="text-sm font-semibold">Threads</h2>

      <div className="space-y-2">
        <input
          value={newThreadTitle}
          onChange={(event) => setNewThreadTitle(event.target.value)}
          placeholder="New thread title"
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
        />
        <Button
          className="w-full"
          disabled={createThread.isPending || !newThreadTitle.trim()}
          onClick={handleCreateThread}
        >
          {createThread.isPending ? "Creating..." : "Create Thread"}
        </Button>
        {createThreadError ? (
          <p className="text-xs text-destructive">{createThreadError}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        {threads.map((thread) => {
          const isSelected = thread.id === selectedThreadId;
          return (
            <button
              key={thread.id}
              type="button"
              onClick={() => selectThread(thread.id)}
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
          onChange={(event) => setBackfillDate(event.target.value)}
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
        />
        <Button
          className="w-full"
          variant="outline"
          disabled={!selectedThreadId || backfillEntry.isPending || !backfillDate}
          onClick={handleBackfill}
        >
          {backfillEntry.isPending ? "Adding..." : "Add Missed Day"}
        </Button>
        {backfillError ? (
          <p className="text-xs text-destructive">{backfillError}</p>
        ) : null}
      </div>

      <Button className="w-full" variant="outline" onClick={() => logout.mutate()}>
        {logout.isPending ? "Signing out..." : "Sign Out"}
      </Button>
    </aside>
  );
}
