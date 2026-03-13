import { forwardRef, useSyncExternalStore } from "react";
import { Calendar, CalendarX } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatDate } from "@/utils/date";

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const MS_PER_MINUTE = 60_000;

// useSyncExternalStore requires a subscribe function.
// An empty subscriber means no automatic re-renders from the store itself,
// but the snapshot is still read fresh on every render triggered by other state.
const emptySubscribe = () => () => {};

// Quantize to the nearest minute so the snapshot stays stable within
// the same render cycle (avoids infinite re-render loops), while still
// being fresh enough for day-level comparisons.
function getNowSnapshot() {
  return Math.floor(Date.now() / MS_PER_MINUTE) * MS_PER_MINUTE;
}

interface DueDateDropdownTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  dueDate: string | null;
}

/**
 * Trigger button for the due date dropdown.
 *
 * Uses `forwardRef` so Radix's `DropdownMenuTrigger asChild` can attach
 * its ref and event handlers (onClick, aria-expanded, etc.) via Slot.
 * Extra props are spread onto the underlying `<button>` for the same reason.
 *
 * Icon color reflects urgency:
 * - > 7 days remaining: normal (muted)
 * - < 7 days remaining: red Calendar
 * - < 1 day / overdue:  red CalendarX
 */
const DueDateDropdownTrigger = forwardRef<
  HTMLButtonElement,
  DueDateDropdownTriggerProps
>(function DueDateDropdownTrigger({ dueDate, className, ...props }, ref) {
  // Read current time via useSyncExternalStore — React's idiomatic way to
  // consume an external value during render without violating purity rules.
  // Fresh on every re-render (unlike useState which freezes at mount time).
  const now = useSyncExternalStore(emptySubscribe, getNowSnapshot);

  function getDueDateIcon() {
    if (!dueDate) return null;
    const daysRemaining = (new Date(dueDate).getTime() - now) / MS_PER_DAY;
    if (daysRemaining < 1) {
      return <CalendarX className="size-4 text-red-500" />;
    }
    if (daysRemaining < 7) {
      return <Calendar className="size-4 text-red-500" />;
    }
    return <Calendar className="size-4 text-muted-foreground" />;
  }

  return (
    <button
      ref={ref}
      type="button"
      className={cn("flex w-full items-center justify-between rounded-md border px-2 py-1 text-[10px] hover:bg-accent", className)}
      {...props}
    >
      <span className="flex items-center gap-2">
        {getDueDateIcon()}
        {dueDate
          ? formatDate(new Date(dueDate), { month: "short", day: "numeric" })
          : "No due date"}
      </span>
    </button>
  );
});

export default DueDateDropdownTrigger;
