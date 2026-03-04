import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";

import { BubbleToolbar } from "./bubble-toolbar";
import { cn } from "@/lib/utils";

interface EditorProps {
  description: string;
  placeholder?: string;
  editable?: boolean;
  className?: string;
  onChange?: (html: string) => void;
}

export default function Editor({
  description,
  placeholder = "Write something...",
  editable = true,
  className,
  onChange,
}: Readonly<EditorProps>) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: description,
    editable,
    onUpdate: ({ editor: e }) => {
      onChange?.(e.getHTML());
    },
  });

  return (
    <div
      className={cn(
        "editor-wrapper rounded-lg border bg-background",
        "focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",
        "transition-[border-color,box-shadow]",
        className,
      )}
    >
      {editable && editor && <BubbleToolbar editor={editor} />}
      <EditorContent editor={editor} className="editor-content" />
    </div>
  );
}
