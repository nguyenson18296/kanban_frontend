import { Badge } from "@/components/ui/badge";

export default function TaskDetailHeader() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-primary">
        Task Detail Header
      </h1>
      <div className="flex items-center gap-2 mt-2">
        <Badge variant="outline" className="p-1.5 px-2">
          TASK-1123
        </Badge>
        <p className="text-sm text-muted-foreground">
          Created by <span className="text-[#5a5cf2]">John Doe</span> on March 1, 2026
        </p>
      </div>
    </div>
  );
}
