import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

import FormCreateNew from "./form-create-new";
import SubtaskItem from "./item";
import { useGetSubtasks } from "./hooks/use-get-subtasks";

interface SubtaskProps {
  taskId: string;
}

export default function Subtask({ taskId }: Readonly<SubtaskProps>) {
  const { data: subtasks } = useGetSubtasks(taskId);

  return (
    <div className="min-w-0">
      <Button variant="ghost" size="icon" className="w-max text-xs">
        <Plus className="size-3" />
        Add sub-issues
      </Button>
      <div className="flex min-w-0 flex-col gap-2 pb-4">
        {subtasks?.data?.map((subtask) => (
          <SubtaskItem key={subtask.id} task={subtask} />
        ))}
      </div>
      <FormCreateNew />
    </div>
  );
}
