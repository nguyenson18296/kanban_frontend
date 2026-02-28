import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { VisuallyHidden } from "radix-ui";
import { useUpdateTask } from "@/features/KanbanBoard/hooks/use-update-task";
import { useStoreKanbanBoard } from "@/stores/use-store-kanban-board";
import type { ITask } from "@/types";

interface RenameTaskModalProps {
  task: ITask;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function RenameTaskModal({
  task,
  open,
  onOpenChange,
}: Readonly<RenameTaskModalProps>) {
  const [value, setValue] = useState(task.title);
  const { mutate: updateTaskMutation } = useUpdateTask();
  const updateTaskTitle = useStoreKanbanBoard((state) => state.updateTaskTitle);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || trimmed === task.title) {
      onOpenChange(false);
      return;
    }
    updateTaskTitle(task.id, trimmed);
    updateTaskMutation({ id: task.id, task: { title: trimmed } });
    onOpenChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="gap-0 overflow-hidden rounded-xl p-0 sm:max-w-md"
      >
        <VisuallyHidden.Root>
          <DialogTitle>Rename task</DialogTitle>
        </VisuallyHidden.Root>
        <div className="p-2">
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            className="border-none shadow-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          />
        </div>
        <div className="border-t bg-muted/50">
          <button
            type="button"
            onClick={handleSubmit}
            className="flex w-full items-center px-3 py-2 text-sm hover:bg-muted"
          >
            <span>
              Rename task to{" "}
              <span className="text-muted-foreground">"{value}"</span>
            </span>
            <kbd className="ml-auto rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
              Enter
            </kbd>
          </button>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex w-full items-center px-3 py-2 text-sm hover:bg-muted"
          >
            <span>Cancel</span>
            <kbd className="ml-auto rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
              esc
            </kbd>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
