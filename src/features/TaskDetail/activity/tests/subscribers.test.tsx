import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { TooltipProvider } from "@/components/ui/tooltip";
import Subscribers from "../subscribers";

function renderSubscribers() {
  return render(
    <TooltipProvider>
      <Subscribers taskId="task-1" />
    </TooltipProvider>,
  );
}

afterEach(() => {
  cleanup();
});

describe("Subscribers", () => {
  it("renders stub subscribers and the current user while subscribed", () => {
    renderSubscribers();

    expect(
      screen.getByRole("button", { name: "Unsubscribe" }),
    ).toHaveAttribute("aria-pressed", "true");

    // Stub subscribers (AC, MR) plus the current-user fallback ("You" -> "Y").
    expect(screen.getByText("AC")).toBeInTheDocument();
    expect(screen.getByText("MR")).toBeInTheDocument();
    expect(screen.getByText("Y")).toBeInTheDocument();
  });

  it("toggles the label and drops the current user's avatar on unsubscribe", async () => {
    const user = userEvent.setup();
    renderSubscribers();

    await user.click(screen.getByRole("button", { name: "Unsubscribe" }));

    const subscribeButton = screen.getByRole("button", { name: "Subscribe" });
    expect(subscribeButton).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByText("Y")).not.toBeInTheDocument();
    // The other subscribers remain.
    expect(screen.getByText("AC")).toBeInTheDocument();
    expect(screen.getByText("MR")).toBeInTheDocument();

    // Re-subscribing brings the current user back.
    await user.click(subscribeButton);
    expect(
      screen.getByRole("button", { name: "Unsubscribe" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Y")).toBeInTheDocument();
  });
});
