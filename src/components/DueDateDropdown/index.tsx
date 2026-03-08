import { useState } from "react";
import { CalendarRange } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DUE_DATE_OPTIONS, type DueDateOption } from "@/utils/date";
import EditDueDateModal from "../Modals/edit-due-date-modal";
import DueDateDropdownTrigger from "./trigger";

import type { ITask } from "@/types";
interface DueDateDropdownProps {
  task: ITask;
  onDueDateChange: (date: string | null) => void;
  trigger?: React.ReactNode;
}

export default function DueDateDropdown({
  task,
  onDueDateChange,
}: Readonly<DueDateDropdownProps>) {
  const [editDueDateOpen, setEditDueDateOpen] = useState(false);
  const dueDate = task.due_date ? new Date(task.due_date) : null;
  
  const handleSelect = (getDate: () => Date | null) => {
    const date = getDate();
    onDueDateChange(date ? date.toISOString() : null);
  };

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
          <DueDateDropdownTrigger
            dueDate={dueDate ? dueDate.toISOString() : null}
          />
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
