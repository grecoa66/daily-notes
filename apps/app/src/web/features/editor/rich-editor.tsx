import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";

import { editorExtensions } from "./extensions";
import { LinkEditorPopover } from "./link-popover";
import {
  type LinkDraft,
  type LinkDraftMode,
  normalizeLinkHref,
} from "./link-utils";
import { ToolbarButton } from "./toolbar-button";

type RichEditorProps = {
  initialContent: unknown;
  autofocus?: boolean;
  onContentChange: (contentJson: unknown) => void;
};

export function RichEditor({
  initialContent,
  autofocus,
  onContentChange,
}: RichEditorProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [linkDraft, setLinkDraft] = useState<LinkDraft | null>(null);
  const openLinkEditorRef = useRef<() => void>(() => {});

  const editor = useEditor({
    immediatelyRender: false,
    extensions: editorExtensions,
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

  useEffect(() => {
    if (!editor) {
      return;
    }

    const dom = editor.view.dom;

    const handleClick = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }

      const anchor = target.closest("a");
      if (!anchor || !dom.contains(anchor)) {
        return;
      }

      event.preventDefault();

      const anchorPos = editor.view.posAtDOM(anchor, 0);
      if (typeof anchorPos === "number" && anchorPos >= 0) {
        editor.chain().focus().setTextSelection(anchorPos + 1).run();
      }

      openLinkEditorRef.current();
    };

    dom.addEventListener("click", handleClick);
    return () => {
      dom.removeEventListener("click", handleClick);
    };
  }, [editor]);

  if (!editor) {
    return <div className="text-xs text-muted-foreground">Loading editor...</div>;
  }

  const openLinkEditor = () => {
    const { view } = editor;
    let mode: LinkDraftMode;
    let title = "";
    let url = "";
    let from: number;
    let to: number;

    if (editor.isActive("link")) {
      editor.chain().extendMarkRange("link").run();
      from = editor.state.selection.from;
      to = editor.state.selection.to;
      title = editor.state.doc.textBetween(from, to, " ");
      const currentHref = editor.getAttributes("link").href;
      url = typeof currentHref === "string" ? currentHref : "";
      mode = "update";
    } else if (!editor.state.selection.empty) {
      from = editor.state.selection.from;
      to = editor.state.selection.to;
      title = editor.state.doc.textBetween(from, to, " ");
      mode = "insert-with-selection";
    } else {
      from = editor.state.selection.from;
      to = editor.state.selection.to;
      mode = "insert-at-cursor";
    }

    const fromCoords = view.coordsAtPos(from);
    const toCoords = view.coordsAtPos(to);

    setLinkDraft({
      title,
      url,
      range: { from, to },
      anchor: {
        top: Math.min(fromCoords.top, toCoords.top),
        bottom: Math.max(fromCoords.bottom, toCoords.bottom),
        left: (fromCoords.left + toCoords.left) / 2,
      },
      mode,
    });
  };

  openLinkEditorRef.current = openLinkEditor;

  const closeLinkEditor = () => {
    setLinkDraft(null);
    editor.commands.focus();
  };

  const saveLinkEditor = () => {
    if (!linkDraft) {
      return;
    }

    const title = linkDraft.title.trim();
    const urlRaw = linkDraft.url.trim();
    if (!title || !urlRaw) {
      return;
    }

    const href = normalizeLinkHref(urlRaw);
    const { from, to } = linkDraft.range;

    editor
      .chain()
      .focus()
      .insertContentAt(
        { from, to },
        {
          type: "text",
          text: title,
          marks: [{ type: "link", attrs: { href } }],
        },
      )
      .run();

    setLinkDraft(null);
  };

  const addImage = () => {
    const src = window.prompt("Image URL");
    if (!src) {
      return;
    }
    editor.chain().focus().setImage({ src }).run();
  };

  return (
    <div className="bg-card/80">
      <EditorContent editor={editor} className="min-h-28 text-sm text-foreground" />

      {isFocused ? (
        <>
          <div className="hidden items-center gap-1 border-t border-border px-2 py-2 md:flex">
            <ToolbarButton
              active={editor.isActive("bold")}
              onClick={() => editor.chain().focus().toggleBold().run()}
              label="B"
            />
            <ToolbarButton
              active={editor.isActive("italic")}
              onClick={() => editor.chain().focus().toggleItalic().run()}
              label="I"
            />
            <ToolbarButton
              active={editor.isActive("w")}
              onClick={() => editor.chain().focus().toggleCode().run()}
              label="Code"
            />
            <ToolbarButton
              active={editor.isActive("heading", { level: 1 })}
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              label="H1"
            />
            <ToolbarButton
              active={editor.isActive("bulletList")}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              label="List"
            />
            <ToolbarButton
              active={editor.isActive("orderedList")}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              label="1."
            />
            <ToolbarButton
              active={editor.isActive("blockquote")}
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              label="Quote"
            />
            <ToolbarButton
              active={editor.isActive("link")}
              onClick={openLinkEditor}
              label="Link"
            />
            <ToolbarButton active={false} onClick={addImage} label="Image" />
          </div>

          <div className="fixed inset-x-0 bottom-0 z-20 border-t border-zinc-300 bg-white px-2 py-2 md:hidden">
            <div className="mx-auto flex max-w-md items-center gap-1 overflow-x-auto">
              <ToolbarButton
                active={editor.isActive("bold")}
                onClick={() => editor.chain().focus().toggleBold().run()}
                label="B"
              />
              <ToolbarButton
                active={editor.isActive("italic")}
                onClick={() => editor.chain().focus().toggleItalic().run()}
                label="I"
              />
              <ToolbarButton
                active={editor.isActive("heading", { level: 1 })}
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                label="H1"
              />
              <ToolbarButton
                active={editor.isActive("bulletList")}
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                label="List"
              />
              <ToolbarButton
                active={editor.isActive("link")}
                onClick={openLinkEditor}
                label="Link"
              />
              <ToolbarButton active={false} onClick={addImage} label="Image" />
            </div>
          </div>
        </>
      ) : null}

      {linkDraft ? (
        <LinkEditorPopover
          draft={linkDraft}
          onChange={(patch) =>
            setLinkDraft((current) => (current ? { ...current, ...patch } : current))
          }
          onCancel={closeLinkEditor}
          onSubmit={saveLinkEditor}
        />
      ) : null}
    </div>
  );
}
