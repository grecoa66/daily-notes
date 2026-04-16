import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { RichEditor } from "@/web/features/editor/rich-editor";
import { buildDocFromPlainText } from "@/web/features/editor/document";
import { formatDateHeading } from "@/web/lib/dates";

import type { DailyEntry } from "./types";

type EntryListProps = {
  entries: DailyEntry[];
  isLoading: boolean;
  activeEntryId: string | null;
  activeContentJson: unknown;
  statusMessage: string | null;
  onActivateEntry: (entry: DailyEntry) => void;
  onActiveContentChange: (entry: DailyEntry, contentJson: unknown) => void;
};

export function EntryList({
  entries,
  isLoading,
  activeEntryId,
  activeContentJson,
  statusMessage,
  onActivateEntry,
  onActiveContentChange,
}: EntryListProps) {
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
        <h2 className="text-sm font-semibold">Running Thread</h2>
        {statusMessage ? (
          <p className="text-xs text-muted-foreground">{statusMessage}</p>
        ) : null}
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading entries...</p>
      ) : null}

      <div
        ref={listRef}
        className="h-[70vh] overflow-auto px-4 py-4"
      >
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
                        onContentChange={(nextContent) =>
                          onActiveContentChange(entry, nextContent)
                        }
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => onActivateEntry(entry)}
                        className="w-full text-left"
                      >
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {entry.contentMarkdown || entry.contentText || ""}
                        </ReactMarkdown>
                        
                      </button>
                    )}
                  </div>
                </article>
              </div>
            );
          })}
        </div>
      </div>

      {entries.length === 0 && !isLoading ? (
        <p className="mt-3 text-xs text-muted-foreground">
          No entries yet. Opening a thread auto-creates today's entry.
        </p>
      ) : null}
    </div>
  );
}

// Re-export so consumers building default content can use the same helper.
export { buildDocFromPlainText };
