import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import DueDateDropdownTrigger from "../trigger";

// --- Helpers ---

function addDays(days: number): string {
  const date = new Date(NOW);
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

// Pin "now" so day-difference logic is deterministic.
const NOW = new Date("2026-03-08T12:00:00Z").getTime();

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

// --- Tests ---

describe("DueDateDropdownTrigger", () => {
  it("renders 'No due date' and no icon when dueDate is null", () => {
    render(<DueDateDropdownTrigger dueDate={null} />);

    expect(screen.getByText("No due date")).toBeInTheDocument();
    expect(screen.getByRole("button").querySelector("svg")).not.toBeInTheDocument();
  });

  it("calls onClick when clicked", () => {
    const handleClick = vi.fn();
    render(<DueDateDropdownTrigger dueDate={addDays(10)} onClick={handleClick} />);

    fireEvent.click(screen.getByRole("button"));

    expect(handleClick).toHaveBeenCalledOnce();
  });

  it("forwards ref to the button element", () => {
    const ref = { current: null } as React.RefObject<HTMLButtonElement | null>;
    render(<DueDateDropdownTrigger ref={ref} dueDate={null} />);

    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it("spreads extra props onto the button", () => {
    render(<DueDateDropdownTrigger dueDate={null} data-testid="custom" aria-expanded="true" />);

    const button = screen.getByTestId("custom");
    expect(button).toHaveAttribute("aria-expanded", "true");
  });

  it("displays formatted date when dueDate is provided", () => {
    render(<DueDateDropdownTrigger dueDate={addDays(10)} />);

    expect(screen.getByText("Mar 18")).toBeInTheDocument();
  });

  it("shows Calendar icon with normal color when more than 7 days remaining", () => {
    const { container } = render(
      <DueDateDropdownTrigger dueDate={addDays(10)} />,
    );

    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass("lucide-calendar", "text-muted-foreground");
    expect(svg).not.toHaveClass("lucide-calendar-x");
  });

  it("shows Calendar icon with red color when less than 7 days but more than 1 day remaining", () => {
    const { container } = render(
      <DueDateDropdownTrigger dueDate={addDays(5)} />,
    );

    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass("lucide-calendar", "text-red-500");
    expect(svg).not.toHaveClass("lucide-calendar-x");
  });

  it("shows CalendarX icon with red color when less than 1 day remaining", () => {
    const { container } = render(
      <DueDateDropdownTrigger dueDate={addDays(0)} />,
    );

    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass("lucide-calendar-x", "text-red-500");
  });

  it("shows CalendarX icon with red color for overdue dates", () => {
    const { container } = render(
      <DueDateDropdownTrigger dueDate={addDays(-3)} />,
    );

    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass("lucide-calendar-x", "text-red-500");
  });

  // daysRemaining === 7 → NOT < 7, so normal muted icon
  it("shows normal Calendar icon at exactly 7 days remaining", () => {
    const { container } = render(
      <DueDateDropdownTrigger dueDate={addDays(7)} />,
    );

    const svg = container.querySelector("svg");
    expect(svg).toHaveClass("lucide-calendar", "text-muted-foreground");
    expect(svg).not.toHaveClass("lucide-calendar-x");
  });

  // daysRemaining === 1 → NOT < 1, so red Calendar (not CalendarX)
  it("shows red Calendar icon at exactly 1 day remaining", () => {
    const { container } = render(
      <DueDateDropdownTrigger dueDate={addDays(1)} />,
    );

    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass("lucide-calendar", "text-red-500");
    expect(svg).not.toHaveClass("lucide-calendar-x");
  });
});
