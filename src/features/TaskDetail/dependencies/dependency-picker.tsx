import { useId, useState } from "react";
import { ChevronDown, Plus } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useStoreKanbanBoard } from "@/stores/use-store-kanban-board";
import {
  useStoreOptimisticActivities,
  createOptimisticActivity,
} from "@/stores/use-store-optimistic-activities";
import { TaskActivityAction } from "@/types";
import type { DependencyDirection, ITask, ITaskDependencies } from "@/types";

import { useAddDependency } from "./hooks/use-add-dependency";

const DIRECTION_HELP: Record<DependencyDirection, string> = {
  blocked_by: "Pick a task this one is waiting on",
  blocks: "Pick a task that is waiting on this one",
};

interface DependencyPickerProps {
  taskId: string;
  dependencies: ITaskDependencies;
}

export default function DependencyPicker({ taskId, dependencies }: Readonly<DependencyPickerProps>) {
  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState<DependencyDirection>("blocked_by");
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const listboxId = useId();

  const addDependency = useAddDependency();
  const addOptimisticActivity = useStoreOptimisticActivities((s) => s.addActivity);
  const board = useStoreKanbanBoard((s) => s.kanbanBoard);

  // Candidates = the loaded board; excluding both lists avoids the direct cycle.
  const linkedIds = new Set([
    taskId,
    ...dependencies.blocked_by.map((entry) => entry.id),
    ...dependencies.blocks.map((entry) => entry.id),
  ]);
  const needle = query.trim().toLowerCase();
  const candidates = (board?.columns ?? [])
    .flatMap((column) => column.tasks)
    .filter((task) => !linkedIds.has(task.id))
    .filter(
      (task) =>
        !needle ||
        task.title.toLowerCase().includes(needle) ||
        task.ticket_id.toLowerCase().includes(needle),
    );
  const activeCandidate = candidates[Math.min(activeIndex, candidates.length - 1)];

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      setQuery("");
      setActiveIndex(0);
    }
  };

  const pick = (task: ITask) => {
    addDependency.mutate(
      { direction, currentTaskId: taskId, otherTaskId: task.id },
      {
        onSuccess: () => {
          // Activity lands on the blocked task — a "blocks" add logs on the other feed.
          if (direction === "blocked_by") {
            addOptimisticActivity(
              taskId,
              createOptimisticActivity(TaskActivityAction.TASK_DEPENDENCY_ADDED, {
                dependencies: [
                  { task_id: task.id, ticket_id: task.ticket_id, title: task.title },
                ],
              }),
            );
          }
          setOpen(false);
        },
        // On error: stay open; the hook toasts the server message.
      },
    );
  };

  const optionId = (task: ITask) => `${listboxId}-${task.id}`;

  const moveActive = (delta: number) => {
    const next = Math.min(Math.max(activeIndex + delta, 0), Math.max(candidates.length - 1, 0));
    setActiveIndex(next);
    const task = candidates[next];
    // Focus stays on the input (activedescendant), so scroll the option ourselves.
    if (task) document.getElementById(optionId(task))?.scrollIntoView({ block: "nearest" });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveActive(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      moveActive(-1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (activeCandidate && !addDependency.isPending) pick(activeCandidate);
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        {/* Icon-only like the Labels add — a text label wraps in the narrow sidebar. */}
        <Button
          variant="outline"
          size="icon"
          aria-label="Add dependency"
          className="size-6 border-none"
        >
          <Plus aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0">
        <div className="flex flex-col gap-2 border-b p-2">
          <div className="relative">
            <select
              aria-label="Relation type"
              value={direction}
              onChange={(event) => {
                setDirection(event.target.value as DependencyDirection);
                setActiveIndex(0);
              }}
              className="h-8 w-full appearance-none rounded-md border border-input bg-transparent px-2.5 pr-8 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="blocked_by">Blocked by…</option>
              <option value="blocks">Blocking…</option>
            </select>
            <ChevronDown
              aria-hidden="true"
              className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
            />
          </div>
          <p className="px-0.5 text-[11px] text-muted-foreground">{DIRECTION_HELP[direction]}</p>
          <Input
            role="combobox"
            aria-label="Search tasks"
            aria-autocomplete="list"
            aria-expanded="true"
            aria-controls={listboxId}
            aria-activedescendant={activeCandidate ? optionId(activeCandidate) : undefined}
            autoComplete="off"
            placeholder="Search by title or ticket…"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={handleKeyDown}
            className="h-8 text-xs"
          />
        </div>
        {/* Empty message outside the listbox (options-only children); status = announced. */}
        <div className="max-h-60 overflow-y-auto p-1">
          {candidates.length === 0 && (
            <p role="status" className="px-2.5 py-4 text-center text-xs text-muted-foreground">
              No matching tasks
            </p>
          )}
          <div
            id={listboxId}
            role="listbox"
            aria-label="Matching tasks"
            className="flex flex-col gap-px"
          >
            {candidates.map((task, index) => (
              <button
                key={task.id}
                id={optionId(task)}
                type="button"
                role="option"
                aria-selected={task.id === activeCandidate?.id}
                disabled={addDependency.isPending}
                onClick={() => pick(task)}
                onMouseEnter={() => setActiveIndex(index)}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5 text-left disabled:opacity-60",
                  task.id === activeCandidate?.id && "bg-accent",
                )}
              >
                <span className="shrink-0 font-mono text-[11px] font-semibold text-muted-foreground">
                  {task.ticket_id}
                </span>
                <span className="min-w-0 flex-1 truncate text-xs font-medium">{task.title}</span>
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
