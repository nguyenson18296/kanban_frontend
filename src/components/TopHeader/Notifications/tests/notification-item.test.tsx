import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { NotificationType } from "@/types";
import type { INotification } from "@/types";
import NotificationItem from "../notification-item";

// --- Helpers ---

function createNotification(overrides: Partial<INotification> = {}): INotification {
  return {
    id: "notif-1",
    type: NotificationType.COMMENT_MENTIONED,
    actor: {
      id: "user-1",
      email: "jane@example.com",
      full_name: "Jane Doe",
      role: "member",
      team_id: 1,
      avatar_url: "",
      is_active: true,
    },
    entity_type: "task",
    entity_id: "task-1",
    payload: {
      task_title: "Update Login Flow",
      task_id: "task-1",
      ticket_id: "KAN-6",
    },
    is_read: false,
    read_at: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

const defaultCallbacks = {
  onClick: vi.fn(),
  onMarkAsRead: vi.fn(),
  onFavorite: vi.fn(),
  onDelete: vi.fn(),
};

function renderItem(overrides: Partial<INotification> = {}, callbacks: Partial<typeof defaultCallbacks> = {}) {
  const notification = createNotification(overrides);
  const merged = { ...defaultCallbacks, ...callbacks };

  render(
    <NotificationItem
      notification={notification}
      onClick={merged.onClick}
      onMarkAsRead={merged.onMarkAsRead}
      onFavorite={merged.onFavorite}
      onDelete={merged.onDelete}
    />,
  );

  return { notification, ...merged };
}

async function openDropdown() {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Notification actions" }));
  return user;
}

// --- Tests ---

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("NotificationItem", () => {
  describe("notification content by type", () => {
    it("renders mention notification", () => {
      renderItem({ type: NotificationType.COMMENT_MENTIONED });

      expect(screen.getByText("Jane Doe")).toBeInTheDocument();
      expect(screen.getByText(/mentioned you in Task/)).toBeInTheDocument();
      expect(screen.getByText("Update Login Flow")).toBeInTheDocument();
    });

    it("renders assignment notification", () => {
      renderItem({ type: NotificationType.TASK_ASSIGNED });

      expect(screen.getByText(/assigned you to Task/)).toBeInTheDocument();
    });

    it("renders comment notification with preview", () => {
      renderItem({
        type: NotificationType.COMMENT_CREATED,
        payload: {
          task_title: "Dashboard Refactor",
          comment_preview: "The architectural canvas approach loo...",
        },
      });

      expect(screen.getByText(/commented on Task/)).toBeInTheDocument();
      expect(screen.getByText(/The architectural canvas approach loo/)).toBeInTheDocument();
    });

    it("renders comment notification without preview", () => {
      renderItem({
        type: NotificationType.COMMENT_CREATED,
        payload: { task_title: "Dashboard Refactor" },
      });

      expect(screen.getByText(/commented on Task/)).toBeInTheDocument();
      expect(screen.queryByText(/\u201c/)).not.toBeInTheDocument(); // no opening quote
    });

    it("renders status change notification with badges", () => {
      renderItem({
        type: NotificationType.TASK_UPDATED,
        payload: {
          task_title: "API Integration",
          from_status: "In Progress",
          to_status: "Review",
        },
      });

      expect(screen.getByText(/moved Task/)).toBeInTheDocument();
      expect(screen.getByText("In Progress")).toBeInTheDocument();
      expect(screen.getByText("Review")).toBeInTheDocument();
    });

    it("renders default content for unknown type", () => {
      renderItem({ type: "some_unknown_type" as NotificationType });

      expect(screen.getByText(/updated Task/)).toBeInTheDocument();
    });

    it("falls back to 'a task' when task_title is missing", () => {
      renderItem({
        type: NotificationType.TASK_ASSIGNED,
        payload: {},
      });

      expect(screen.getByText("a task")).toBeInTheDocument();
    });
  });

  describe("unread state", () => {
    it("shows unread dot for unread notifications", () => {
      renderItem({ is_read: false });

      expect(document.querySelector(".notification-unread-dot")).toBeInTheDocument();
    });

    it("shows unread accent bar for unread notifications", () => {
      const { container } = render(
        <NotificationItem
          notification={createNotification({ is_read: false })}
          onClick={vi.fn()}
          onMarkAsRead={vi.fn()}
          onFavorite={vi.fn()}
          onDelete={vi.fn()}
        />,
      );

      expect(container.querySelector(String.raw`.bg-\[\#5a5cf2\]`)).toBeInTheDocument();
    });

    it("hides unread dot for read notifications", () => {
      renderItem({ is_read: true });

      expect(document.querySelector(".notification-unread-dot")).not.toBeInTheDocument();
    });
  });

  describe("click handler", () => {
    it("calls onClick with the notification when content is clicked", async () => {
      const onClick = vi.fn();
      const { notification } = renderItem({}, { onClick });

      const user = userEvent.setup();
      const contentButton = screen.getByRole("button", { name: /Jane Doe/i });
      await user.click(contentButton);

      expect(onClick).toHaveBeenCalledOnce();
      expect(onClick).toHaveBeenCalledWith(notification);
    });
  });

  describe("dropdown actions", () => {
    it("shows Mark as read, Favorite, and Delete for unread notifications", async () => {
      renderItem({ is_read: false });
      await openDropdown();

      expect(screen.getByText("Mark as read")).toBeInTheDocument();
      expect(screen.getByText("Favorite")).toBeInTheDocument();
      expect(screen.getByText("Delete")).toBeInTheDocument();
    });

    it("hides Mark as read for read notifications", async () => {
      renderItem({ is_read: true });
      await openDropdown();

      expect(screen.queryByText("Mark as read")).not.toBeInTheDocument();
      expect(screen.getByText("Favorite")).toBeInTheDocument();
      expect(screen.getByText("Delete")).toBeInTheDocument();
    });

    it("calls onMarkAsRead when Mark as read is clicked", async () => {
      const onMarkAsRead = vi.fn();
      const { notification } = renderItem({ is_read: false }, { onMarkAsRead });
      const user = await openDropdown();

      await user.click(screen.getByText("Mark as read"));

      expect(onMarkAsRead).toHaveBeenCalledOnce();
      expect(onMarkAsRead).toHaveBeenCalledWith(notification);
    });

    it("calls onFavorite when Favorite is clicked", async () => {
      const onFavorite = vi.fn();
      const { notification } = renderItem({}, { onFavorite });
      const user = await openDropdown();

      await user.click(screen.getByText("Favorite"));

      expect(onFavorite).toHaveBeenCalledOnce();
      expect(onFavorite).toHaveBeenCalledWith(notification);
    });

    it("calls onDelete when Delete is clicked", async () => {
      const onDelete = vi.fn();
      const { notification } = renderItem({}, { onDelete });
      const user = await openDropdown();

      await user.click(screen.getByText("Delete"));

      expect(onDelete).toHaveBeenCalledOnce();
      expect(onDelete).toHaveBeenCalledWith(notification);
    });
  });

  describe("animation delay", () => {
    it("applies animationDelay style", () => {
      const { container } = render(
        <NotificationItem
          notification={createNotification()}
          onClick={vi.fn()}
          onMarkAsRead={vi.fn()}
          onFavorite={vi.fn()}
          onDelete={vi.fn()}
          animationDelay={150}
        />,
      );

      const root = container.firstElementChild as HTMLElement;
      expect(root.style.animationDelay).toBe("150ms");
    });

    it("defaults animationDelay to 0", () => {
      const { container } = render(
        <NotificationItem
          notification={createNotification()}
          onClick={vi.fn()}
          onMarkAsRead={vi.fn()}
          onFavorite={vi.fn()}
          onDelete={vi.fn()}
        />,
      );

      const root = container.firstElementChild as HTMLElement;
      expect(root.style.animationDelay).toBe("0ms");
    });
  });
});
