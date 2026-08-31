import type { ComponentProps, ReactNode } from 'react';

import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

interface SettingRowProps extends Omit<ComponentProps<'div'>, 'children'> {
  label: ReactNode;
  hint?: ReactNode;
  /** Point the visible label at the control so it becomes the control's name. */
  htmlFor?: string;
  hintId?: string;
  children: ReactNode;
}

export function SettingRow({
  label,
  hint,
  htmlFor,
  hintId,
  className,
  children,
  ...props
}: SettingRowProps) {
  return (
    <div
      className={cn('flex items-start justify-between gap-5 py-4', className)}
      {...props}
    >
      <div className="min-w-0">
        {htmlFor ? (
          <Label htmlFor={htmlFor} className="text-sm font-medium leading-snug">
            {label}
          </Label>
        ) : (
          <div className="text-sm font-medium leading-snug text-foreground">{label}</div>
        )}
        {hint ? (
          <p id={hintId} className="mt-0.5 text-sm leading-snug text-pretty text-muted-foreground">
            {hint}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center pt-0.5">{children}</div>
    </div>
  );
}

interface SwitchRowProps {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

/** The most common settings row: a label + hint on the left, a switch on the right. */
export function SwitchRow({ id, label, hint, checked, onCheckedChange, disabled }: SwitchRowProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <SettingRow label={label} hint={hint} htmlFor={id} hintId={hintId}>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-describedby={hintId}
      />
    </SettingRow>
  );
}
