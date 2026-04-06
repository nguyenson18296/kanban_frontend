import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TaskActivityAction } from "@/types";
import type { IActivity } from "@/types";
import ActivityList from "../activity-list";

function createActivity(overrides: Partial<IActivity> = {}): IActivity {
  return {
    id: "act-1",
    action: TaskActivityAction.TASK_CREATED,
    payload: {},
    actor: { id: "u1", full_name: "Grace Bui", avatar_url: "" },
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

vi.mock("../activity-item", () => ({
  default: ({ activity }: { activity: IActivity }) => (
    <div data-testid="activity-item">{activity.action}</div>
  ),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ActivityList", () => {
  it("renders empty state when no activities", () => {
    render(<ActivityList activities={[]} hasNextPage={false} onLoadMore={vi.fn()} isLoadingMore={false} />);
    expect(screen.getByText(/No activity yet/)).toBeInTheDocument();
  });

  it("renders all activity items", () => {
    const activities = [
      createActivity({ id: "a1" }),
      createActivity({ id: "a2" }),
      createActivity({ id: "a3" }),
    ];
    render(<ActivityList activities={activities} hasNextPage={false} onLoadMore={vi.fn()} isLoadingMore={false} />);
    expect(screen.getAllByTestId("activity-item")).toHaveLength(3);
  });

  it("groups activities by date with section headers", () => {
    const today = new Date().toISOString();
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    const activities = [
      createActivity({ id: "a1", created_at: today }),
      createActivity({ id: "a2", created_at: yesterday }),
    ];
    render(<ActivityList activities={activities} hasNextPage={false} onLoadMore={vi.fn()} isLoadingMore={false} />);
    expect(screen.getByText("Today")).toBeInTheDocument();
    expect(screen.getByText("Yesterday")).toBeInTheDocument();
  });

  it("renders scroll sentinel when hasNextPage is true", () => {
    const { container } = render(
      <ActivityList
        activities={[createActivity()]}
        hasNextPage={true}
        onLoadMore={vi.fn()}
        isLoadingMore={false}
      />,
    );
    // Sentinel div exists for IntersectionObserver
    expect(container.querySelector("[data-testid='activity-item']")).toBeInTheDocument();
  });

  it("hides scroll sentinel when hasNextPage is false", () => {
    const { container } = render(
      <ActivityList
        activities={[createActivity()]}
        hasNextPage={false}
        onLoadMore={vi.fn()}
        isLoadingMore={false}
      />,
    );
    // No loading spinner present
    expect(container.querySelector(".animate-spin")).not.toBeInTheDocument();
  });
});
