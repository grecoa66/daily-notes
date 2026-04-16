import { useEffect, useMemo, useState } from "react";
import { createRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { AuthScreen, type AuthMode } from "@/web/features/auth/auth-screen";
import type { User } from "@/web/features/auth/types";
import { EntryList } from "@/web/features/entries/entry-list";
import type { DailyEntry } from "@/web/features/entries/types";
import { blankDoc, buildDocFromPlainText } from "@/web/features/editor/document";
import { ThreadSidebar } from "@/web/features/threads/thread-sidebar";
import type { Thread } from "@/web/features/threads/types";
import { apiFetch } from "@/web/lib/api";
import { todayLocalDate } from "@/web/lib/dates";
import { fingerprint } from "@/web/lib/fingerprint";
import { rootRoute } from "@/web/routes/__root";

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
});

function HomePage() {
  const queryClient = useQueryClient();
  const [newThreadTitle, setNewThreadTitle] = useState("");
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [activeContentJson, setActiveContentJson] = useState<unknown>(blankDoc);
  const [lastSavedByEntryId, setLastSavedByEntryId] = useState<Record<string, string>>({});
  const [backfillDate, setBackfillDate] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");

  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: () => apiFetch<{ user: User }>("/api/me"),
    retry: false,
  });

  const isAuthenticated = meQuery.status === "success";

  const threadsQuery = useQuery({
    queryKey: ["threads"],
    queryFn: () => apiFetch<{ threads: Thread[] }>("/api/threads"),
    enabled: isAuthenticated,
  });

  const threads = threadsQuery.data?.threads ?? [];

  useEffect(() => {
    if (!selectedThreadId && threads.length > 0) {
      setSelectedThreadId(threads[0]!.id);
    }
  }, [selectedThreadId, threads]);

  const entriesQuery = useQuery({
    queryKey: ["entries", selectedThreadId],
    queryFn: () =>
      apiFetch<{ entries: DailyEntry[] }>(
        `/api/threads/${selectedThreadId}/entries?limit=2000&offset=0`,
      ),
    enabled: Boolean(selectedThreadId) && isAuthenticated,
  });

  const entries = entriesQuery.data?.entries ?? [];

  const activeEntry = useMemo(
    () => entries.find((entry) => entry.id === activeEntryId) ?? null,
    [entries, activeEntryId],
  );

  useEffect(() => {
    const map: Record<string, string> = {};
    for (const entry of entries) {
      map[entry.id] = fingerprint(entry.contentJson);
    }
    setLastSavedByEntryId(map);
  }, [entries]);

  useEffect(() => {
    if (!activeEntry) {
      return;
    }
    setActiveContentJson(activeEntry.contentJson ?? blankDoc);
  }, [activeEntry]);

  const createThreadMutation = useMutation({
    mutationFn: async () => {
      return apiFetch<{ thread: Thread }>("/api/threads", {
        method: "POST",
        body: JSON.stringify({ title: newThreadTitle }),
      });
    },
    onSuccess: async (payload) => {
      setNewThreadTitle("");
      setSelectedThreadId(payload.thread.id);
      setStatusMessage(`Created thread: ${payload.thread.title}`);
      await queryClient.invalidateQueries({ queryKey: ["threads"] });
    },
    onError: (error) => {
      setStatusMessage(error instanceof Error ? error.message : "Failed to create thread");
    },
  });

  const saveEntryMutation = useMutation({
    mutationFn: async (input: {
      threadId: string;
      localDate: string;
      contentJson: unknown;
    }) => {
      return apiFetch<{ entry: DailyEntry }>(
        `/api/threads/${input.threadId}/entries/${input.localDate}`,
        {
          method: "PUT",
          body: JSON.stringify({
            contentJson: input.contentJson,
          }),
        },
      );
    },
    onSuccess: (payload) => {
      setStatusMessage(`Saved ${payload.entry.localDate}`);
      setLastSavedByEntryId((previous) => ({
        ...previous,
        [payload.entry.id]: fingerprint(payload.entry.contentJson),
      }));
      queryClient.setQueryData<{ entries: DailyEntry[] }>(
        ["entries", selectedThreadId],
        (previous) => {
          if (!previous) {
            return previous;
          }

          const updated = previous.entries.some((entry) => entry.id === payload.entry.id)
            ? previous.entries.map((entry) =>
                entry.id === payload.entry.id ? payload.entry : entry,
              )
            : [payload.entry, ...previous.entries];

          updated.sort((a, b) =>
            a.localDate > b.localDate ? -1 : a.localDate < b.localDate ? 1 : 0,
          );
          return { entries: updated };
        },
      );
    },
    onError: (error) => {
      setStatusMessage(error instanceof Error ? error.message : "Failed to save entry");
    },
  });

  const createTodayMutation = useMutation({
    mutationFn: async (threadId: string) => {
      const localDate = todayLocalDate();
      return apiFetch<{ entry: DailyEntry }>(
        `/api/threads/${threadId}/entries/${localDate}`,
        {
          method: "PUT",
          body: JSON.stringify({
            contentJson: blankDoc,
          }),
        },
      );
    },
    onSuccess: async (payload) => {
      setActiveEntryId(payload.entry.id);
      setActiveContentJson(payload.entry.contentJson);
      await queryClient.invalidateQueries({ queryKey: ["entries", selectedThreadId] });
    },
  });

  const backfillMutation = useMutation({
    mutationFn: async () => {
      if (!selectedThreadId) {
        throw new Error("Select a thread first");
      }

      if (!backfillDate) {
        throw new Error("Pick a date first");
      }

      return apiFetch<{ entry: DailyEntry }>(
        `/api/threads/${selectedThreadId}/entries/backfill`,
        {
          method: "POST",
          body: JSON.stringify({
            localDate: backfillDate,
            contentJson: blankDoc,
          }),
        },
      );
    },
    onSuccess: async (payload) => {
      setStatusMessage(`Backfilled ${payload.entry.localDate}`);
      setBackfillDate("");
      await queryClient.invalidateQueries({ queryKey: ["entries", selectedThreadId] });
      await queryClient.invalidateQueries({ queryKey: ["threads"] });
      setActiveEntryId(payload.entry.id);
    },
    onError: (error) => {
      setStatusMessage(error instanceof Error ? error.message : "Failed to backfill entry");
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => apiFetch<void>("/api/auth/logout", { method: "POST" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      setSelectedThreadId(null);
      setActiveEntryId(null);
    },
  });

  const credentialAuthMutation = useMutation({
    mutationFn: async () => {
      if (authMode === "login") {
        return apiFetch<{ user: User }>("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ identifier, password }),
        });
      }

      return apiFetch<{ user: User }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          username,
          email,
          password,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });
    },
    onSuccess: async () => {
      setStatusMessage(authMode === "login" ? "Logged in" : "Account created");
      await queryClient.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (error) => {
      setStatusMessage(error instanceof Error ? error.message : "Authentication failed");
    },
  });

  useEffect(() => {
    if (!selectedThreadId || entriesQuery.isLoading || createTodayMutation.isPending) {
      return;
    }

    const today = todayLocalDate();
    const todayEntry = entries.find((entry) => entry.localDate === today);

    if (!todayEntry) {
      createTodayMutation.mutate(selectedThreadId);
      return;
    }

    if (!activeEntryId) {
      setActiveEntryId(todayEntry.id);
    }
  }, [selectedThreadId, entries, entriesQuery.isLoading, activeEntryId, createTodayMutation]);

  useEffect(() => {
    if (!selectedThreadId || !activeEntry) {
      return;
    }

    const nextFingerprint = fingerprint(activeContentJson);
    const lastSaved = lastSavedByEntryId[activeEntry.id];

    if (nextFingerprint === lastSaved) {
      return;
    }

    const timer = window.setTimeout(() => {
      saveEntryMutation.mutate({
        threadId: selectedThreadId,
        localDate: activeEntry.localDate,
        contentJson: activeContentJson,
      });
    }, 1200);

    return () => {
      window.clearTimeout(timer);
    };
  }, [activeContentJson, activeEntry, selectedThreadId, saveEntryMutation, lastSavedByEntryId]);

  if (meQuery.isLoading) {
    return <div className="text-sm text-muted-foreground">Checking session...</div>;
  }

  if (!isAuthenticated) {
    return (
      <AuthScreen
        authMode={authMode}
        onAuthModeChange={setAuthMode}
        identifier={identifier}
        onIdentifierChange={setIdentifier}
        email={email}
        onEmailChange={setEmail}
        username={username}
        onUsernameChange={setUsername}
        password={password}
        onPasswordChange={setPassword}
        onSubmit={() => credentialAuthMutation.mutate()}
        isSubmitting={credentialAuthMutation.isPending}
        statusMessage={statusMessage}
      />
    );
  }

  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Thread Workspace</h1>
        <p className="text-sm text-muted-foreground">
          Signed in as{" "}
          <span className="font-medium text-foreground">{meQuery.data.user.email}</span>
          {meQuery.data.user.username ? ` (${meQuery.data.user.username})` : ""}.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-[260px_1fr]">
        <ThreadSidebar
          threads={threads}
          selectedThreadId={selectedThreadId}
          onSelectThread={setSelectedThreadId}
          newThreadTitle={newThreadTitle}
          onNewThreadTitleChange={setNewThreadTitle}
          onCreateThread={() => createThreadMutation.mutate()}
          isCreatingThread={createThreadMutation.isPending}
          backfillDate={backfillDate}
          onBackfillDateChange={setBackfillDate}
          onBackfill={() => backfillMutation.mutate()}
          isBackfilling={backfillMutation.isPending}
          onLogout={() => logoutMutation.mutate()}
          isLoggingOut={logoutMutation.isPending}
        />

        <EntryList
          entries={entries}
          isLoading={entriesQuery.isLoading}
          activeEntryId={activeEntryId}
          activeContentJson={activeContentJson}
          statusMessage={statusMessage}
          onActivateEntry={(entry) => {
            setActiveEntryId(entry.id);
            setActiveContentJson(
              entry.contentJson ?? buildDocFromPlainText(entry.contentText ?? ""),
            );
          }}
          onActiveContentChange={(_entry, nextContent) => {
            setActiveContentJson(nextContent);
          }}
        />
      </div>
    </section>
  );
}
