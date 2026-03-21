import type { ILabel } from "@/types";

interface StackedLabelsProps extends React.ComponentPropsWithoutRef<"button"> {
  labels: ILabel[];
  ref?: React.Ref<HTMLButtonElement>;
}

export default function StackedLabels({ labels, ref, ...props }: Readonly<StackedLabelsProps>) {
  return (
    <button type="button" ref={ref} className="flex items-center" {...props}>
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
