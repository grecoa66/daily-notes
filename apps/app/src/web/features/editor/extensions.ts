import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";

export const editorExtensions = [
  StarterKit,
  Link.configure({ openOnClick: false }),
  Image,
  Placeholder.configure({ placeholder: "Write your notes..." }),
];
