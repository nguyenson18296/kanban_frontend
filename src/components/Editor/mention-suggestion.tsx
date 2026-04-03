import type { SuggestionOptions, SuggestionProps } from "@tiptap/suggestion";
import { ReactRenderer } from "@tiptap/react";
import tippy, { type Instance as TippyInstance } from "tippy.js";

import { useStoreUsersList } from "@/stores/use-store-users-list";
import type { IUser } from "@/types";
import MentionList, { type MentionItem, type MentionListRef } from "./mention-list";

function toMentionItems(users: IUser[]): MentionItem[] {
  return users.map((u) => ({
    id: u.id,
    label: u.full_name,
    avatar_url: u.avatar_url,
  }));
}

export function createMentionSuggestion(): Omit<
  SuggestionOptions<MentionItem>,
  "editor"
> {
  return {
    items: ({ query, editor }) => {
      const mentionedIds = new Set<string>();
      editor.state.doc.descendants((node) => {
        if (node.type.name === "mention" && node.attrs.id) {
          mentionedIds.add(node.attrs.id as string);
        }
      });

      const users = useStoreUsersList.getState().users;
      const items = toMentionItems(users).filter((item) => !mentionedIds.has(item.id));

      if (!query) return items.slice(0, 10);
      const lower = query.toLowerCase();
      return items
        .filter((item) => item.label.toLowerCase().includes(lower))
        .slice(0, 10);
    },

    render: () => {
      let renderer: ReactRenderer<MentionListRef>;
      let popup: TippyInstance | null = null;

      return {
        onStart: (props: SuggestionProps<MentionItem>) => {
          renderer = new ReactRenderer(MentionList, {
            props,
            editor: props.editor,
          });

          if (!props.clientRect) return;

          const [instance] = tippy("body", {
            getReferenceClientRect: props.clientRect as () => DOMRect,
            appendTo: () => document.body,
            content: renderer.element,
            showOnCreate: true,
            interactive: true,
            trigger: "manual",
            placement: "bottom-start",
          });
          popup = instance ?? null;
        },

        onUpdate: (props: SuggestionProps<MentionItem>) => {
          renderer.updateProps(props);

          if (!props.clientRect) return;

          popup?.setProps({
            getReferenceClientRect: props.clientRect as () => DOMRect,
          });
        },

        onKeyDown: (props: { event: KeyboardEvent }) => {
          if (props.event.key === "Escape") {
            popup?.hide();
            return true;
          }
          return renderer.ref?.onKeyDown(props) ?? false;
        },

        onExit: () => {
          popup?.destroy();
          renderer.destroy();
        },
      };
    },
  };
}
