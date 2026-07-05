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
import { useUserPresence } from "@/hooks/use-presence";
import { cn } from "@/lib/utils";
import { formatJoinedDate } from "@/utils/date";

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

function getInitials(name: string): string {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  return initials || "?";
}

function getDisplayName(name: string): string {
  return name.trim().replace(/\s+/g, " ") || "Unknown user";
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
  const displayName = getDisplayName(user.full_name);

  // Auto-derive presence from the global store unless the caller passes an
  // explicit override (e.g. the current user's own avatar, where the answer
  // is known without a store subscription). `undefined` flows through as
  // "unknown" so the hover card doesn't fabricate a status (contract §9).
  const presence = useUserPresence(user.id, isOnline === undefined);
  const effectiveIsOnline = isOnline ?? presence?.isOnline;

  return (
    <HoverCard openDelay={openDelay} closeDelay={closeDelay}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          aria-label={`View profile for ${displayName}`}
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
              alt={displayName}
            />
            <AvatarFallback aria-hidden="true">{initials}</AvatarFallback>
            {effectiveIsOnline ? (
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
        displayName={displayName}
        isOnline={effectiveIsOnline}
        initials={initials}
      />
    </HoverCard>
  );
}

interface UserHoverCardContentProps {
  user: UserAvatarUser;
  displayName: string;
  isOnline?: boolean;
  initials: string;
}

function UserHoverCardContent({
  user,
  displayName,
  isOnline,
  initials,
}: Readonly<UserHoverCardContentProps>) {
  const joinedLabel = formatJoinedDate(user.created_at);

  // Status row is presence-driven, not is_active-driven. is_active is the
  // account-enabled flag (almost always true) and conveys nothing useful
  // here unless the account is deactivated.
  let statusLabel: string | null;
  if (user.is_active === false) {
    statusLabel = "Inactive";
  } else if (isOnline === true) {
    statusLabel = "Online";
  } else if (isOnline === false) {
    statusLabel = "Offline";
  } else {
    statusLabel = null;
  }
  const showFooter = statusLabel !== null || joinedLabel !== null;

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
            title={displayName}
          >
            {displayName}
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
          {statusLabel === null ? (
            <span />
          ) : (
            <div className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className={cn(
                  "size-1.5 rounded-full",
                  statusLabel === "Online"
                    ? "bg-emerald-500"
                    : "bg-muted-foreground/40",
                )}
              />
              <span>{statusLabel}</span>
            </div>
          )}
          {joinedLabel ? <span>Joined {joinedLabel}</span> : null}
        </div>
      ) : null}
    </HoverCardContent>
  );
}
