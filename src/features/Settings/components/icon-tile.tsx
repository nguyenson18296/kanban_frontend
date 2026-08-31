import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

interface IconTileProps {
  icon: LucideIcon;
  className?: string;
  /** Tile size in Tailwind `size-*` units; icon scales with it. */
  size?: 'sm' | 'default';
}

/** Rounded square icon holder used for feature/agent/template rows. */
export function IconTile({ icon: Icon, className, size = 'default' }: IconTileProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'flex shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary',
        size === 'default' ? 'size-10 [&>svg]:size-5' : 'size-9 rounded-[10px] [&>svg]:size-4',
        className,
      )}
    >
      <Icon strokeWidth={2} />
    </div>
  );
}
