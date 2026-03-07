import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ILabel } from "@/types";

// --- Mocks ---

const mockPreventDefault = vi.fn();

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenuItem: ({
    children,
    onSelect,
  }: {
    children: React.ReactNode;
    onSelect?: (e: { preventDefault: () => void }) => void;
  }) => (
    <button
      data-testid="dropdown-item"
      onClick={() => onSelect?.({ preventDefault: mockPreventDefault })}
    >
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/field", () => ({
  Field: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  FieldContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  FieldLabel: ({
    children,
    htmlFor,
  }: {
    children: React.ReactNode;
    htmlFor?: string;
  }) => <label htmlFor={htmlFor}>{children}</label>,
}));

vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({
    id,
    name,
    checked,
  }: {
    id?: string;
    name?: string;
    checked?: boolean;
  }) => (
    <input
      type="checkbox"
      id={id}
      name={name}
      checked={checked}
      readOnly
      data-testid="checkbox"
    />
  ),
}));

// --- Import after mocks ---

import TaskLabelDropdownItem from "../item";

// --- Helpers ---

function createLabel(overrides: Partial<ILabel> = {}): ILabel {
  return {
    id: "label-1",
    name: "Bug",
    color: "#ef4444",
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// --- Tests ---

describe("TaskLabelDropdownItem", () => {
  it("renders label name", () => {
    const label = createLabel({ name: "Feature" });
    render(
      <TaskLabelDropdownItem
        label={label}
        selected={false}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByText("Feature")).toBeInTheDocument();
  });

  it("renders color dot with label color", () => {
    const label = createLabel({ color: "#22c55e" });
    render(
      <TaskLabelDropdownItem
        label={label}
        selected={false}
        onSelect={vi.fn()}
      />,
    );

    const dot = screen.getByText(label.name)
      .closest("label")
      ?.querySelector("span.rounded-full");
    expect(dot).toHaveStyle({ backgroundColor: "#22c55e" });
  });

  it("renders checkbox as checked when selected", () => {
    render(
      <TaskLabelDropdownItem
        label={createLabel()}
        selected={true}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByTestId("checkbox")).toBeChecked();
  });

  it("renders checkbox as unchecked when not selected", () => {
    render(
      <TaskLabelDropdownItem
        label={createLabel()}
        selected={false}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByTestId("checkbox")).not.toBeChecked();
  });

  it("calls onSelect when dropdown item is clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const label = createLabel({ id: "label-42" });

    render(
      <TaskLabelDropdownItem
        label={label}
        selected={false}
        onSelect={onSelect}
      />,
    );

    await user.click(screen.getByTestId("dropdown-item"));

    expect(onSelect).toHaveBeenCalledOnce();
    expect(onSelect).toHaveBeenCalledWith(label);
  });

  it("calls preventDefault on dropdown item select", async () => {
    const user = userEvent.setup();

    render(
      <TaskLabelDropdownItem
        label={createLabel()}
        selected={false}
        onSelect={vi.fn()}
      />,
    );

    await user.click(screen.getByTestId("dropdown-item"));

    expect(mockPreventDefault).toHaveBeenCalledOnce();
  });

  it("checkbox is a passive indicator controlled by selected prop", () => {
    const { rerender } = render(
      <TaskLabelDropdownItem
        label={createLabel()}
        selected={false}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByTestId("checkbox")).not.toBeChecked();

    rerender(
      <TaskLabelDropdownItem
        label={createLabel()}
        selected={true}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByTestId("checkbox")).toBeChecked();
  });

  it("checkbox has no htmlFor association to avoid intercepting clicks", () => {
    render(
      <TaskLabelDropdownItem
        label={createLabel()}
        selected={false}
        onSelect={vi.fn()}
      />,
    );

    const checkbox = screen.getByTestId("checkbox");
    expect(checkbox).not.toHaveAttribute("id");
    expect(checkbox).not.toHaveAttribute("name");
  });
});
