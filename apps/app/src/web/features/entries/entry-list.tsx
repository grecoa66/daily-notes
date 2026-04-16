import { useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

import { blankDoc, buildDocFromPlainText } from "@/web/features/editor/document";
import { RenderedNote } from "@/web/features/editor/rendered-note";
import { RichEditor } from "@/web/features/editor/rich-editor";
import { useThreads } from "@/web/features/threads/threads-context";
import { formatDateHeading, todayLocalDate } from "@/web/lib/dates";
import { fingerprint } from "@/web/lib/fingerprint";

import { useActiveEntry } from "./active-entry-context";
import {
  useCreateTodayEntry,
  useEntriesQuery,
  useSaveEntry,
} from "./hooks";
import type { DailyEntry } from "./types";

const AUTOSAVE_DEBOUNCE_MS = 1200;

export function EntryList() {
  const { selectedThreadId, selectedThread } = useThreads();
  const { activeEntryId, setActiveEntryId } = useActiveEntry();

  const entriesQuery = useEntriesQuery(selectedThreadId, {
    enabled: Boolean(selectedThreadId),
  });
  const entries = entriesQuery.data?.entries ?? [];

  const [activeContentJson, setActiveContentJson] = useState<unknown>(blankDoc);
  const [lastSavedByEntryId, setLastSavedByEntryId] = useState<Record<string, string>>({});

  const saveEntry = useSaveEntry();
  const createTodayEntry = useCreateTodayEntry();

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

  useEffect(() => {
    if (!selectedThreadId || entriesQuery.isLoading || createTodayEntry.isPending) {
      return;
    }

    const today = todayLocalDate();
    const todayEntry = entries.find((entry) => entry.localDate === today);

    if (!todayEntry) {
      createTodayEntry.mutate(
        { threadId: selectedThreadId, localDate: today, contentJson: blankDoc },
        {
          onSuccess: (payload) => {
            setActiveEntryId(payload.entry.id);
            setActiveContentJson(payload.entry.contentJson ?? blankDoc);
          },
        },
      );
      return;
    }

    if (!activeEntryId) {
      setActiveEntryId(todayEntry.id);
    }
  }, [
    selectedThreadId,
    entries,
    entriesQuery.isLoading,
    activeEntryId,
    createTodayEntry,
    setActiveEntryId,
  ]);

  const saveEntryMutate = saveEntry.mutate;
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
      saveEntryMutate(
        {
          threadId: selectedThreadId,
          localDate: activeEntry.localDate,
          contentJson: activeContentJson,
        },
        {
          onSuccess: (payload) => {
            setLastSavedByEntryId((previous) => ({
              ...previous,
              [payload.entry.id]: fingerprint(payload.entry.contentJson),
            }));
          },
        },
      );
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    activeContentJson,
    activeEntry,
    selectedThreadId,
    saveEntryMutate,
    lastSavedByEntryId,
  ]);

  const statusMessage = useMemo(() => {
    if (saveEntry.isError && saveEntry.error instanceof Error) {
      return saveEntry.error.message;
    }
    if (saveEntry.isPending) {
      return "Saving...";
    }
    if (saveEntry.isSuccess && saveEntry.data) {
      return `Saved ${saveEntry.data.entry.localDate}`;
    }
    return null;
  }, [saveEntry.isError, saveEntry.error, saveEntry.isPending, saveEntry.isSuccess, saveEntry.data]);

  const activateEntry = (entry: DailyEntry) => {
    setActiveEntryId(entry.id);
    setActiveContentJson(entry.contentJson ?? buildDocFromPlainText(entry.contentText ?? ""));
  };

  const listRef = useRef<HTMLDivElement | null>(null);
  const rowVirtualizer = useVirtualizer({
    count: entries.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => 280,
    overscan: 6,
  });

  return (
    <div className="rounded-lg border border-border bg-card/80 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">
          {selectedThread?.title ?? "No thread selected"}
        </h2>
        {statusMessage ? (
          <p className="text-xs text-muted-foreground">{statusMessage}</p>
        ) : null}
      </div>

      {entriesQuery.isLoading ? (
        <p className="text-xs text-muted-foreground">Loading entries...</p>
      ) : null}

      <div ref={listRef} className="h-[70vh] overflow-auto px-4 py-4">
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
                  <h3 className="text-3xl tracking-tight">
                    {formatDateHeading(entry.localDate)}
                  </h3>

                  <div className="mt-3 text-sm leading-6 text-foreground">
                    {isActive ? (
                      <RichEditor
                        initialContent={activeContentJson}
                        autofocus
                        onContentChange={(nextContent) => setActiveContentJson(nextContent)}
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => activateEntry(entry)}
                        className="w-full text-left"
                      >
                        <RenderedNote
                          contentJson={entry.contentJson}
                          fallbackText={entry.contentText}
                        />
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
        <p className="mt-3 text-xs text-muted-foreground">
          No entries yet. Opening a thread auto-creates today's entry.
        </p>
      ) : null}
    </div>
  );
}
