import { useMemo } from "react";
import { generateHTML } from "@tiptap/html";
import type { JSONContent } from "@tiptap/react";

import { blankDoc } from "./document";
import { editorExtensions } from "./extensions";

type RenderedNoteProps = {
  contentJson: unknown;
  fallbackText?: string;
  className?: string;
};

function isJSONContent(value: unknown): value is JSONContent {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  if ("type" in value && typeof value.type !== "string") {
    return false;
  }
  return true;
}

export function RenderedNote({ contentJson, fallbackText, className }: RenderedNoteProps) {
  const html = useMemo(() => {
    const doc = isJSONContent(contentJson) ? contentJson : blankDoc;

    try {
      return generateHTML(doc, editorExtensions);
    } catch {
      return null;
    }
  }, [contentJson]);

  if (!html) {
    if (fallbackText && fallbackText.trim().length > 0) {
      return (
        <div className={`note-editor whitespace-pre-wrap ${className ?? ""}`.trim()}>
          {fallbackText}
        </div>
      );
    }
    return null;
  }

  return (
    <div
      className={`note-editor ${className ?? ""}`.trim()}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
