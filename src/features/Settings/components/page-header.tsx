import type { ReactNode } from 'react';

interface SettingsPageHeaderProps {
  title: string;
  description: string;
  /** Optional primary action rendered opposite the title (e.g. "Invite people"). */
  action?: ReactNode;
}

export function SettingsPageHeader({ title, description, action }: SettingsPageHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        <p className="mt-1.5 max-w-[62ch] text-sm leading-relaxed text-pretty text-muted-foreground">
          {description}
        </p>
      </div>
      {action}
    </div>
  );
}
