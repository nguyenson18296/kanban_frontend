import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { useSubscribers } from "./hooks/use-subscribers";
import { useSubscriptionStatus } from "./hooks/use-subscription-status";
import { useToggleSubscription } from "./hooks/use-toggle-subscription";

const VISIBLE_COUNT = 3;

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function Subscribers({ taskId }: Readonly<{ taskId: string }>) {
  const { data: status, isLoading: isStatusLoading } =
    useSubscriptionStatus(taskId);
  const { data: subscribersData } = useSubscribers(taskId);
  const toggle = useToggleSubscription(taskId);

  const isSubscribed = status?.subscribed ?? false;
  const subscribers = subscribersData?.items ?? [];

  const visible = subscribers.slice(0, VISIBLE_COUNT);
  const overflow = subscribers.length - visible.length;

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => toggle.mutate(!isSubscribed)}
        aria-pressed={isSubscribed}
        aria-busy={toggle.isPending}
        disabled={isStatusLoading || toggle.isPending}
        className="cursor-pointer rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-60"
      >
        {isSubscribed ? "Unsubscribe" : "Subscribe"}
      </button>

      {subscribers.length > 0 && (
        <AvatarGroup>
          {visible.map((subscriber) => (
            <Tooltip key={subscriber.user_id}>
              <TooltipTrigger asChild>
                <Avatar
                  size="sm"
                  role="img"
                  tabIndex={0}
                  aria-label={subscriber.full_name}
                  className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {subscriber.avatar_url ? (
                    // Decorative — the name is on the labeled `role="img"` parent.
                    <AvatarImage src={subscriber.avatar_url} alt="" />
                  ) : null}
                  <AvatarFallback>
                    {getInitials(subscriber.full_name)}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>{subscriber.full_name}</TooltipContent>
            </Tooltip>
          ))}
          {overflow > 0 && (
            <AvatarGroupCount className="size-6">
              <span className="text-xs">+{overflow}</span>
            </AvatarGroupCount>
          )}
        </AvatarGroup>
      )}
    </div>
  );
}
