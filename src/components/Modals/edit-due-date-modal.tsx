import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useUpdateTask } from "@/features/KanbanBoard/hooks/use-update-task";
import { useStoreKanbanBoard } from "@/stores/use-store-kanban-board";
import type { ITask } from "@/types";

interface EditDueDateModalProps {
  // task: ITask;
  dueDate: ITask['due_date'];
  taskId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDueDateChange?: (date: string | null) => void;
}

function formatInputDate(date: Date | undefined): string {
  if (!date) return "";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

export default function EditDueDateModal({
  dueDate,
  taskId,
  open,
  onOpenChange,
  onDueDateChange,
}: Readonly<EditDueDateModalProps>) {
  const [draftDate, setDraftDate] = useState<Date | undefined>(
    dueDate ? new Date(dueDate) : undefined
  );
  const { mutate: updateTaskMutation } = useUpdateTask();
  const updateTaskDueDate = useStoreKanbanBoard(
    (state) => state.updateTaskDueDate
  );
  const handleRemove = () => {
    updateTaskDueDate(taskId, null);
    if (onDueDateChange) {
      onDueDateChange(null);
    } else {
      updateTaskMutation({ id: taskId, task: { due_date: null } });
    }
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const handleSave = (date: Date | undefined) => {
    const dueDate = date ? date.toISOString() : null;
    updateTaskDueDate(taskId, dueDate);
    if (onDueDateChange) {
      onDueDateChange(dueDate ?? null);
    } else {
      updateTaskMutation({ id: taskId, task: { due_date: dueDate } });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[580px]">
        <DialogHeader>
          <DialogTitle>Edit due date</DialogTitle>
          <DialogDescription>
            Due date — Issue needs to be completed by this date
          </DialogDescription>
        </DialogHeader>

        <Input
          readOnly
          value={formatInputDate(draftDate)}
          placeholder="MM/DD/YYYY"
        />

        <Calendar
          mode="single"
          selected={draftDate}
          onSelect={(date) => {
            setDraftDate(date);
            handleSave(date);
          }}
          numberOfMonths={2}
        />

        <DialogFooter>
          <Button variant="outline" className="mr-auto" onClick={handleRemove}>
            Remove due date
          </Button>
          <Button variant="ghost" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={() => handleSave(draftDate)}>Save due date</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
