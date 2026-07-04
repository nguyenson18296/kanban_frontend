import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { TooltipProvider } from "@/components/ui/tooltip";
import * as subscriptionService from "@/services/subscription.service";
import { useStoreUser } from "@/stores/use-store-user";
import type { ISubscriber } from "@/types";
import Subscribers from "../subscribers";

vi.mock("@/services/subscription.service");
const mocked = vi.mocked(subscriptionService);

function makeSubscriber(overrides: Partial<ISubscriber> = {}): ISubscriber {
  return {
    user_id: "u1",
    full_name: "Alice Nguyen",
    avatar_url: null,
    source: "assigned",
    created_at: "2026-07-04T09:00:00.000Z",
    ...overrides,
  };
}

function renderSubscribers() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Subscribers taskId="task-1" />
      </TooltipProvider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  useStoreUser.setState({ user: null });
});

describe("Subscribers", () => {
  it("renders the subscriber avatars and the subscribed state", async () => {
    mocked.getSubscriptionStatus.mockResolvedValue({
      subscribed: true,
      source: "assigned",
      since: "2026-07-04T09:00:00.000Z",
    });
    mocked.getSubscribers.mockResolvedValue({
      items: [
        makeSubscriber({ user_id: "u1", full_name: "Alice Nguyen" }),
        makeSubscriber({ user_id: "u2", full_name: "Bob Tran", source: "manual" }),
      ],
    });

    renderSubscribers();

    // Button label reflects the fetched status.
    expect(
      await screen.findByRole("button", { name: "Unsubscribe" }),
    ).toBeInTheDocument();
    // Avatar fallbacks render from the subscriber list (initials).
    expect(await screen.findByText("AN")).toBeInTheDocument();
    expect(screen.getByText("BT")).toBeInTheDocument();

    // Each avatar is a focusable, named image so keyboard users can read the
    // tooltip (not hover-only).
    const alice = screen.getByRole("img", { name: "Alice Nguyen" });
    expect(alice).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("img", { name: "Bob Tran" })).toBeInTheDocument();
  });

  it("toggles the subscription and reflects the new state", async () => {
    let subscribed = true;
    mocked.getSubscriptionStatus.mockImplementation(async () => ({
      subscribed,
      source: subscribed ? "manual" : null,
      since: subscribed ? "2026-07-04T09:00:00.000Z" : null,
    }));
    mocked.getSubscribers.mockResolvedValue({ items: [] });
    mocked.unsubscribeFromTask.mockImplementation(async () => {
      subscribed = false;
    });
    mocked.subscribeToTask.mockImplementation(async () => {
      subscribed = true;
      return {
        subscribed: true,
        source: "manual",
        since: "2026-07-04T09:00:00.000Z",
      };
    });

    const user = userEvent.setup();
    renderSubscribers();

    await user.click(
      await screen.findByRole("button", { name: "Unsubscribe" }),
    );
    expect(mocked.unsubscribeFromTask).toHaveBeenCalledWith("task-1");
    expect(
      await screen.findByRole("button", { name: "Subscribe" }),
    ).toBeInTheDocument();

    // Re-subscribing calls the subscribe endpoint and flips back.
    await user.click(screen.getByRole("button", { name: "Subscribe" }));
    expect(mocked.subscribeToTask).toHaveBeenCalledWith("task-1");
    expect(
      await screen.findByRole("button", { name: "Unsubscribe" }),
    ).toBeInTheDocument();
  });

  it("optimistically adds the current user to the list on subscribe, before the API resolves", async () => {
    useStoreUser.setState({
      user: {
        id: "me",
        email: "me@example.com",
        full_name: "Me User",
        role: "member",
        avatar_url: "",
      },
    });
    mocked.getSubscriptionStatus.mockResolvedValue({
      subscribed: false,
      source: null,
      since: null,
    });
    mocked.getSubscribers.mockResolvedValue({ items: [] });
    // Never resolves — so the new avatar can ONLY come from the optimistic onMutate.
    mocked.subscribeToTask.mockImplementation(() => new Promise<never>(() => {}));

    const user = userEvent.setup();
    renderSubscribers();

    await user.click(await screen.findByRole("button", { name: "Subscribe" }));

    // Current user (initials "MU") appears immediately, without the API resolving.
    expect(await screen.findByText("MU")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Unsubscribe" }),
    ).toBeInTheDocument();
  });

  it("rolls back the optimistic status on failure even when it was uncached", async () => {
    // Status query itself fails -> data stays undefined, button enabled as "Subscribe".
    mocked.getSubscriptionStatus.mockRejectedValue(new Error("status unavailable"));
    mocked.getSubscribers.mockResolvedValue({ items: [] });
    // Reject after a short delay so the optimistic state is observable first.
    mocked.subscribeToTask.mockImplementation(
      () =>
        new Promise((_resolve, reject) =>
          setTimeout(() => reject(new Error("subscribe failed")), 30),
        ),
    );

    const user = userEvent.setup();
    renderSubscribers();

    await user.click(await screen.findByRole("button", { name: "Subscribe" }));

    // Optimistic flip...
    expect(
      await screen.findByRole("button", { name: "Unsubscribe" }),
    ).toBeInTheDocument();
    // ...then rolled back to "Subscribe" once the toggle fails (would stay stuck
    // on "Unsubscribe" without restoring the undefined prior status).
    expect(
      await screen.findByRole("button", { name: "Subscribe" }),
    ).toBeInTheDocument();
    expect(mocked.subscribeToTask).toHaveBeenCalledWith("task-1");
  });
});
