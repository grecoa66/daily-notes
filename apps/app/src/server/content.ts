type JSONValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JSONValue }
  | JSONValue[];

type EditorNode = {
  type?: string;
  text?: string;
  attrs?: Record<string, JSONValue>;
  marks?: Array<{ type?: string }>;
  content?: EditorNode[];
};

function joinNonEmpty(lines: string[], separator = "\n"): string {
  return lines.filter((line) => line.trim().length > 0).join(separator);
}

function applyMarks(text: string, marks: Array<{ type?: string }> | undefined): string {
  if (!marks || marks.length === 0) {
    return text;
  }

  return marks.reduce((value, mark) => {
    switch (mark.type) {
      case "bold":
        return `**${value}**`;
      case "italic":
        return `*${value}*`;
      case "strike":
        return `~~${value}~~`;
      case "code":
        return `\`${value}\``;
      default:
        return value;
    }
  }, text);
}

function renderInlineMarkdown(nodes: EditorNode[] = []): string {
  return nodes
    .map((node) => {
      if (node.type === "text") {
        return applyMarks(node.text ?? "", node.marks);
      }

      if (node.type === "hardBreak") {
        return "  \n";
      }

      if (node.type === "image") {
        const src = typeof node.attrs?.src === "string" ? node.attrs.src : "";
        const alt = typeof node.attrs?.alt === "string" ? node.attrs.alt : "image";
        return src ? `![${alt}](${src})` : "";
      }

      if (node.content) {
        return renderInlineMarkdown(node.content);
      }

      return "";
    })
    .join("");
}

function renderNodeMarkdown(node: EditorNode, depth = 0): string {
  const children = node.content ?? [];

  switch (node.type) {
    case "doc":
      return joinNonEmpty(children.map((child) => renderNodeMarkdown(child, depth)), "\n\n");
    case "paragraph": {
      return renderInlineMarkdown(children);
    }
    case "heading": {
      const levelRaw = typeof node.attrs?.level === "number" ? node.attrs.level : 1;
      const level = Math.min(Math.max(levelRaw, 1), 6);
      return `${"#".repeat(level)} ${renderInlineMarkdown(children)}`;
    }
    case "bulletList": {
      return joinNonEmpty(children.map((child) => renderNodeMarkdown(child, depth + 1)), "\n");
    }
    case "orderedList": {
      return joinNonEmpty(
        children.map((child, index) => {
          const line = renderNodeMarkdown(child, depth + 1);
          return `${index + 1}. ${line}`;
        }),
        "\n",
      );
    }
    case "listItem": {
      const line = joinNonEmpty(children.map((child) => renderNodeMarkdown(child, depth + 1)), "\n");
      return `${"  ".repeat(Math.max(depth - 1, 0))}- ${line}`;
    }
    case "blockquote": {
      const text = joinNonEmpty(children.map((child) => renderNodeMarkdown(child, depth + 1)), "\n");
      return text
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n");
    }
    case "codeBlock": {
      const language = typeof node.attrs?.language === "string" ? node.attrs.language : "";
      const code = joinNonEmpty(children.map((child) => child.text ?? ""), "\n");
      return `\`\`\`${language}\n${code}\n\`\`\``;
    }
    case "horizontalRule":
      return "---";
    case "image": {
      const src = typeof node.attrs?.src === "string" ? node.attrs.src : "";
      const alt = typeof node.attrs?.alt === "string" ? node.attrs.alt : "image";
      return src ? `![${alt}](${src})` : "";
    }
    case "text":
      return applyMarks(node.text ?? "", node.marks);
    default:
      return joinNonEmpty(children.map((child) => renderNodeMarkdown(child, depth + 1)), "\n");
  }
}

function renderNodeText(node: EditorNode): string {
  if (node.type === "text") {
    return node.text ?? "";
  }

  if (node.type === "hardBreak") {
    return "\n";
  }

  if (!node.content) {
    return "";
  }

  const inner = node.content.map((child) => renderNodeText(child)).join("");

  if (["paragraph", "heading", "blockquote", "listItem", "codeBlock"].includes(node.type ?? "")) {
    return `${inner}\n`;
  }

  return inner;
}

export function deriveContent(contentJson: unknown): {
  contentJson: Record<string, unknown>;
  contentText: string;
  contentMarkdown: string;
} {
  const normalized = (contentJson ?? {
    type: "doc",
    content: [{ type: "paragraph" }],
  }) as Record<string, unknown>;

  const text = renderNodeText(normalized as EditorNode).trim();
  const markdown = renderNodeMarkdown(normalized as EditorNode).trim();

  return {
    contentJson: normalized,
    contentText: text,
    contentMarkdown: markdown,
  };
}
