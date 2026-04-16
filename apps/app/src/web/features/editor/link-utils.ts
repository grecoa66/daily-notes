export type LinkDraftMode =
  | "insert-at-cursor"
  | "insert-with-selection"
  | "update";

export type LinkDraft = {
  title: string;
  url: string;
  range: { from: number; to: number };
  anchor: { top: number; bottom: number; left: number };
  mode: LinkDraftMode;
};

export function normalizeLinkHref(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return trimmed;
  }

  if (/^(https?:|mailto:|tel:)/i.test(trimmed)) {
    return trimmed;
  }

  if (/^www\./i.test(trimmed)) {
    return `https://${trimmed}`;
  }

  if (trimmed.includes("@") && !trimmed.includes("/") && !trimmed.includes(" ")) {
    return `mailto:${trimmed}`;
  }

  return `https://${trimmed}`;
}
