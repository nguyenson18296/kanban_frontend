import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TaskActivityAction } from "@/types";
import type { IActivity } from "@/types";
import ActivityItem from "../activity-item";

function createActivity(overrides: Partial<IActivity> = {}): IActivity {
  return {
    id: "act-1",
    action: TaskActivityAction.TASK_CREATED,
    payload: {},
    actor: {
      id: "user-1",
      full_name: "Grace Bui",
      avatar_url: "",
    },
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ActivityItem", () => {
  describe("action content rendering", () => {
    it("renders task_created", () => {
      render(<ActivityItem activity={createActivity()} />);
      expect(screen.getByText("Grace Bui")).toBeInTheDocument();
      expect(screen.getByText(/created this task/)).toBeInTheDocument();
    });

    it("renders task_title_updated", () => {
      render(
        <ActivityItem activity={createActivity({ action: TaskActivityAction.TASK_TITLE_UPDATED })} />,
      );
      expect(screen.getByText(/updated the title/)).toBeInTheDocument();
    });

    it("renders task_description_updated", () => {
      render(
        <ActivityItem activity={createActivity({ action: TaskActivityAction.TASK_DESCRIPTION_UPDATED })} />,
      );
      expect(screen.getByText(/updated task description/)).toBeInTheDocument();
    });

    it("renders task_status_changed with from/to badges", () => {
      render(
        <ActivityItem
          activity={createActivity({
            action: TaskActivityAction.TASK_STATUS_CHANGED,
            payload: { from: "Open", to: "In Progress" },
          })}
        />,
      );
      expect(screen.getByText(/changed status/)).toBeInTheDocument();
      expect(screen.getByText("Open")).toBeInTheDocument();
      expect(screen.getByText("In Progress")).toBeInTheDocument();
    });

    it("renders task_priority_changed with from/to", () => {
      render(
        <ActivityItem
          activity={createActivity({
            action: TaskActivityAction.TASK_PRIORITY_CHANGED,
            payload: { from: "Medium", to: "Urgent" },
          })}
        />,
      );
      expect(screen.getByText(/changed priority/)).toBeInTheDocument();
      expect(screen.getByText("Medium")).toBeInTheDocument();
      expect(screen.getByText("Urgent")).toBeInTheDocument();
    });

    it("renders task_due_date_changed with dates", () => {
      render(
        <ActivityItem
          activity={createActivity({
            action: TaskActivityAction.TASK_DUE_DATE_CHANGED,
            payload: { from: null, to: "2026-04-10T00:00:00.000Z" },
          })}
        />,
      );
      expect(screen.getByText(/changed the due date/)).toBeInTheDocument();
      expect(screen.getByText(/Apr 10, 2026/)).toBeInTheDocument();
    });

    it("renders task_assignee_added with user names", () => {
      render(
        <ActivityItem
          activity={createActivity({
            action: TaskActivityAction.TASK_ASSIGNEE_ADDED,
            payload: { users: [{ user_id: "u1", full_name: "John Doe" }] },
          })}
        />,
      );
      expect(screen.getByText(/assigned/)).toBeInTheDocument();
      expect(screen.getByText("John Doe")).toBeInTheDocument();
    });

    it("renders task_assignee_removed with user names", () => {
      render(
        <ActivityItem
          activity={createActivity({
            action: TaskActivityAction.TASK_ASSIGNEE_REMOVED,
            payload: { users: [{ user_id: "u1", full_name: "Jane Smith" }] },
          })}
        />,
      );
      expect(screen.getByText(/unassigned/)).toBeInTheDocument();
      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    });

    it("renders task_label_added with label names", () => {
      render(
        <ActivityItem
          activity={createActivity({
            action: TaskActivityAction.TASK_LABEL_ADDED,
            payload: { labels: [{ label_id: 5, label_name: "Frontend", color: "#7c3aed" }] },
          })}
        />,
      );
      expect(screen.getByText(/added label/)).toBeInTheDocument();
      expect(screen.getByText("Frontend")).toBeInTheDocument();
    });

    it("renders task_label_removed with label names", () => {
      render(
        <ActivityItem
          activity={createActivity({
            action: TaskActivityAction.TASK_LABEL_REMOVED,
            payload: { labels: [{ label_id: 5, label_name: "Bug", color: "#ef4444" }] },
          })}
        />,
      );
      expect(screen.getByText(/removed label/)).toBeInTheDocument();
      expect(screen.getByText("Bug")).toBeInTheDocument();
    });

    it("renders task_moved", () => {
      render(
        <ActivityItem
          activity={createActivity({
            action: TaskActivityAction.TASK_MOVED,
            payload: { from_column_id: 1, to_column_id: 2, position: 3 },
          })}
        />,
      );
      expect(screen.getByText(/moved this task/)).toBeInTheDocument();
    });

    it("renders task_reordered", () => {
      render(
        <ActivityItem
          activity={createActivity({
            action: TaskActivityAction.TASK_REORDERED,
            payload: { position: 2 },
          })}
        />,
      );
      expect(screen.getByText(/reordered this task/)).toBeInTheDocument();
    });
  });

  it("renders actor avatar with fallback initials", () => {
    render(<ActivityItem activity={createActivity({ actor: { id: "u1", full_name: "Grace Bui", avatar_url: null } })} />);
    expect(screen.getByText("GB")).toBeInTheDocument();
  });

  it("renders relative timestamp", () => {
    render(<ActivityItem activity={createActivity()} />);
    expect(screen.getByText(/ago/)).toBeInTheDocument();
  });
});
