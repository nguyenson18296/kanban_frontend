import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

interface FeatureToggleCardProps {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** Extra content rendered below the toggle row (usage meters, notes…). */
  children?: ReactNode;
  className?: string;
}

/** A hero card that switches a whole feature on or off. */
export function FeatureToggleCard({
  id,
  icon: Icon,
  title,
  description,
  checked,
  onCheckedChange,
  children,
  className,
}: FeatureToggleCardProps) {
  const hintId = `${id}-hint`;
  return (
    <Card aria-label={title} className={cn('gap-0 overflow-hidden py-0', className)}>
      <div className="flex flex-wrap items-start justify-between gap-5 px-6 py-6">
        <div className="flex min-w-[220px] flex-1 gap-3.5">
          <div
            aria-hidden="true"
            className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary [&>svg]:size-5"
          >
            <Icon strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <label htmlFor={id} className="text-sm font-bold tracking-tight text-foreground">
              {title}
            </label>
            <p id={hintId} className="mt-0.5 text-sm leading-snug text-muted-foreground">
              {description}
            </p>
          </div>
        </div>
        <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} aria-describedby={hintId} />
      </div>
      {children}
    </Card>
  );
}
