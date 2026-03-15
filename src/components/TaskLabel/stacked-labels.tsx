import type { ILabel } from "@/types";

interface StackedLabelsProps {
  labels: ILabel[];
}

export default function StackedLabels({ labels }: Readonly<StackedLabelsProps>) {
  return (
    <button type="button" className="flex items-center">
      {labels.map((label, index) => (
        <span
          key={label.id}
          className="relative inline-flex max-w-[72px] items-center gap-1 truncate rounded-full border border-border bg-background px-2 py-0.5 text-xs font-medium text-foreground"
          style={{
            zIndex: labels.length - index,
            marginLeft: index > 0 ? -8 : 0,
          }}
        >
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: label.color }}
          />
          <span className="truncate">{label.name}</span>
        </span>
      ))}
    </button>
  );
}
