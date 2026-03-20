import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner"

import FormCreateNew from "./form-create-new";
import SubtaskItem from "./item";
import { useGetSubtasks } from "./hooks/use-get-subtasks";
import type { ICreateTaskDto } from "@/types/task.type";
import { useCreateSubtask } from "./hooks/use-create-subtask";

interface SubtaskProps {
  taskId: string;
  teamId: number;
}

export default function Subtask({ taskId, teamId }: Readonly<SubtaskProps>) {
  const { data: subtasks } = useGetSubtasks(taskId);
  const { mutateAsync: createSubtaskMutation, isPending: isCreatingSubtask } = useCreateSubtask();

  const handleSubmit = async (newSubtask: ICreateTaskDto) => {
    try {
      await createSubtaskMutation({ taskId, subtask: newSubtask });
      toast.success("Subtask created successfully");
    } catch (error) {
      toast.error("Failed to create subtask, please try again.");
      throw error;
    }
  };

  return (
    <div className="min-w-0">
      <Button variant="ghost" size="icon" className="w-max text-xs">
        <Plus className="size-3" />
        Add sub-issues
      </Button>
      <div className="flex min-w-0 flex-col gap-2 pb-4">
        {subtasks?.data?.map((task) => (
          <SubtaskItem key={task.id} task={task} />
        ))}
      </div>
      <FormCreateNew isLoading={isCreatingSubtask} subtaskCount={subtasks?.data?.length ?? 0} teamId={teamId} onSubmit={handleSubmit} />
    </div>
  );
}
