import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

import Task from "../task";
import { createTask } from "@/test-factories";

vi.mock("@dnd-kit/react/sortable", () => ({
  useSortable: () => ({ ref: vi.fn(), isDragging: false }),
}));
vi.mock("@tanstack/react-router", () => ({
  useRouter: () => ({ navigate: vi.fn() }),
  useParams: () => ({ projectId: "p1" }),
}));
vi.mock("@/components/TaskContextMenu", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/AssigneeDropdown", () => ({ default: () => null }));
vi.mock("@/components/PriorityDropdown", () => ({ default: () => null }));
vi.mock("@/components/DueDateDropdown", () => ({ default: () => null }));
vi.mock("../hooks/use-update-task", () => ({
  useUpdateTask: () => ({ mutate: vi.fn() }),
}));
vi.mock("@/components/AssigneeDropdown/hooks/use-update-assignees", () => ({
  useUpdateAssignees: () => ({ mutate: vi.fn() }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderCard(isFlashing: boolean) {
  const task = createTask({ id: "t1", ticket_id: "KAN-1", title: "Flash me" });
  render(<Task {...task} index={0} columnId={1} isFlashing={isFlashing} />);
  return screen.getByRole("button", { name: /flash me/i });
}

describe("Task reveal support", () => {
  it("carries its task id in the DOM so reveal can scroll to it", () => {
    expect(renderCard(false)).toHaveAttribute("data-task-id", "t1");
  });

  // The outline styles key off data-flashing (data-[flashing=true]:ring-*), so
  // the attribute is the render contract — the base card already uses ring
  // classes for focus, which class-string matching would false-positive on.
  it("is marked as flashing while revealed", () => {
    expect(renderCard(true)).toHaveAttribute("data-flashing", "true");
  });

  it("is not marked as flashing otherwise", () => {
    expect(renderCard(false)).toHaveAttribute("data-flashing", "false");
  });
});
