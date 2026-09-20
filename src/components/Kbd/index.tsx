import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/** Small keyboard-key hint (⌘F, Esc, ↑↓) for toolbars, dialog footers and menus. */
export default function Kbd({ className, children, ...props }: Readonly<ComponentProps<"kbd">>) {
  return (
    <kbd
      {...props}
      className={cn(
        "inline-flex items-center gap-0.5 rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground",
        className,
      )}
    >
      {children}
    </kbd>
  );
}
