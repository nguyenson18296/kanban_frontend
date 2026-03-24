import { useState, useRef } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { DragDropProvider, type DragEndEvent } from "@dnd-kit/react";

import FormCreateNew from "./form-create-new";
import SubtaskItem from "./item";
import { useGetSubtasks } from "./hooks/use-get-subtasks";
import type { ICreateTaskDto, ITask } from "@/types";
import { useCreateSubtask } from "./hooks/use-create-subtask";
import { useReorderSubtask } from "./hooks/use-reorder-subtask";

interface SubtaskProps {
  taskId: string;
  teamId: number;
}

export default function Subtask({ taskId, teamId }: Readonly<SubtaskProps>) {
  const { data: subtasks } = useGetSubtasks(taskId);
  const { mutateAsync: createSubtaskMutation, isPending: isCreatingSubtask } = useCreateSubtask();
  const { mutate: reorderSubtaskMutation } = useReorderSubtask();

  const [localSubtasks, setLocalSubtasks] = useState<ITask[]>(subtasks?.data ?? []);
  const prevDataRef = useRef(subtasks?.data);
  if (subtasks?.data !== prevDataRef.current) {
    prevDataRef.current = subtasks?.data;
    setLocalSubtasks(subtasks?.data ?? []);
  }

  const handleSubmit = async (newSubtask: ICreateTaskDto) => {
    try {
      await createSubtaskMutation({ taskId, subtask: newSubtask });
      toast.success("Subtask created successfully");
    } catch (error) {
      toast.error("Failed to create subtask, please try again.");
      throw error;
    }
  };

  const handleDragEnd: DragEndEvent = (event) => {
    if (event.canceled) return;
    const { source, target } = event.operation;
    if (source && target && source.id !== target.id) {
      const sourceIndex = localSubtasks.findIndex((task) => task.id === source.id);
      const targetIndex = localSubtasks.findIndex((task) => task.id === target.id);
      if (sourceIndex !== -1 && targetIndex !== -1 && sourceIndex !== targetIndex) {
        const reordered = [...localSubtasks];
        const [draggedTask] = reordered.splice(sourceIndex, 1);
        reordered.splice(targetIndex, 0, draggedTask);
        setLocalSubtasks(reordered);
        const finalPosition = reordered.findIndex((t) => t.id === draggedTask.id);
        reorderSubtaskMutation({ taskId, subtaskId: draggedTask.id, position: finalPosition });
      }
    }
  };

  return (
    <div className="min-w-0">
      <Button variant="ghost" size="icon" className="w-max text-xs">
        <Plus className="size-3" />
        Add sub-issues
      </Button>
      <DragDropProvider
        onDragEnd={handleDragEnd}
      >
        <div className="flex min-w-0 flex-col gap-2 pb-4">
          {localSubtasks?.map((task, index) => (
            <SubtaskItem key={task.id} task={task} order={index} />
          ))}
        </div>
      </DragDropProvider>
      <FormCreateNew isLoading={isCreatingSubtask} subtaskCount={subtasks?.data?.length ?? 0} teamId={teamId} onSubmit={handleSubmit} />
    </div>
  );
}
