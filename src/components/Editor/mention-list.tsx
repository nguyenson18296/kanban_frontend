import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export interface MentionItem {
  id: string;
  label: string;
  avatar_url: string;
}

interface MentionListProps {
  items: MentionItem[];
  command: (item: MentionItem) => void;
}

export interface MentionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

const MentionList = forwardRef<MentionListRef, MentionListProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const listRef = useRef<HTMLDivElement>(null);
    const [prevItems, setPrevItems] = useState(items);
    if (items !== prevItems) {
      setPrevItems(items);
      setSelectedIndex(0);
    }

    useEffect(() => {
      const container = listRef.current;
      if (!container) return;
      const item = container.querySelector<HTMLElement>(`[data-index="${selectedIndex}"]`);
      item?.scrollIntoView({ block: "nearest" });
    }, [selectedIndex]);

    // useImperativeHandle exposes an onKeyDown method on the ref so that
    // tiptap's suggestion plugin can forward keyboard events (ArrowUp/Down/Enter)
    // into this component. Without it, the parent has no way to control selection
    // because tiptap intercepts keystrokes at the editor level before they reach
    // this popup's DOM.
    //
    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (items.length === 0) return false;

        if (event.key === "ArrowUp") {
          setSelectedIndex((i) => (i + items.length - 1) % items.length);
          return true;
        }
        if (event.key === "ArrowDown") {
          setSelectedIndex((i) => (i + 1) % items.length);
          return true;
        }
        if (event.key === "Enter") {
          const item = items[selectedIndex];
          if (item) command(item);
          return true;
        }
        return false;
      },
    }));

    if (items.length === 0) {
      return (
        <div className="z-50 w-52 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
          <div className="px-2 py-1.5 text-sm text-muted-foreground">
            No users found
          </div>
        </div>
      );
    }

    return (
      <div ref={listRef} className="z-50 w-52 max-h-64 overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
        {items.map((item, index) => {
          const initials = item.label
            .split(" ")
            .filter(Boolean)
            .map((w) => w[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);

          return (
            <button
              key={item.id}
              type="button"
              data-index={index}
              className={cn(
                "flex w-full cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden",
                index === selectedIndex && "bg-accent text-accent-foreground",
              )}
              onClick={() => command(item)}
            >
              <Avatar className="size-5">
                <AvatarImage src={item.avatar_url} alt={item.label} />
                <AvatarFallback className="text-[10px]">
                  {initials || "U"}
                </AvatarFallback>
              </Avatar>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    );
  },
);

MentionList.displayName = "MentionList";

export default MentionList;
