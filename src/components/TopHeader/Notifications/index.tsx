import { useState } from "react";
import { Bell } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useStoreUser } from "@/stores/use-store-user";
import { NotificationType } from "@/types";
import type { INotification } from "@/types";

import NotificationList from "./notification-list";
import { useGetNotifications } from "./hooks/use-get-notifications";
import { useGetUnreadCount } from "./hooks/use-get-unread-count";
import { useMarkAllAsRead } from "./hooks/use-mark-as-read";
import { useDeleteNotification } from "./hooks/use-delete-notification";

export default function Notifications() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();
  const { user } = useStoreUser();

  const { data: notificationsResponse } = useGetNotifications({ page: 1, limit: 20 }, user?.id ?? "");
  const { data: unreadCountData } = useGetUnreadCount();
  const { mutate: markAllAsRead } = useMarkAllAsRead();
  const { mutate: deleteNotificationMutation } = useDeleteNotification();

  const notifications = notificationsResponse?.data ?? [];
  const unreadCount = unreadCountData?.count ?? 0;

  // Prefix match: invalidates both ["notifications", ...] list and ["notifications", "unread-count"]
  const invalidateNotifications = () => queryClient.invalidateQueries({ queryKey: ["notifications"] });

  const mutationCallbacks = {
    onSuccess: () => invalidateNotifications(),
    onError: () => toast.error("Something went wrong, please try again."),
  };

  const handleMarkAllAsRead = () => {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;

    markAllAsRead(unreadIds, mutationCallbacks);
  };

  const handleItemClick = (notification: INotification) => {
    setOpen(false);

    // Navigate immediately
    const { payload } = notification;
    const ticketId = payload.ticket_id as string | undefined;
    const commentId = payload.comment_id as string | undefined;
    const projectId = router.latestLocation.pathname.match(/\/projects\/([^/]+)/)?.[1];

    if (projectId && ticketId) {
      const hash = notification.type === NotificationType.COMMENT_MENTIONED && commentId
        ? `comment-${commentId}`
        : "";

      router.navigate({
        to: "/projects/$projectId/tasks/$taskId",
        params: { projectId, taskId: ticketId },
        hash,
      });
    }

    // Mark as read in background
    if (!notification.is_read) {
      markAllAsRead([notification.id], mutationCallbacks);
    }
  };

  const handleMarkAsRead = (notification: INotification) => {
    markAllAsRead([notification.id], mutationCallbacks);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleFavorite = (_notification: INotification) => {
    // TODO: implement favorite API
  };

  const handleDelete = (notification: INotification) => {
    deleteNotificationMutation(notification.id, mutationCallbacks);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon-lg"
          className="bell-trigger relative rounded-full transition-transform duration-200 hover:scale-105"
          aria-label="Open notifications"
        >
          <Bell className="bell-icon h-5 w-4" />
          {unreadCount > 0 && (
            <span className="notification-badge-pulse absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-white bg-[#5a5cf2] px-1 text-[10px] font-bold leading-none text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="notification-panel w-[420px] p-0 rounded-2xl border-none shadow-[0_24px_48px_-12px_rgba(0,0,0,0.18)]"
      >
          {/* Header with gradient */}
          <div className="relative px-5 py-4 bg-gradient-to-r from-[#5a5cf2] to-[#7c6cf5]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <h2 className="text-[17px] font-bold text-white m-0 tracking-[-0.01em]">
                  Notifications
                </h2>
                {unreadCount > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[20px] h-5 rounded-full bg-white/20 px-1.5 text-[11px] font-semibold text-white backdrop-blur-sm">
                    {unreadCount}
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  className="text-[13px] font-medium text-white/80 hover:text-white cursor-pointer bg-transparent border-none transition-colors duration-200"
                  onClick={handleMarkAllAsRead}
                >
                  Mark all as read
                </button>
              )}
            </div>
          </div>

          {/* Notification list */}
          <div className="max-h-[440px] overflow-y-auto bg-[#fafbfc]">
            <NotificationList
              notifications={notifications}
              onItemClick={handleItemClick}
              onMarkAsRead={handleMarkAsRead}
              onFavorite={handleFavorite}
              onDelete={handleDelete}
            />
          </div>

          {/* Footer */}
          <div className="border-t border-[#e2e8f0] bg-white p-2.5 text-center">
            <button
              type="button"
              className="w-full rounded-lg py-2 text-[13px] font-semibold text-[#5a5cf2] hover:bg-[#5a5cf2]/5 cursor-pointer bg-transparent border-none transition-colors duration-200"
              onClick={() => setOpen(false)}
            >
              See all notifications
            </button>
          </div>
      </PopoverContent>
    </Popover>
  );
}
