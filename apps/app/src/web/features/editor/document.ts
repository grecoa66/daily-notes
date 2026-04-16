export const blankDoc = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

export function buildDocFromPlainText(value: string) {
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
