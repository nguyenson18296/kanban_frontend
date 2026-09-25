import AvatarGroup from "@/components/AvatarGroup";
import { PRIORITY_OPTIONS } from "@/constants/priority";
import { cn } from "@/lib/utils";
import type { ITaskSearchHit } from "@/types";

import { snippetSegments } from "./search";

interface SearchHitRowProps {
  hit: ITaskSearchHit;
  /** DOM id for aria-activedescendant, assigned by the overlay. */
  id: string;
  active: boolean;
  projectName: string;
  onOpen: (hit: ITaskSearchHit) => void;
  onHover: () => void;
}

/**
 * One server search hit (JSP-38). The snippet is parsed into React segments
 * via `snippetSegments` — never injected as HTML.
 */
export default function SearchHitRow({
  hit,
  id,
  active,
  projectName,
  onOpen,
  onHover,
}: Readonly<SearchHitRowProps>) {
  const completed = hit.status === "done" || hit.status === "cancelled";
  const priorityLabel = PRIORITY_OPTIONS.find((option) => option.value === hit.priority)?.label;
  const snippetParts = snippetSegments(hit.snippet);

  return (
    <div
      id={id}
      role="option"
      aria-selected={active}
      // A hit without a ticket id has no task route — show it as non-navigable
      // instead of a dead click (openHit guards as defense in depth).
      aria-disabled={!hit.ticket_id || undefined}
      onClick={() => onOpen(hit)}
      onMouseEnter={onHover}
      className={cn(
        "flex items-start gap-3 rounded-lg px-3 py-2.5",
        hit.ticket_id ? "cursor-pointer" : "cursor-default opacity-70",
        active && "bg-accent",
      )}
    >
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-[13.5px] font-semibold text-foreground",
            completed && "line-through opacity-70",
          )}
        >
          {hit.title}
          {completed ? <span className="sr-only"> (completed)</span> : null}
        </p>
        {snippetParts.length > 0 ? (
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {snippetParts.map((part, i) =>
              part.hit ? (
                <mark key={i} className="rounded-[3px] bg-primary/15 font-bold text-primary">
                  {part.text}
                </mark>
              ) : (
                <span key={i}>{part.text}</span>
              ),
            )}
          </p>
        ) : null}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <span className="font-medium">{projectName}</span>
          {hit.ticket_id ? <span className="font-mono font-bold">{hit.ticket_id}</span> : null}
          {priorityLabel ? <span>{priorityLabel}</span> : null}
          {hit.labels.slice(0, 2).map((label) => (
            <span key={label.id} className="rounded-full border px-2 py-px text-[10.5px] font-medium">
              {label.name}
            </span>
          ))}
        </div>
      </div>
      {hit.assignees.length > 0 ? (
        <div className="shrink-0 pt-0.5">
          <AvatarGroup avatars={hit.assignees} visibleCount={3} />
        </div>
      ) : null}
    </div>
  );
}
