import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ArrowRight, Ellipsis, CheckCheck, Star, Trash2 } from "lucide-react";
import { NotificationType } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { INotification } from "@/types";

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function NotificationContent({ notification }: Readonly<{ notification: INotification }>) {
  const { type, actor, payload } = notification;
  const actorName = actor.full_name;
  const taskTitle = (payload.task_title as string) ?? "a task";

  switch (type) {
    case NotificationType.COMMENT_MENTIONED:
      return (
        <p className="text-[13px] leading-[1.45] text-[#334155] m-0">
          <span className="font-semibold text-[#0f172a]">{actorName}</span>{" "}
          mentioned you in Task:{" "}
          <span className="font-semibold text-[#0f172a]">{taskTitle}</span>
        </p>
      );
    case NotificationType.TASK_ASSIGNED:
      return (
        <p className="text-[13px] leading-[1.45] text-[#334155] m-0">
          <span className="font-semibold text-[#0f172a]">{actorName}</span>{" "}
          assigned you to Task:{" "}
          <span className="font-semibold text-[#0f172a]">{taskTitle}</span>
        </p>
      );
    case NotificationType.COMMENT_CREATED:
      return (
        <>
          <p className="text-[13px] leading-[1.45] text-[#334155] m-0">
            <span className="font-semibold text-[#0f172a]">{actorName}</span>{" "}
            commented on Task:{" "}
            <span className="font-semibold text-[#0f172a]">{taskTitle}</span>
          </p>
          {payload.comment_preview && (
            <p className="text-[12px] leading-[1.4] text-[#94a3b8] m-0 mt-1.5 truncate italic">
              &ldquo;{payload.comment_preview as string}&rdquo;
            </p>
          )}
        </>
      );
    case NotificationType.TASK_UPDATED:
      return (
        <>
          <p className="text-[13px] leading-[1.45] text-[#334155] m-0">
            <span className="font-semibold text-[#0f172a]">{actorName}</span>{" "}
            moved Task:{" "}
            <span className="font-semibold text-[#0f172a]">{taskTitle}</span>
          </p>
          {payload.from_status && payload.to_status && (
            <div className="flex items-center gap-1.5 mt-2">
              <span className="inline-flex items-center rounded-md bg-[#f59e0b]/10 px-2 py-0.5 text-[11px] font-semibold text-[#d97706] uppercase tracking-wide ring-1 ring-[#f59e0b]/20 ring-inset">
                {payload.from_status as string}
              </span>
              <ArrowRight className="size-3 text-[#cbd5e1]" />
              <span className="inline-flex items-center rounded-md bg-[#5a5cf2]/10 px-2 py-0.5 text-[11px] font-semibold text-[#5a5cf2] uppercase tracking-wide ring-1 ring-[#5a5cf2]/20 ring-inset">
                {payload.to_status as string}
              </span>
            </div>
          )}
        </>
      );
    default:
      return (
        <p className="text-[13px] leading-[1.45] text-[#334155] m-0">
          <span className="font-semibold text-[#0f172a]">{actorName}</span>{" "}
          updated Task:{" "}
          <span className="font-semibold text-[#0f172a]">{taskTitle}</span>
        </p>
      );
  }
}

interface NotificationItemProps {
  notification: INotification;
  onClick: (notification: INotification) => void;
  onMarkAsRead: (notification: INotification) => void;
  onFavorite: (notification: INotification) => void;
  onDelete: (notification: INotification) => void;
  animationDelay?: number;
}

export default function NotificationItem({
  notification,
  onClick,
  onMarkAsRead,
  onFavorite,
  onDelete,
  animationDelay = 0,
}: Readonly<NotificationItemProps>) {
  const { actor, is_read, created_at } = notification;
  const [shouldAnimate] = useState(true);

  return (
    <div
      className={cn(
        "group relative flex w-full items-start gap-3 px-5 py-3.5 text-left transition-all duration-200",
        "hover:bg-white hover:shadow-[0_1px_3px_rgba(0,0,0,0.04)]",
        !is_read && "bg-white/70",
        shouldAnimate && "notification-item-animated",
      )}
      style={shouldAnimate ? { animationDelay: `${animationDelay}ms` } : undefined}
    >
      {/* Unread accent bar */}
      {!is_read && (
        <div className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full bg-[#5a5cf2]" />
      )}

      {/* Clickable content area */}
      <button
        type="button"
        className="flex min-w-0 flex-1 items-start gap-3 cursor-pointer bg-transparent border-none p-0 text-left"
        onClick={() => onClick(notification)}
      >
        <Avatar className="size-9 shrink-0 ring-2 ring-white shadow-sm">
          <AvatarImage src={actor.avatar_url} alt={actor.full_name} />
          <AvatarFallback className="bg-gradient-to-br from-[#5a5cf2] to-[#7c6cf5] text-[11px] font-semibold text-white">
            {getInitials(actor.full_name)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <NotificationContent notification={notification} />
          <p className="text-[11px] text-[#94a3b8] m-0 mt-1.5 font-medium">
            {formatDistanceToNow(new Date(created_at), { addSuffix: true })}
          </p>
        </div>
      </button>

      {/* Unread dot / Actions dropdown */}
      <div className="relative flex shrink-0 items-start pt-0.5">
        {!is_read && (
          <span className="notification-unread-dot mt-1 size-2 shrink-0 rounded-full bg-[#5a5cf2] transition-opacity duration-150 group-hover:opacity-0 group-focus-within:opacity-0" />
        )}

        <div className={cn(
          "absolute right-0 top-0 opacity-0 pointer-events-none transition-opacity duration-150",
          "group-hover:opacity-100 group-hover:pointer-events-auto",
          "group-focus-within:opacity-100 group-focus-within:pointer-events-auto",
        )}>
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 rounded-full"
                aria-label="Notification actions"
              >
                <Ellipsis className="size-4 text-[#94a3b8]" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={4} className="w-44">
              {!is_read && (
                <DropdownMenuItem onClick={() => onMarkAsRead(notification)}>
                  <CheckCheck className="size-4" />
                  Mark as read
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onFavorite(notification)}>
                <Star className="size-4" />
                Favorite
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={() => onDelete(notification)}>
                <Trash2 className="size-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
