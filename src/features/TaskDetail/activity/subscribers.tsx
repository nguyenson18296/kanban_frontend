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

import { useTaskSubscription } from "./hooks/use-task-subscription";

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
  const { subscribers, isSubscribed, toggle } = useTaskSubscription(taskId);

  const visible = subscribers.slice(0, VISIBLE_COUNT);
  const overflow = subscribers.length - visible.length;

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={toggle}
        aria-pressed={isSubscribed}
        className="cursor-pointer rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {isSubscribed ? "Unsubscribe" : "Subscribe"}
      </button>

      {subscribers.length > 0 && (
        <AvatarGroup>
          {visible.map((subscriber) => (
            <Tooltip key={subscriber.id}>
              <TooltipTrigger asChild>
                <Avatar size="sm">
                  {subscriber.avatar_url ? (
                    <AvatarImage
                      src={subscriber.avatar_url}
                      alt={subscriber.full_name}
                    />
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
