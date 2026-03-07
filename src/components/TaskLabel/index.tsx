import type { ILabel } from "@/types";

interface TaskLabelProps {
  label: ILabel;
}

export default function TaskLabel({ label }: Readonly<TaskLabelProps>) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-0.5 text-xs font-medium text-foreground">
      <span
        className="size-2 shrink-0 rounded-full"
        style={{ backgroundColor: label.color }}
      />
      {label.name}
    </span>
  );
}
