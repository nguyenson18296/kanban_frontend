import { useState } from "react";
import { ChevronDown, Signal, UserRound, Plus } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

import AssigneeDropdown from "@/components/AssigneeDropdown";
import PriorityDropdown from "@/components/PriorityDropdown";
import StatusDropdown from "@/components/StatusDropdown";
import TaskLabel from "@/components/TaskLabel";
import TaskLabelDropdown from "@/components/TaskLabelDropdown";
import DueDateDropdown from "@/components/DueDateDropdown";

import type { ILabel, ITask, Priority, TAssignee } from "@/types";
import { PRIORITY_OPTIONS } from "@/constants/priority";
import { cn } from "@/lib/utils";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface TaskDetailSidebarProps {
  id: string;
  column_id: number;
  assignees: TAssignee[];
  due_date: ITask['due_date'];
  onAssigneeChange: (assignees: TAssignee[]) => void;
  priority: Priority;
  onPriorityChange: (priority: Priority) => void;
  labels: ILabel[];
  onLabelsChange: (labels: ILabel[]) => void;
  onDueDateChange: (date: string | null) => void;
}

export default function TaskDetailSidebar({
  assignees,
  priority,
  id,
  column_id,
  due_date,
  onAssigneeChange,
  onPriorityChange,
  labels,
  onLabelsChange,
  onDueDateChange,
}: Readonly<TaskDetailSidebarProps>) {
  const [localAssignees, setLocalAssignees] = useState<TAssignee[]>(assignees);
  const [localPriority, setLocalPriority] = useState<Priority>(priority);
  const [localLabels, setLocalLabels] = useState<ILabel[]>(labels);
  const [localColumnId, setLocalColumnId] = useState(column_id);
  const [localDueDate, setLocalDueDate] = useState<ITask['due_date']>(due_date);

  const handleAssigneeChange = (assignees: TAssignee[]) => {
    setLocalAssignees(assignees);
    onAssigneeChange(assignees);
  };

  const handlePriorityChange = (priority: Priority) => {
    setLocalPriority(priority);
    onPriorityChange(priority);
  };

  const handleLabelsChange = (labels: ILabel[]) => {
    setLocalLabels(labels);
    onLabelsChange(labels);
  };

  const handleDueDateChange = (date: string | null) => {
    setLocalDueDate(date);
    onDueDateChange(date);
  };

  const assigneeTrigger = (
    <button
      type="button"
      className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-accent"
    >
      {localAssignees.length > 0 ? (
        <span className="flex items-center gap-2">
          <Avatar className="size-5">
            <AvatarImage src={localAssignees[0].avatar_url} />
            <AvatarFallback className="text-[10px]">
              {getInitials(localAssignees[0].full_name)}
            </AvatarFallback>
          </Avatar>
          <span>
            {localAssignees[0].full_name}
            {localAssignees.length > 1 && (
              <span className="text-muted-foreground">
                {" "}
                +{localAssignees.length - 1}
              </span>
            )}
          </span>
        </span>
      ) : (
        <span className="flex items-center gap-2 text-muted-foreground">
          <UserRound className="size-4" />
          Unassigned
        </span>
      )}
      <ChevronDown className="size-4 text-muted-foreground" />
    </button>
  );

  const priorityTrigger = (
    <button
      type="button"
      className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-accent"
    >
      <span className="flex items-center gap-2">
        <Signal
          className={cn(
            "size-4",
            PRIORITY_OPTIONS.find((o) => o.value === localPriority)?.color,
          )}
        />
        {PRIORITY_OPTIONS.find((o) => o.value === localPriority)?.label}
      </span>
    </button>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Properties</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <AssigneeDropdown
          assignees={localAssignees}
          onAssigneeChange={handleAssigneeChange}
          trigger={assigneeTrigger}
        />
        <PriorityDropdown
          priority={localPriority}
          onPriorityChange={handlePriorityChange}
          trigger={priorityTrigger}
        />
        <StatusDropdown id={id} column_id={localColumnId} onStatusChange={setLocalColumnId} />
        <Separator />
        <div>
          <Label>Labels</Label>
          <div className="mt-2 flex items-center flex-wrap gap-1">
            {localLabels.map((label) => (
              <TaskLabel key={label.id} label={label} />
            ))}
            <TaskLabelDropdown
              selectedLabels={localLabels}
              trigger={
                <Button
                  variant="outline"
                  size="icon"
                  className="size-6 border-none"
                >
                  <Plus />
                </Button>
              }
              onLabelsChange={handleLabelsChange}
            />
          </div>
        </div>
        <Separator />
        <div>
          <Label className="my-2">Due date</Label>
          <DueDateDropdown dueDate={localDueDate} taskId={id} onDueDateChange={handleDueDateChange} triggerClassName="w-[100px] h-8" />
        </div>
      </CardContent>
    </Card>
  );
}
