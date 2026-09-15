import { useDeferredValue, useEffect, useRef, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import {
  Clock3,
  CornerDownLeft,
  Crosshair,
  LoaderCircle,
  Search,
  TriangleAlert,
  X,
} from "lucide-react";

import AvatarGroup from "@/components/AvatarGroup";
import Kbd from "@/components/Kbd";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useStoreKanbanBoard } from "@/stores/use-store-kanban-board";
import { useStoreRecentTasks } from "@/stores/use-store-recent-tasks";
import type { IBoard, IColumn, ITask, Priority } from "@/types";

import { isDoneColumn, searchPhase, searchTasks, segments, snippet } from "./search";
import type { ISearchResult, ISegment, SearchPhase } from "./search";

const LISTBOX_ID = "board-search-listbox";
const optionId = (index: number) => `board-search-option-${index}`;

const PRIORITY_LABELS: Record<Priority, string> = {
  no_priority: "No priority",
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
};

const isMac =
  typeof navigator !== "undefined" &&
  /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent);
const SHORTCUT_LABEL = isMac ? "⌘F" : "Ctrl F";

const NO_RECENTS: string[] = [];

/**
 * `attempt` exists so "Try again" forces a re-run: the React Compiler keys the
 * call site's memoization on its arguments, including the attempt counter.
 */
function runBoardSearch(board: IBoard | null, query: string, attempt: number): ISearchResult[] {
  void attempt;
  if (!board) return [];
  return searchTasks(board, query);
}

function findByTicket(
  board: IBoard | null,
  ticketId: string,
): { task: ITask; column: IColumn } | null {
  for (const column of board?.columns ?? []) {
    const task = column.tasks.find((t) => t.ticket_id === ticketId);
    if (task) return { task, column };
  }
  return null;
}

function Highlighted({ parts }: { parts: ISegment[] }) {
  return (
    <>
      {parts.map((part, i) =>
        part.hit ? (
          <mark key={i} className="rounded-[3px] bg-primary/15 font-bold text-primary">
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </>
  );
}

interface ResultRowProps {
  result: ISearchResult;
  index: number;
  active: boolean;
  query: string;
  onOpen: (result: ISearchResult) => void;
  onReveal: (result: ISearchResult) => void;
  onHover: (index: number) => void;
}

function ResultRow({ result, index, active, query, onOpen, onReveal, onHover }: ResultRowProps) {
  const { task, column, matchedField } = result;
  const excerpt = matchedField === "description" ? snippet(task.description, query) : "";
  const completed = isDoneColumn(column.name);

  return (
    <div
      id={optionId(index)}
      role="option"
      aria-selected={active}
      onClick={() => onOpen(result)}
      onMouseEnter={() => onHover(index)}
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5",
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
          <Highlighted parts={segments(task.title, query)} />
        </p>
        {excerpt ? (
          <p
            data-testid="search-result-excerpt"
            className="mt-1 truncate text-xs text-muted-foreground"
          >
            <Highlighted parts={segments(excerpt, query)} />
          </p>
        ) : null}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <span className="font-mono font-bold">{task.ticket_id}</span>
          <span className="flex items-center gap-1.5">
            <span
              className="size-1.5 rounded-full"
              style={{ backgroundColor: column.color }}
              aria-hidden
            />
            {column.name}
            {completed ? <span className="sr-only">(completed)</span> : null}
          </span>
          <span>{PRIORITY_LABELS[task.priority]}</span>
          {task.labels.slice(0, 2).map((label) => (
            <span key={label.id} className="rounded-full border px-2 py-px text-[10.5px] font-medium">
              {label.name}
            </span>
          ))}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 pt-0.5">
        {task.assignees.length > 0 ? (
          <AvatarGroup avatars={task.assignees} visibleCount={3} />
        ) : null}
        {active ? (
          // ARIA treats option children as presentational, and nothing may add
          // a Tab stop inside an aria-activedescendant listbox — this button is
          // a mouse-only affordance; Shift+Enter is the accessible path.
          <Button
            type="button"
            variant="outline"
            size="xs"
            tabIndex={-1}
            aria-hidden
            onClick={(e) => {
              e.stopPropagation();
              onReveal(result);
            }}
            className="font-semibold text-muted-foreground"
          >
            <Crosshair className="size-3" aria-hidden />
            Reveal
          </Button>
        ) : null}
      </div>
    </div>
  );
}

interface BoardSearchProps {
  projectId: string;
  /** Close search and bring the card into view on the board (scroll + flash). */
  onReveal: (taskId: string) => void;
}

/**
 * Board search (JAV-35): Cmd/Ctrl+F opens an overlay that fuzzy-searches every
 * card on the current board — fully client-side over the board store.
 */
export default function BoardSearch({ projectId, onReveal }: Readonly<BoardSearchProps>) {
  const router = useRouter();
  const board = useStoreKanbanBoard((s) => s.kanbanBoard);
  const recentTickets = useStoreRecentTasks(
    (s) => s.recentByProject[projectId] ?? NO_RECENTS,
  );

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [searchAttempt, setSearchAttempt] = useState(0);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const deferredQuery = useDeferredValue(query);
  const trimmed = query.trim();
  const deferredTrimmed = deferredQuery.trim();

  let results: ISearchResult[] = [];
  let searchFailed = false;
  if (open && deferredTrimmed) {
    try {
      results = runBoardSearch(board, deferredQuery, searchAttempt);
    } catch {
      searchFailed = true;
    }
  }

  const phase: SearchPhase = searchPhase({
    query,
    deferredQuery,
    resultCount: results.length,
    failed: searchFailed,
  });
  // While the deferred query lags, stale results stay on screen and only the
  // input-row spinner signals the catch-up — no per-keystroke panel swap.
  const isCatchingUp = Boolean(trimmed) && trimmed !== deferredTrimmed;

  const safeIndex = results.length > 0 ? Math.min(activeIndex, results.length - 1) : 0;
  const countLabel = `${results.length} ${results.length === 1 ? "result" : "results"}`;

  const recentEntries = recentTickets
    .map((ticketId) => findByTicket(board, ticketId))
    .filter((entry): entry is { task: ITask; column: IColumn } => entry !== null);

  // Cmd/Ctrl+F anywhere on the board opens search (or reselects the query when
  // already open). Shift+mod+F deliberately falls through to the browser's
  // native find, so that escape hatch is never taken away.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return; // another surface already claimed the key
      if (!(event.metaKey || event.ctrlKey) || event.shiftKey || event.altKey) return;
      if (event.key !== "f" && event.key !== "F") return;
      event.preventDefault();
      if (open) {
        inputRef.current?.focus();
        inputRef.current?.select();
      } else {
        setOpen(true);
      }
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [open]);

  // Keep the highlighted result visible while arrowing through the list.
  useEffect(() => {
    if (phase !== "results") return;
    document.getElementById(optionId(safeIndex))?.scrollIntoView({ block: "nearest" });
  }, [phase, safeIndex]);

  const recordRecent = (ticketId: string) => {
    useStoreRecentTasks.getState().recordRecentTask(projectId, ticketId);
  };

  const openTask = (ticketId: string) => {
    recordRecent(ticketId);
    setOpen(false);
    void router.navigate({
      to: "/projects/$projectId/tasks/$taskId",
      params: { projectId, taskId: ticketId },
    });
  };

  const revealResult = (result: ISearchResult) => {
    recordRecent(result.task.ticket_id);
    setOpen(false);
    onReveal(result.task.id);
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    // Never intercept keys that belong to an IME composition session — the
    // Enter that commits composed text must not open a task.
    if (event.nativeEvent.isComposing) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (results.length === 0) return;
      const delta = event.key === "ArrowDown" ? 1 : results.length - 1;
      setActiveIndex((safeIndex + delta) % results.length);
    } else if (event.key === "Home" || event.key === "End") {
      if (results.length === 0) return;
      event.preventDefault();
      setActiveIndex(event.key === "Home" ? 0 : results.length - 1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const hit = results[safeIndex];
      if (!hit) return;
      if (event.shiftKey) revealResult(hit);
      else openTask(hit.task.ticket_id);
    }
  };

  const clearQuery = () => {
    setQuery("");
    setActiveIndex(0);
    inputRef.current?.focus();
  };

  return (
    <>
      <Button
        ref={triggerRef}
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        className="justify-start rounded-lg font-normal text-muted-foreground sm:min-w-[200px]"
      >
        <Search className="size-4 shrink-0" aria-hidden />
        <span className="flex-1 text-left">Search tasks</span>
        <Kbd aria-hidden className="max-sm:hidden">{SHORTCUT_LABEL}</Kbd>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          aria-describedby={undefined}
          className="top-[14vh] left-1/2 flex max-h-[68vh] w-[calc(100vw-2rem)] max-w-[620px] translate-x-[-50%] translate-y-0 flex-col gap-0 overflow-hidden p-0 max-sm:top-4 max-sm:max-h-[80vh] sm:max-w-[620px]"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            inputRef.current?.focus();
            inputRef.current?.select();
          }}
          onCloseAutoFocus={(event) => {
            // The toolbar button regains focus however search was closed
            // (Esc, outside click, or picking a result). preventScroll:
            // scrolling the trigger into view would undo the reveal scroll.
            event.preventDefault();
            triggerRef.current?.focus({ preventScroll: true });
          }}
        >
          <DialogTitle className="sr-only">Search tasks</DialogTitle>

          <div className="flex h-14 shrink-0 items-center gap-3 border-b px-4">
            {isCatchingUp ? (
              <LoaderCircle
                className="size-4 shrink-0 animate-spin text-muted-foreground motion-reduce:animate-none"
                aria-hidden
              />
            ) : (
              <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            )}
            <input
              ref={inputRef}
              role="combobox"
              aria-label="Search tasks"
              aria-autocomplete="list"
              aria-expanded={phase === "results"}
              aria-controls={phase === "results" ? LISTBOX_ID : undefined}
              aria-activedescendant={phase === "results" ? optionId(safeIndex) : undefined}
              autoComplete="off"
              spellCheck={false}
              placeholder="Search tasks by title, description, label or ticket ID"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={handleInputKeyDown}
              className="h-full min-w-0 flex-1 bg-transparent text-[15px] font-medium text-foreground outline-none placeholder:text-muted-foreground"
            />
            {query ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label="Clear search"
                onClick={clearQuery}
                className="shrink-0 bg-muted text-muted-foreground"
              >
                <X className="size-3.5" aria-hidden />
              </Button>
            ) : null}
            <Kbd className="max-sm:hidden">Esc</Kbd>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {phase === "idle" ? (
              <>
                {recentEntries.length > 0 ? (
                  <div className="px-1 pt-1">
                    <p className="px-2 text-[10px] font-bold tracking-[0.09em] text-muted-foreground uppercase">
                      Recently opened
                    </p>
                    {recentEntries.map(({ task, column }) => (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => openTask(task.ticket_id)}
                        className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-accent"
                      >
                        <Clock3 className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-foreground">
                          {task.title}
                        </span>
                        <span className="shrink-0 font-mono text-[10px] font-bold text-muted-foreground">
                          {task.ticket_id}
                        </span>
                        <span className="sr-only">in {column.name}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
                <p className="px-3 py-3.5 text-[12.5px] leading-relaxed text-muted-foreground">
                  Start typing to search every card on this board — titles, descriptions,
                  labels, ticket IDs and column names. Partial words are fine.
                </p>
              </>
            ) : null}

            {phase === "searching" ? (
              <div className="flex items-center gap-2.5 px-4 py-4 text-[12.5px] font-semibold text-muted-foreground">
                <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
                Searching “{trimmed}”…
              </div>
            ) : null}

            {phase === "error" ? (
              <div className="flex flex-col items-center gap-2.5 px-6 py-9 text-center">
                <span className="flex size-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                  <TriangleAlert className="size-5" aria-hidden />
                </span>
                <p className="text-[13.5px] font-bold text-foreground">Search is unavailable</p>
                <p className="max-w-[38ch] text-[12.5px] leading-relaxed text-muted-foreground">
                  We couldn't run the search. Your board is unaffected.
                </p>
                <Button size="sm" className="mt-1" onClick={() => setSearchAttempt((n) => n + 1)}>
                  Try again
                </Button>
              </div>
            ) : null}

            {phase === "results" ? (
              <div id={LISTBOX_ID} role="listbox" aria-label="Search results" className="flex flex-col gap-0.5">
                {results.map((result, index) => (
                  <ResultRow
                    key={result.task.id}
                    result={result}
                    index={index}
                    active={index === safeIndex}
                    query={deferredQuery}
                    onOpen={(r) => openTask(r.task.ticket_id)}
                    onReveal={revealResult}
                    onHover={setActiveIndex}
                  />
                ))}
              </div>
            ) : null}

            {phase === "empty" ? (
              <div className="flex flex-col items-center gap-2.5 px-6 py-9 text-center">
                <span className="flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                  <Search className="size-5" aria-hidden />
                </span>
                <p className="text-[13.5px] font-bold text-foreground">
                  No cards match “{deferredTrimmed}”
                </p>
                <p className="max-w-[38ch] text-[12.5px] leading-relaxed text-muted-foreground">
                  Try fewer words, or search by a ticket ID. This searches the current board only.
                </p>
              </div>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center justify-between gap-3 border-t bg-muted/50 px-4 py-2.5">
            <div className="hidden items-center gap-3 text-[11px] font-semibold text-muted-foreground sm:flex">
              <span className="flex items-center gap-1.5">
                <Kbd>
                  <span aria-hidden>↑↓</span>
                  <span className="sr-only">Arrow keys</span>
                </Kbd>{" "}
                Navigate
              </span>
              <span className="flex items-center gap-1.5">
                <Kbd>
                  <CornerDownLeft className="size-3" aria-hidden />
                  <span className="sr-only">Enter</span>
                </Kbd>{" "}
                Open
              </span>
              <span className="flex items-center gap-1.5">
                <Kbd>
                  <span aria-hidden>⇧</span>
                  <CornerDownLeft className="size-3" aria-hidden />
                  <span className="sr-only">Shift Enter</span>
                </Kbd>{" "}
                Reveal on board
              </span>
            </div>
            <div role="status" aria-live="polite" className="text-[11px] font-semibold text-muted-foreground">
              {!isCatchingUp && (phase === "results" || phase === "empty") ? countLabel : ""}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
