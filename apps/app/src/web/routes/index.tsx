import { useEffect, useMemo, useRef, useState } from "react";
import { createRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Button } from "@/web/components/ui/button";
import { apiFetch, getApiBase } from "@/web/lib/api";
import { rootRoute } from "@/web/routes/__root";

type User = {
  id: string;
  email: string;
  username?: string | null;
  name: string | null;
  image: string | null;
  timezone: string;
};

type Thread = {
  id: string;
  title: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
};

type DailyEntry = {
  id: string;
  threadId: string;
  localDate: string;
  contentJson: unknown;
  contentText: string;
  contentMarkdown: string;
  createdAt: string;
  updatedAt: string;
};

const blankDoc = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

function todayLocalDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function buildDocFromPlainText(value: string) {
  if (!value.trim()) {
    return blankDoc;
  }

  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: value }],
      },
    ],
  };
}

function formatDateHeading(localDate: string): string {
  const [year, month, day] = localDate.split("-").map((part) => Number(part));
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function fingerprint(value: unknown): string {
  return JSON.stringify(value);
}

type RichEditorProps = {
  initialContent: unknown;
  autofocus?: boolean;
  onContentChange: (contentJson: unknown) => void;
};

function RichEditor({ initialContent, autofocus, onContentChange }: RichEditorProps) {
  const [isFocused, setIsFocused] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
      }),
      Image,
      Placeholder.configure({
        placeholder: "Write your notes...",
      }),
    ],
    editorProps: {
      attributes: {
        class: "note-editor prose prose-sm max-w-none focus:outline-none",
      },
    },
    content: initialContent as any,
    autofocus,
    onFocus: () => setIsFocused(true),
    onBlur: () => setIsFocused(false),
    onUpdate: ({ editor: currentEditor }) => {
      onContentChange(currentEditor.getJSON());
    },
  });

  useEffect(() => {
    if (!editor) {
      return;
    }
    editor.commands.setContent(initialContent as never);
  }, [editor, initialContent]);

  if (!editor) {
    return <div className="text-xs text-muted-foreground">Loading editor...</div>;
  }

  const applyLink = () => {
    const current = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Enter URL", current ?? "https://");
    if (!url) {
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const addImage = () => {
    const src = window.prompt("Image URL");
    if (!src) {
      return;
    }
    editor.chain().focus().setImage({ src }).run();
  };

  return (
    <div className="rounded-md border border-border bg-card/80">
      <EditorContent editor={editor} className="min-h-28 px-3 py-2 text-sm text-foreground" />

      {isFocused ? (
        <>
          <div className="hidden items-center gap-1 border-t border-border px-2 py-2 md:flex">
            <ToolbarButton active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} label="B" />
            <ToolbarButton active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} label="I" />
            <ToolbarButton active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()} label="Code" />
            <ToolbarButton active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} label="H1" />
            <ToolbarButton active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} label="List" />
            <ToolbarButton active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} label="1." />
            <ToolbarButton active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} label="Quote" />
            <ToolbarButton active={editor.isActive("link")} onClick={applyLink} label="Link" />
            <ToolbarButton active={false} onClick={addImage} label="Image" />
          </div>

          <div className="fixed inset-x-0 bottom-0 z-20 border-t border-zinc-300 bg-white px-2 py-2 md:hidden">
            <div className="mx-auto flex max-w-md items-center gap-1 overflow-x-auto">
              <ToolbarButton active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} label="B" />
              <ToolbarButton active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} label="I" />
              <ToolbarButton active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} label="H1" />
              <ToolbarButton active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} label="List" />
              <ToolbarButton active={editor.isActive("link")} onClick={applyLink} label="Link" />
              <ToolbarButton active={false} onClick={addImage} label="Image" />
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function ToolbarButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onMouseDown={(event) => {
        event.preventDefault();
        onClick();
      }}
      className={`rounded px-2 py-1 text-xs ${
        active ? "bg-zinc-900 text-zinc-50" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
      }`}
    >
      {label}
    </button>
  );
}

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
});

function HomePage() {
  const queryClient = useQueryClient();
  const [newThreadTitle, setNewThreadTitle] = useState("");
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [entryDate, setEntryDate] = useState(todayLocalDate());
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [activeContentJson, setActiveContentJson] = useState<unknown>(blankDoc);
  const [lastSavedByEntryId, setLastSavedByEntryId] = useState<Record<string, string>>({});
  const [backfillDate, setBackfillDate] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const apiBase = getApiBase();

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
    queryFn: () => apiFetch<{ entries: DailyEntry[] }>(`/api/threads/${selectedThreadId}/entries?limit=2000&offset=0`),
    enabled: Boolean(selectedThreadId) && isAuthenticated,
  });

  const entries = entriesQuery.data?.entries ?? [];

  const activeEntry = useMemo(() => entries.find((entry) => entry.id === activeEntryId) ?? null, [entries, activeEntryId]);

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
    mutationFn: async (input: { threadId: string; localDate: string; contentJson: unknown }) => {
      return apiFetch<{ entry: DailyEntry }>(`/api/threads/${input.threadId}/entries/${input.localDate}`, {
        method: "PUT",
        body: JSON.stringify({
          contentJson: input.contentJson,
        }),
      });
    },
    onSuccess: (payload) => {
      setStatusMessage(`Saved ${payload.entry.localDate}`);
      setLastSavedByEntryId((previous) => ({
        ...previous,
        [payload.entry.id]: fingerprint(payload.entry.contentJson),
      }));
      queryClient.setQueryData<{ entries: DailyEntry[] }>(["entries", selectedThreadId], (previous) => {
        if (!previous) {
          return previous;
        }

        const updated = previous.entries.some((entry) => entry.id === payload.entry.id)
          ? previous.entries.map((entry) => (entry.id === payload.entry.id ? payload.entry : entry))
          : [payload.entry, ...previous.entries];

        updated.sort((a, b) => (a.localDate > b.localDate ? -1 : a.localDate < b.localDate ? 1 : 0));
        return { entries: updated };
      });
    },
    onError: (error) => {
      setStatusMessage(error instanceof Error ? error.message : "Failed to save entry");
    },
  });

  const createTodayMutation = useMutation({
    mutationFn: async (threadId: string) => {
      const localDate = todayLocalDate();
      return apiFetch<{ entry: DailyEntry }>(`/api/threads/${threadId}/entries/${localDate}`, {
        method: "PUT",
        body: JSON.stringify({
          contentJson: blankDoc,
        }),
      });
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

      return apiFetch<{ entry: DailyEntry }>(`/api/threads/${selectedThreadId}/entries/backfill`, {
        method: "POST",
        body: JSON.stringify({
          localDate: backfillDate,
          contentJson: blankDoc,
        }),
      });
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

  const listRef = useRef<HTMLDivElement | null>(null);
  const rowVirtualizer = useVirtualizer({
    count: entries.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => 280,
    overscan: 6,
  });

  if (meQuery.isLoading) {
    return <div className="text-sm text-muted-foreground">Checking session...</div>;
  }

  if (!isAuthenticated) {
    return (
      <section className="space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight">Daily Notes</h1>
        <p className="text-sm text-muted-foreground">Sign in with GitHub or use username/password.</p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => window.location.assign(`${apiBase}/api/auth/signin/github`)}>Continue with GitHub</Button>
          <Button variant="outline" onClick={() => window.open(`${apiBase}/api/health`, "_blank")}>API Health</Button>
        </div>

        <div className="max-w-md space-y-3 rounded-lg border border-border bg-card p-4">
          <div className="flex gap-2">
            <Button variant={authMode === "login" ? "default" : "outline"} onClick={() => setAuthMode("login")}>
              Login
            </Button>
            <Button variant={authMode === "register" ? "default" : "outline"} onClick={() => setAuthMode("register")}>
              Register
            </Button>
          </div>

          {authMode === "register" ? (
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Username"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
          ) : null}

          <input
            value={authMode === "login" ? identifier : email}
            onChange={(event) => {
              if (authMode === "login") {
                setIdentifier(event.target.value);
              } else {
                setEmail(event.target.value);
              }
            }}
            placeholder={authMode === "login" ? "Email or username" : "Email"}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
          <Button
            disabled={credentialAuthMutation.isPending}
            onClick={() => credentialAuthMutation.mutate()}
            className="w-full"
          >
            {credentialAuthMutation.isPending
              ? authMode === "login"
                ? "Logging in..."
                : "Creating account..."
              : authMode === "login"
                ? "Login"
                : "Create Account"}
          </Button>
        </div>

        {statusMessage ? <p className="text-xs text-muted-foreground">{statusMessage}</p> : null}
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Thread Workspace</h1>
        <p className="text-sm text-muted-foreground">
          Signed in as <span className="font-medium text-foreground">{meQuery.data.user.email}</span>
          {meQuery.data.user.username ? ` (${meQuery.data.user.username})` : ""}.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-[260px_1fr]">
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
              disabled={createThreadMutation.isPending || !newThreadTitle.trim()}
              onClick={() => createThreadMutation.mutate()}
            >
              {createThreadMutation.isPending ? "Creating..." : "Create Thread"}
            </Button>
          </div>

          <div className="space-y-2">
            {threads.map((thread) => {
              const isSelected = thread.id === selectedThreadId;
              return (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => setSelectedThreadId(thread.id)}
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

            {threads.length === 0 && <p className="text-xs text-muted-foreground">No threads yet. Create one to start writing.</p>}
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
              disabled={!selectedThreadId || backfillMutation.isPending || !backfillDate}
              onClick={() => backfillMutation.mutate()}
            >
              {backfillMutation.isPending ? "Adding..." : "Add Missed Day"}
            </Button>
          </div>

          <Button className="w-full" variant="outline" onClick={() => logoutMutation.mutate()}>
            {logoutMutation.isPending ? "Signing out..." : "Sign Out"}
          </Button>
        </aside>

        <div className="rounded-lg border border-border bg-card/80 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Running Thread</h2>
            {statusMessage ? <p className="text-xs text-muted-foreground">{statusMessage}</p> : null}
          </div>

          {entriesQuery.isLoading ? <p className="text-xs text-muted-foreground">Loading entries...</p> : null}

          <div ref={listRef} className="h-[70vh] overflow-auto rounded-md border border-border bg-background px-4 py-4">
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: "100%",
                position: "relative",
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const entry = entries[virtualRow.index];
                if (!entry) {
                  return null;
                }

                const isActive = entry.id === activeEntryId;

                return (
                  <div
                    key={entry.id}
                    ref={(element) => {
                      if (element) {
                        rowVirtualizer.measureElement(element);
                      }
                    }}
                    data-index={virtualRow.index}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                    className="pb-4"
                  >
                    <article className="rounded-xl border border-border bg-card/80 px-5 py-5">
                      <h3 className="text-3xl tracking-tight">{formatDateHeading(entry.localDate)}</h3>

                      <div className="mt-3 text-sm leading-6 text-foreground [font-family:Georgia,serif]">
                        {isActive ? (
                          <RichEditor
                            initialContent={activeContentJson}
                            autofocus
                            onContentChange={(nextContent) => {
                              setActiveContentJson(nextContent);
                              setEntryDate(entry.localDate);
                            }}
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveEntryId(entry.id);
                              setActiveContentJson(entry.contentJson ?? buildDocFromPlainText(entry.contentText ?? ""));
                            }}
                            className="w-full text-left"
                          >
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{entry.contentMarkdown || entry.contentText || ""}</ReactMarkdown>
                            <div className="mt-4 h-8 rounded-md border border-dashed border-border/60" />
                          </button>
                        )}
                      </div>
                    </article>
                  </div>
                );
              })}
            </div>
          </div>

          {entries.length === 0 && !entriesQuery.isLoading ? (
            <p className="mt-3 text-xs text-muted-foreground">No entries yet. Opening a thread auto-creates today's entry.</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
