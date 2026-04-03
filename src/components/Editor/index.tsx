import { useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";

import { BubbleToolbar } from "./bubble-toolbar";
import CustomMention from "./mention";
import { createMentionSuggestion } from "./mention-suggestion";
import { cn } from "@/lib/utils";

interface EditorProps {
  description: string;
  placeholder?: string;
  editable?: boolean;
  className?: string;
  editorClassName?: string;
  onChange?: (html: string) => void;
}

export default function Editor({
  description,
  placeholder = "Write something...",
  editable = true,
  className,
  editorClassName,
  onChange,
}: Readonly<EditorProps>) {
  const [mentionSuggestion] = useState(createMentionSuggestion);
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
      CustomMention.configure({
        suggestion: mentionSuggestion,
      }),
    ],
    // Note: class is captured at initialization time and won't react to dynamic changes.
    editorProps: {
      attributes: {
        class: cn("tiptap", editorClassName),
      },
    },
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
