import { useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/web/components/ui/button";
import { Input } from "@/web/components/ui/input";
import { Popover, PopoverAnchor, PopoverContent } from "@/web/components/ui/popover";

import type { LinkDraft } from "./link-utils";

type LinkEditorPopoverProps = {
  draft: LinkDraft;
  onChange: (patch: Partial<Pick<LinkDraft, "title" | "url">>) => void;
  onCancel: () => void;
  onSubmit: () => void;
};

export function LinkEditorPopover({
  draft,
  onChange,
  onCancel,
  onSubmit,
}: LinkEditorPopoverProps) {
  const titleInputRef = useRef<HTMLInputElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);

  useLayoutEffect(() => {
    const focusTarget = draft.title ? urlInputRef.current : titleInputRef.current;
    focusTarget?.focus();
    focusTarget?.select();
    // Focus once when the popover opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canSubmit = draft.title.trim().length > 0 && draft.url.trim().length > 0;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (canSubmit) {
      onSubmit();
    }
  };

  const anchorWidth = Math.max(1, draft.anchor.bottom - draft.anchor.top);
  const anchorHeight = draft.anchor.bottom - draft.anchor.top;

  return (
    <Popover
      open
      onOpenChange={(open) => {
        if (!open) {
          onCancel();
        }
      }}
    >
      {createPortal(
        <PopoverAnchor asChild>
          <div
            aria-hidden
            style={{
              position: "fixed",
              top: draft.anchor.top,
              left: draft.anchor.left - anchorWidth / 2,
              width: anchorWidth,
              height: anchorHeight,
              pointerEvents: "none",
            }}
          />
        </PopoverAnchor>,
        document.body,
      )}

      <PopoverContent
        side="top"
        align="center"
        sideOffset={10}
        className="w-80"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="text-center text-sm font-semibold">
            {draft.mode === "update" ? "Edit Link" : "Add Link"}
          </div>

          <Input
            ref={titleInputRef}
            value={draft.title}
            onChange={(event) => onChange({ title: event.target.value })}
            placeholder="Title"
          />

          <Input
            ref={urlInputRef}
            value={draft.url}
            onChange={(event) => onChange({ url: event.target.value })}
            placeholder="Address"
            autoComplete="off"
            spellCheck={false}
          />

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="h-8 px-3 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!canSubmit}
              className="h-8 px-3 text-xs"
            >
              Done
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
