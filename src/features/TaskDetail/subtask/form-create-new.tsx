import { useRef, useState } from "react";
import Editor from "@/components/Editor";
import { Plus, Loader2 } from "lucide-react";

import PriorityDropdown from "@/components/PriorityDropdown";
import StatusDropdown from "@/components/StatusDropdown";
import AssigneeDropdown from "@/components/AssigneeDropdown";
import { Button } from "@/components/ui/button";
import type { ICreateTaskDto, TAssignee } from "@/types/task.type";
import { useStoreKanbanBoard } from "@/stores/use-store-kanban-board";
import { PRIORITY_OPTIONS } from "@/constants/priority";
import { cn } from "@/lib/utils";

interface FormCreateNewProps {
  isLoading: boolean;
  subtaskCount: number;
  teamId: number;
  onSubmit: (subtask: ICreateTaskDto) => Promise<void>;
}

export default function FormCreateNew({ isLoading, subtaskCount, teamId, onSubmit }: Readonly<FormCreateNewProps>) {
  const titleRef = useRef<HTMLDivElement>(null);
  const [editorKey, setEditorKey] = useState(0);

  const defaultColumnId = useStoreKanbanBoard(
    (state) => state.kanbanBoard?.columns[0]?.id ?? 0,
  );
  const boardReady = defaultColumnId !== 0;

  const makeInitialSubtask = (): ICreateTaskDto => ({
    title: "",
    description: "",
    status: "open",
    priority: "no_priority",
    column_id: defaultColumnId,
    position: subtaskCount,
    team_id: teamId,
    due_date: null,
    assignee_ids: [],
    label_ids: [],
  });

  const [subtask, setSubtask] = useState<ICreateTaskDto>(makeInitialSubtask);
  const [assignees, setAssignees] = useState<TAssignee[]>([]);

  const selectedColumn = useStoreKanbanBoard(
    (state) => state.kanbanBoard?.columns.find((col) => col.id === subtask.column_id),
  );

  const resetForm = () => {
    setSubtask(makeInitialSubtask());
    setAssignees([]);
    if (titleRef.current) titleRef.current.textContent = "";
    setEditorKey((k) => k + 1);
  };

  const handleSubmit = async () => {
    if (!subtask.title.trim() || !boardReady) return;
    try {
      await onSubmit(subtask);
      resetForm();
    } catch {
      // parent handles error toast
    }
  };

  const handleTaskUpdate = (partial: Partial<ICreateTaskDto>) => {
    setSubtask((prev) => ({ ...prev, ...partial }));
  };

  const handleAssigneeChange = (newAssignees: TAssignee[]) => {
    setAssignees(newAssignees);
    setSubtask((prev) => ({ ...prev, assignee_ids: newAssignees.map((a) => a.id) }));
  };

  const handleTitleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.innerHTML === "<br>") el.innerHTML = "";
    setSubtask((prev) => ({ ...prev, title: (el.textContent ?? "").trim() }));
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") e.preventDefault();
  };

  const handleDescriptionChange = (value: string) => {
    setSubtask((prev) => ({ ...prev, description: value }));
  };

  const currentPriority = PRIORITY_OPTIONS.find((o) => o.value === subtask.priority) ?? PRIORITY_OPTIONS[0];
  const PriorityIcon = currentPriority.icon;

  const priorityTrigger = (
    <Button variant="outline" size="icon" className="text-xs size-[30px]">
      <PriorityIcon className={cn("size-4", currentPriority.color)} />
    </Button>
  );

  const statusTrigger = (
    <Button variant="outline" size="icon" className="text-xs h-[30px] w-max px-2 flex items-center gap-2">
      <span
        className="size-3 shrink-0 rounded-full"
        style={{ backgroundColor: selectedColumn?.color }}
      />
      <span className="text-xs">{selectedColumn?.name}</span>
    </Button>
  );

  return (
    <div className="flex flex-1 bg-[lch(100_0_282)] shadow-[lch(0_0_0_/_0.02)_0px_6px_18px,lch(0_0_0_/_0.04)_0px_3px_9px,lch(0_0_0_/_0.04)_0px_1px_1px] px-2.5 py-1.5 rounded-lg border border-solid border-[lch(90.55_0_282)] border-[lch(95.95_0_282)] w-full">
      <div className="w-full px-0">
        <div
        className="text-sm font-medium leading-none text-[#0f172a] outline-none px-4 py-1">
          <div className="flex items-center gap-2">
            <span
              className="size-3 shrink-0 rounded-full"
              style={{ backgroundColor: selectedColumn?.color ?? "#6b7280" }}
            />
            <div
              ref={titleRef}
              contentEditable="true"
              role="textbox"
              aria-label="Task title"
              data-placeholder="Add title..."
              className="whitespace-pre-wrap h-6 flex items-center text-[#1b1b1b] empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground outline-none focus:outline-none focus:ring-0 focus:ring-offset-0"
              onInput={handleTitleInput}
              onKeyDown={handleTitleKeyDown}
            />
          </div>
        </div>
        <Editor
          key={editorKey}
          placeholder="Add description..."
          description=""
          onChange={handleDescriptionChange}
          className="border-none outline-none focus-within:ring-0 focus-within:ring-offset-0 p-0"
          editorClassName="!min-h-10 !py-1"
          editable={true}
        />
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-2">
            <PriorityDropdown priority={subtask.priority} onPriorityChange={(priority) => handleTaskUpdate({ priority })} trigger={priorityTrigger} />
            <StatusDropdown
              column_id={subtask.column_id}
              onStatusChange={(column_id) => handleTaskUpdate({ column_id })}
              trigger={statusTrigger}
            />
            <AssigneeDropdown
              assignees={assignees}
              onAssigneeChange={handleAssigneeChange}
            />
            <Button variant="outline" size="icon" className="w-max text-xs size-[30px]">
              <Plus className="size-4" />
            </Button>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="w-max text-xs size-[30px]" onClick={resetForm}>
              Cancel
            </Button>
            <Button
              variant="outline" size="icon" className="w-max text-xs min-w-[90px]"
              onClick={handleSubmit}
              disabled={isLoading || !boardReady}
            >
              {isLoading ? <Loader2 className="size-4 animate-spin" /> : "Create"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
