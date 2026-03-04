import { useEditorState } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import type { Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Pilcrow,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  CodeXml,
  List,
  ListOrdered,
} from "lucide-react";

import { Toggle } from "@/components/ui/toggle";
import { Separator } from "@/components/ui/separator";
import { menuBarStateSelector } from "./menu-bar-state";

function ToolbarButton({
  pressed,
  onPressedChange,
  disabled,
  children,
}: Readonly<{
  pressed: boolean;
  onPressedChange: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}>) {
  return (
    <Toggle
      size="sm"
      pressed={pressed}
      onPressedChange={onPressedChange}
      disabled={disabled}
      className="h-8 min-w-8 px-1.5"
    >
      {children}
    </Toggle>
  );
}

export function BubbleToolbar({ editor }: Readonly<{ editor: Editor }>) {
  const state = useEditorState({
    editor,
    selector: menuBarStateSelector,
  });

  return (
    <BubbleMenu editor={editor}>
      <div className="flex items-center gap-0.5 rounded-lg border bg-background p-1 shadow-md">
        <ToolbarButton
          pressed={state.isBold}
          onPressedChange={() => editor.chain().focus().toggleBold().run()}
          disabled={!state.canBold}
        >
          <Bold className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          pressed={state.isItalic}
          onPressedChange={() => editor.chain().focus().toggleItalic().run()}
          disabled={!state.canItalic}
        >
          <Italic className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          pressed={state.isStrike}
          onPressedChange={() => editor.chain().focus().toggleStrike().run()}
          disabled={!state.canStrike}
        >
          <Strikethrough className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          pressed={state.isCode}
          onPressedChange={() => editor.chain().focus().toggleCode().run()}
          disabled={!state.canCode}
        >
          <Code className="size-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-0.5 h-5" />

        <ToolbarButton
          pressed={state.isParagraph}
          onPressedChange={() =>
            editor.chain().focus().setParagraph().run()
          }
        >
          <Pilcrow className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          pressed={state.isHeading1}
          onPressedChange={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
        >
          <Heading1 className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          pressed={state.isHeading2}
          onPressedChange={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          <Heading2 className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          pressed={state.isHeading3}
          onPressedChange={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
        >
          <Heading3 className="size-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-0.5 h-5" />

        <ToolbarButton
          pressed={state.isBlockquote}
          onPressedChange={() =>
            editor.chain().focus().toggleBlockquote().run()
          }
        >
          <Quote className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          pressed={state.isCodeBlock}
          onPressedChange={() =>
            editor.chain().focus().toggleCodeBlock().run()
          }
        >
          <CodeXml className="size-4" />
        </ToolbarButton>

        <Separator orientation="vertical" className="mx-0.5 h-5" />

        <ToolbarButton
          pressed={state.isBulletList}
          onPressedChange={() =>
            editor.chain().focus().toggleBulletList().run()
          }
        >
          <List className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          pressed={state.isOrderedList}
          onPressedChange={() =>
            editor.chain().focus().toggleOrderedList().run()
          }
        >
          <ListOrdered className="size-4" />
        </ToolbarButton>
      </div>
    </BubbleMenu>
  );
}
