import { Badge } from "@/components/ui/badge";
import type { ITask } from "@/types";

type TaskDetailHeaderProps = Pick<ITask, 'title' | 'ticket_id' | 'created_at' | 'creator'>;

export default function TaskDetailHeader({ title, ticket_id, created_at, creator }: Readonly<TaskDetailHeaderProps>) {
  return (
    <div>
      <h1 className="text-3xl font-bold text-primary">
        {title}
      </h1>
      <div className="flex items-center gap-2 mt-2">
        <Badge variant="outline" className="p-1.5 px-2">
          {ticket_id}
        </Badge>
        {creator && (
          <p className="text-sm text-muted-foreground">
            Created by <span className="text-[#5a5cf2]">{creator.full_name}</span> on {created_at}
          </p>
        )}
      </div>
    </div>
  );
}
