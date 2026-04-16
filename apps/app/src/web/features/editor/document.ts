import type { JSONContent } from "@tiptap/react";

export const blankDoc: JSONContent = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

export function buildDocFromPlainText(value: string): JSONContent {
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
