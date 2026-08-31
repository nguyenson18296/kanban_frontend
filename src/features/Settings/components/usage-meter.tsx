import { cn } from '@/lib/utils';

interface UsageSegment {
  label: string;
  value: number;
  className: string;
}

interface UsageMeterProps {
  /** Accessible name for the meter (e.g. "Monthly credits"). */
  label: string;
  max: number;
  segments: readonly UsageSegment[];
  className?: string;
  /** Show a coloured legend under the bar (only useful with 2+ segments). */
  showLegend?: boolean;
  size?: 'sm' | 'default';
}

/** Horizontal usage bar; stacks several segments when given more than one. */
export function UsageMeter({
  label,
  max,
  segments,
  className,
  showLegend = false,
  size = 'default',
}: UsageMeterProps) {
  const used = segments.reduce((sum, segment) => sum + segment.value, 0);
  const safeMax = max > 0 ? max : 1;

  return (
    <div className={className}>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={Math.min(used, max)}
        className={cn(
          'flex w-full overflow-hidden rounded-full bg-muted',
          size === 'default' ? 'h-2' : 'h-1.5',
        )}
      >
        {segments.map((segment) => (
          <div
            key={segment.label}
            className={cn('h-full', segment.className)}
            style={{ width: `${Math.min(100, (segment.value / safeMax) * 100)}%` }}
          />
        ))}
      </div>
      {showLegend ? (
        <ul className="mt-3 flex flex-wrap gap-4 text-xs font-medium text-muted-foreground">
          {segments.map((segment) => (
            <li key={segment.label} className="inline-flex items-center gap-2">
              <span aria-hidden="true" className={cn('size-2 rounded-[3px]', segment.className)} />
              {segment.label}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
