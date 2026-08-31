import { useId, type ComponentProps, type ReactNode } from 'react';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface SettingsCardProps extends Omit<ComponentProps<typeof Card>, 'title'> {
  title: string;
  description?: string;
  /** Header action slot (a small button, search box…). */
  action?: ReactNode;
}

/**
 * A titled settings section. Renders as a `<section>` labelled by its heading
 * so screen readers can jump between groups of settings.
 */
export function SettingsCard({
  title,
  description,
  action,
  className,
  children,
  ...props
}: SettingsCardProps) {
  const headingId = useId();

  return (
    <Card
      aria-labelledby={headingId}
      role="region"
      className={cn('gap-0 overflow-hidden py-0', className)}
      {...props}
    >
      <div className="flex flex-wrap items-start justify-between gap-4 px-6 pt-5">
        <div className="min-w-0">
          <h2 id={headingId} className="text-[15px] font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          {description ? (
            <p className="mt-1 text-sm leading-snug text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </Card>
  );
}

/** Padded card body. Use `SettingRows` when the body is a list of rows. */
export function SettingsCardBody({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('px-6 py-5', className)} {...props} />;
}

/** A body whose direct children are `SettingRow`s separated by hairlines. */
export function SettingRows({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('px-6 py-1 *:border-t *:first:border-t-0', className)} {...props} />;
}

export function SettingsCardFooter({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-end gap-2 border-t bg-muted/40 px-6 py-3.5',
        className,
      )}
      {...props}
    />
  );
}
