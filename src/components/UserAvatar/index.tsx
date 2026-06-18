import { format } from "date-fns";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface UserAvatarUser {
  id: string;
  full_name: string;
  avatar_url: string | null;
  email?: string;
  role?: string;
  is_active?: boolean;
  created_at?: string;
}

interface UserAvatarProps {
  user: UserAvatarUser;
  size?: "sm" | "default" | "lg";
  isOnline?: boolean;
  className?: string;
  openDelay?: number;
  closeDelay?: number;
}

const JOINED_FORMAT = "MMM yyyy";

function getInitials(name: string): string {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  return initials || "?";
}

function formatJoined(iso: string): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return format(date, JOINED_FORMAT);
}

export function UserAvatar({
  user,
  size = "default",
  isOnline,
  className,
  openDelay = 200,
  closeDelay = 100,
}: Readonly<UserAvatarProps>) {
  const initials = getInitials(user.full_name);

  return (
    <HoverCard openDelay={openDelay} closeDelay={closeDelay}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          aria-label={`View profile for ${user.full_name}`}
          className={cn(
            "relative inline-flex rounded-full outline-hidden",
            "transition-[transform,box-shadow] duration-150 ease-out",
            "hover:ring-2 hover:ring-ring/40 hover:ring-offset-2 hover:ring-offset-background",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          )}
        >
          <Avatar size={size} className={className}>
            <AvatarImage
              src={user.avatar_url ?? undefined}
              alt={user.full_name}
            />
            <AvatarFallback aria-hidden="true">{initials}</AvatarFallback>
            {isOnline ? (
              <AvatarBadge
                role="status"
                aria-label="Online"
                className="bg-emerald-500 dark:bg-emerald-400"
              />
            ) : null}
          </Avatar>
        </button>
      </HoverCardTrigger>
      <UserHoverCardContent
        user={user}
        isOnline={isOnline}
        initials={initials}
      />
    </HoverCard>
  );
}

interface UserHoverCardContentProps {
  user: UserAvatarUser;
  isOnline?: boolean;
  initials: string;
}

function UserHoverCardContent({
  user,
  isOnline,
  initials,
}: Readonly<UserHoverCardContentProps>) {
  const joinedLabel = user.created_at ? formatJoined(user.created_at) : null;
  const hasStatus = isOnline !== undefined || user.is_active !== undefined;
  const showFooter = hasStatus || joinedLabel !== null;
  const isInactive = user.is_active === false;

  let statusLabel: string;
  if (isOnline) {
    statusLabel = "Online";
  } else if (isInactive) {
    statusLabel = "Inactive";
  } else {
    statusLabel = "Active";
  }

  return (
    <HoverCardContent align="start" sideOffset={8} className="w-72 p-4">
      <div className="flex items-start gap-3">
        <Avatar size="lg" className="size-14">
          <AvatarImage src={user.avatar_url ?? undefined} alt="" />
          <AvatarFallback className="text-base" aria-hidden="true">
            {initials}
          </AvatarFallback>
          {isOnline ? (
            <AvatarBadge
              aria-hidden="true"
              className="size-3.5 bg-emerald-500 dark:bg-emerald-400"
            />
          ) : null}
        </Avatar>
        <div className="min-w-0 flex-1">
          <p
            className="truncate text-sm font-semibold leading-tight text-foreground"
            title={user.full_name}
          >
            {user.full_name}
          </p>
          {user.email ? (
            <p
              className="truncate text-xs text-muted-foreground"
              title={user.email}
            >
              {user.email}
            </p>
          ) : null}
          {user.role ? (
            <Badge variant="secondary" className="mt-1.5 capitalize">
              {user.role}
            </Badge>
          ) : null}
        </div>
      </div>
      {showFooter ? (
        <div className="mt-3 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
          {hasStatus ? (
            <div className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className={cn(
                  "size-1.5 rounded-full",
                  isOnline || user.is_active !== false
                    ? "bg-emerald-500"
                    : "bg-muted-foreground/40",
                )}
              />
              <span>{statusLabel}</span>
            </div>
          ) : (
            <span />
          )}
          {joinedLabel ? <span>Joined {joinedLabel}</span> : null}
        </div>
      ) : null}
    </HoverCardContent>
  );
}
