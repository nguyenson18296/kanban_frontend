import { useState } from "react";
import { Calendar, CalendarRange } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDate, DUE_DATE_OPTIONS, type DueDateOption } from "@/utils/date";
import EditDueDateModal from "../Modals/edit-due-date-modal";
import type { ITask } from "@/types";
interface DueDateDropdownProps {
  task: ITask;
  onDueDateChange: (date: string | null) => void;
  trigger?: React.ReactNode;
}

export default function DueDateDropdown({
  task,
  onDueDateChange,
  trigger,
}: Readonly<DueDateDropdownProps>) {
  const [editDueDateOpen, setEditDueDateOpen] = useState(false);
  const dueDate = task.due_date ? new Date(task.due_date) : null;
  
  const handleSelect = (getDate: () => Date | null) => {
    const date = getDate();
    onDueDateChange(date ? date.toISOString() : null);
  };

  const defaultTrigger = (
    <button
      type="button"
      className="flex w-full items-center justify-between rounded-md border px-2 py-1 text-[10px] hover:bg-accent"
    >
      <span className="flex items-center gap-2">
        <Calendar className="size-4 text-muted-foreground" />
        {dueDate
          ? formatDate(new Date(dueDate), { month: "short", day: "numeric" })
          : "No due date"}
      </span>
    </button>
  );

  return (
    <>
      {editDueDateOpen && (
        <EditDueDateModal
          task={task}
          open={editDueDateOpen}
          onOpenChange={setEditDueDateOpen}
        />
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {trigger ?? defaultTrigger}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuItem onSelect={() => setEditDueDateOpen(true)}>
            <CalendarRange className="size-4" />
            Custom...
          </DropdownMenuItem>
          {DUE_DATE_OPTIONS.map((option: DueDateOption) => (
            <DropdownMenuItem
              key={option.label}
              onSelect={() => handleSelect(option.getDate)}
            >
              <option.icon className="size-4" />
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
