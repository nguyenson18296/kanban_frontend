import type { ReactNode } from 'react';

import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface SelectFieldProps<T extends string> {
  id: string;
  label: string;
  value: T;
  onValueChange: (value: T) => void;
  options: readonly T[];
  hint?: ReactNode;
  className?: string;
  disabled?: boolean;
}

/** Labelled select whose option values double as their labels. */
export function SelectField<T extends string>({
  id,
  label,
  value,
  onValueChange,
  options,
  hint,
  className,
  disabled,
}: SelectFieldProps<T>) {
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <Label htmlFor={id}>{label}</Label>
      <Select
        value={value}
        onValueChange={(next) => {
          const match = options.find((option) => option === next);
          if (match !== undefined) onValueChange(match);
        }}
        disabled={disabled}
      >
        <SelectTrigger id={id} className="w-full" aria-describedby={hintId}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hint ? (
        <p id={hintId} className="text-sm text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
