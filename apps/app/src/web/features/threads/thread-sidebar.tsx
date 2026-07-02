import { useState } from "react";

import { Button } from "@/web/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/web/components/ui/card";
import { Input } from "@/web/components/ui/input";
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
    if (!title) return;
    createThread.mutate(title, {
      onSuccess: (payload) => {
        setNewThreadTitle("");
        selectThread(payload.thread.id);
      },
    });
  };

  const handleBackfill = () => {
    if (!selectedThreadId || !backfillDate) return;
    backfillEntry.mutate(
      { threadId: selectedThreadId, localDate: backfillDate, contentJson: blankDoc },
      {
        onSuccess: (payload) => {
          setBackfillDate("");
          setActiveEntryId(payload.entry.id);
        },
      },
    );
  };

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle className="text-sm uppercase tracking-widest text-muted-foreground">
          Threads
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {/* Thread list */}
        <div className="flex flex-col gap-1">
          {threads.map((thread) => {
            const isSelected = thread.id === selectedThreadId;
            return (
              <button
                key={thread.id}
                type="button"
                onClick={() => selectThread(thread.id)}
                className={[
                  "w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-foreground hover:bg-accent hover:text-accent-foreground",
                ].join(" ")}
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

        {/* New thread */}
        <div className="flex flex-col gap-2 border-t border-border pt-3">
          <p className="text-xs font-medium text-muted-foreground">New thread</p>
          <Input
            value={newThreadTitle}
            onChange={(event) => setNewThreadTitle(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter") handleCreateThread(); }}
            placeholder="Thread title"
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

        {/* Backfill */}
        <div className="flex flex-col gap-2 border-t border-border pt-3">
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
      </CardContent>

      <CardFooter className="mt-auto">
        <Button className="w-full" variant="outline" onClick={() => logout.mutate()}>
          {logout.isPending ? "Signing out..." : "Sign Out"}
        </Button>
      </CardFooter>
    </Card>
  );
}
