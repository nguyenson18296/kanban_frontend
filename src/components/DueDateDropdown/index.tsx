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
  dueDate: ITask['due_date'];
  taskId: string;
  onDueDateChange: (date: string | null) => void;
  triggerClassName?: string;
}

export default function DueDateDropdown({
  dueDate,
  taskId,
  onDueDateChange,
  triggerClassName,
}: Readonly<DueDateDropdownProps>) {
  const [editDueDateOpen, setEditDueDateOpen] = useState(false);
  
  const handleSelect = (getDate: () => Date | null) => {
    const date = getDate();
    onDueDateChange(date ? date.toISOString() : null);
  };

  return (
    <>
      {editDueDateOpen && (
        <EditDueDateModal
          dueDate={dueDate}
          taskId={taskId}
          open={editDueDateOpen}
          onOpenChange={setEditDueDateOpen}
          onDueDateChange={onDueDateChange}
        />
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <DueDateDropdownTrigger
            dueDate={dueDate}
            className={triggerClassName}
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
