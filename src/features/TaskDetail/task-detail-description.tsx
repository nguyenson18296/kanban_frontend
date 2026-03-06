import { useEffect, useRef, useState } from "react";
import type { ITask } from "@/types";

import Editor from "@/components/Editor";
import { useDebounce } from "@/hooks/use-debounce";
import { useUpdateTask } from "@/features/KanbanBoard/hooks/use-update-task";

type TaskDetailDescriptionProps = Pick<ITask, "id" | "description">;

export default function TaskDetailDescription({
  id,
  description,
}: Readonly<TaskDetailDescriptionProps>) {
  const [localDescription, setLocalDescription] = useState(description);
  const { mutate: updateTaskMutation } = useUpdateTask();
  const debouncedDescription = useDebounce(localDescription, 2000);
  const serverValueRef = useRef(description);

  // Only mutate when the debounced value differs from the last known server value
  useEffect(() => {
    if (debouncedDescription === serverValueRef.current) return;
    serverValueRef.current = debouncedDescription;
    updateTaskMutation({ id, task: { description: debouncedDescription } });
  }, [debouncedDescription, id, updateTaskMutation]);

  return (
    <div className="my-4">
      <Editor description={localDescription} onChange={setLocalDescription} />
    </div>
  );
}
