import { isToday } from "date-fns";
import { Inbox } from "lucide-react";

import type { INotification } from "@/types";
import NotificationItem from "./notification-item";

interface NotificationListProps {
  notifications: INotification[];
  onItemClick: (notification: INotification) => void;
  onMarkAsRead: (notification: INotification) => void;
  onFavorite: (notification: INotification) => void;
  onDelete: (notification: INotification) => void;
}

function SectionHeader({ label }: Readonly<{ label: string }>) {
  return (
    <div className="flex items-center gap-3 px-5 pt-4 pb-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5a5cf2]">
        {label}
      </span>
      <div className="h-px flex-1 bg-gradient-to-r from-[#5a5cf2]/20 to-transparent" />
    </div>
  );
}

export default function NotificationList({ notifications, onItemClick, onMarkAsRead, onFavorite, onDelete }: Readonly<NotificationListProps>) {
  const today: INotification[] = [];
  const earlier: INotification[] = [];

  for (const n of notifications) {
    if (isToday(new Date(n.created_at))) {
      today.push(n);
    } else {
      earlier.push(n);
    }
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-[#5a5cf2]/10">
          <Inbox className="size-5 text-[#5a5cf2]" />
        </div>
        <div>
          <p className="text-sm font-medium text-[#0f172a] m-0">All caught up</p>
          <p className="text-xs text-[#94a3b8] m-0 mt-1">No new notifications</p>
        </div>
      </div>
    );
  }

  const sections = [
    { label: "Today", items: today },
    { label: "Earlier", items: earlier },
  ].filter((s) => s.items.length > 0);

  let globalIndex = 0;

  return (
    <div className="py-1">
      {sections.map((section) => (
        <div key={section.label}>
          <SectionHeader label={section.label} />
          {section.items.map((n) => {
            const delay = globalIndex * 50;
            globalIndex++;
            return (
              <NotificationItem
                key={n.id}
                notification={n}
                onClick={onItemClick}
                onMarkAsRead={onMarkAsRead}
                onFavorite={onFavorite}
                onDelete={onDelete}
                animationDelay={delay}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
