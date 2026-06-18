import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { UserAvatar } from "../index";
import { createUser } from "@/test-factories";

// Mock the Radix HoverCard so content is always rendered (no portal, no
// pointer-event/timer flakiness in happy-dom). The Avatar primitives are
// plain spans and don't need mocking.
vi.mock("@/components/ui/hover-card", () => ({
  HoverCard: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="hover-card-root">{children}</div>
  ),
  HoverCardTrigger: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="hover-card-trigger">{children}</div>
  ),
  HoverCardContent: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div data-testid="hover-card-content" className={className}>
      {children}
    </div>
  ),
}));

afterEach(cleanup);

const baseUser = createUser({
  id: "u-1",
  full_name: "Ada Lovelace",
  email: "ada@example.com",
  role: "engineer",
  avatar_url: "https://example.com/ada.png",
  is_active: true,
  created_at: "2024-03-15T00:00:00.000Z",
});

describe("UserAvatar", () => {
  describe("trigger", () => {
    it("renders a button with an accessible label", () => {
      render(<UserAvatar user={baseUser} />);

      const trigger = screen.getByRole("button", {
        name: "View profile for Ada Lovelace",
      });
      expect(trigger).toBeInTheDocument();
      expect(trigger).toHaveAttribute("type", "button");
    });

    it("renders both the trigger and hover-content avatars", () => {
      // Radix Avatar.Image lazy-mounts the <img> only after a successful
      // network load, so happy-dom never renders the actual img tag.
      // We assert structure: two Avatar roots (trigger + hover content)
      // each with the fallback wired up.
      const { container } = render(<UserAvatar user={baseUser} />);

      const avatars = container.querySelectorAll('[data-slot="avatar"]');
      expect(avatars).toHaveLength(2);

      const fallbacks = container.querySelectorAll(
        '[data-slot="avatar-fallback"]',
      );
      expect(fallbacks).toHaveLength(2);
      fallbacks.forEach((fb) => expect(fb).toHaveTextContent("AL"));
    });

    it("renders an initials fallback derived from the user's name", () => {
      render(<UserAvatar user={baseUser} />);

      // Two fallbacks (trigger + hover content) — both show same initials.
      const fallbacks = screen.getAllByText("AL");
      expect(fallbacks.length).toBeGreaterThan(0);
    });

    it("forwards className to the inner Avatar (not the button)", () => {
      render(<UserAvatar user={baseUser} className="size-7 ring-2 ring-white" />);

      const trigger = screen.getByRole("button");
      expect(trigger).not.toHaveClass("size-7");

      const avatar = within(trigger).getByText("AL").closest(
        '[data-slot="avatar"]',
      );
      expect(avatar).toHaveClass("size-7");
      expect(avatar).toHaveClass("ring-2");
      expect(avatar).toHaveClass("ring-white");
    });

    it("renders an online indicator when isOnline is true", () => {
      render(<UserAvatar user={baseUser} isOnline />);

      const indicator = screen.getByRole("status", { name: "Online" });
      expect(indicator).toBeInTheDocument();
      expect(indicator).toHaveClass("bg-emerald-500");
    });

    it("does not render an online indicator when isOnline is undefined", () => {
      render(<UserAvatar user={baseUser} />);
      expect(
        screen.queryByRole("status", { name: "Online" }),
      ).not.toBeInTheDocument();
    });

    it("does not render an online indicator when isOnline is false", () => {
      render(<UserAvatar user={baseUser} isOnline={false} />);
      expect(
        screen.queryByRole("status", { name: "Online" }),
      ).not.toBeInTheDocument();
    });
  });

  describe("hover card content", () => {
    it("renders the user's full name", () => {
      render(<UserAvatar user={baseUser} />);

      const content = screen.getByTestId("hover-card-content");
      expect(within(content).getByText("Ada Lovelace")).toBeInTheDocument();
    });

    it("renders the email when provided", () => {
      render(<UserAvatar user={baseUser} />);

      const content = screen.getByTestId("hover-card-content");
      expect(within(content).getByText("ada@example.com")).toBeInTheDocument();
    });

    it("omits the email block when not provided", () => {
      const user = { ...baseUser, email: "" };
      render(<UserAvatar user={user} />);

      const content = screen.getByTestId("hover-card-content");
      expect(
        within(content).queryByText("ada@example.com"),
      ).not.toBeInTheDocument();
    });

    it("renders the role as a badge when provided", () => {
      render(<UserAvatar user={baseUser} />);

      const content = screen.getByTestId("hover-card-content");
      const badge = within(content).getByText("engineer");
      expect(badge.closest('[data-slot="badge"]')).toBeInTheDocument();
    });

    it("omits the role badge when role is empty", () => {
      const user = { ...baseUser, role: "" };
      render(<UserAvatar user={user} />);

      const content = screen.getByTestId("hover-card-content");
      expect(
        within(content).queryByText(baseUser.role),
      ).not.toBeInTheDocument();
    });

    it("formats created_at into 'Joined MMM yyyy'", () => {
      render(<UserAvatar user={baseUser} />);

      const content = screen.getByTestId("hover-card-content");
      expect(within(content).getByText("Joined Mar 2024")).toBeInTheDocument();
    });

    it("omits the joined date when created_at is empty", () => {
      const user = { ...baseUser, created_at: "" };
      render(<UserAvatar user={user} />);

      const content = screen.getByTestId("hover-card-content");
      expect(within(content).queryByText(/^Joined /)).not.toBeInTheDocument();
    });

    it("omits the joined date when created_at is unparseable", () => {
      const user = { ...baseUser, created_at: "not-a-date" };
      render(<UserAvatar user={user} />);

      const content = screen.getByTestId("hover-card-content");
      expect(within(content).queryByText(/^Joined /)).not.toBeInTheDocument();
    });

    it("shows 'Online' status when isOnline is true", () => {
      render(<UserAvatar user={baseUser} isOnline />);

      const content = screen.getByTestId("hover-card-content");
      expect(within(content).getByText("Online")).toBeInTheDocument();
      expect(within(content).queryByText("Active")).not.toBeInTheDocument();
    });

    it("shows 'Active' when is_active is true and not online", () => {
      render(<UserAvatar user={baseUser} />);

      const content = screen.getByTestId("hover-card-content");
      expect(within(content).getByText("Active")).toBeInTheDocument();
    });

    it("shows 'Inactive' when is_active is false", () => {
      const user = { ...baseUser, is_active: false };
      render(<UserAvatar user={user} />);

      const content = screen.getByTestId("hover-card-content");
      expect(within(content).getByText("Inactive")).toBeInTheDocument();
    });

    it("hides the footer when there is no status info and no created_at", () => {
      // Narrow shape: just id + name + avatar — what IActivity.actor passes.
      render(
        <UserAvatar
          user={{
            id: "u-2",
            full_name: "Grace Hopper",
            avatar_url: null,
          }}
        />,
      );

      const content = screen.getByTestId("hover-card-content");
      expect(within(content).queryByText("Active")).not.toBeInTheDocument();
      expect(within(content).queryByText("Inactive")).not.toBeInTheDocument();
      expect(within(content).queryByText(/^Joined /)).not.toBeInTheDocument();
    });

    it("handles a null avatar_url without crashing", () => {
      const user = { ...baseUser, avatar_url: null };
      const { container } = render(<UserAvatar user={user} />);

      // Images shouldn't carry src="null"; Radix Avatar.Image omits the
      // image when src is empty/undefined. We just assert no throw and
      // initials are still shown.
      expect(screen.getAllByText("AL").length).toBeGreaterThan(0);
      const images = container.querySelectorAll('[data-slot="avatar-image"]');
      images.forEach((img) => {
        const src = img.getAttribute("src");
        expect(src === null || src === "").toBe(true);
      });
    });
  });

  describe("initials", () => {
    it("takes the first letter of each name part, capped at 2", () => {
      // Matches the canonical pattern used in AssigneeDropdown and
      // TaskDetailSidebar so the same user shows the same initials
      // everywhere in the app.
      render(
        <UserAvatar
          user={{ ...baseUser, full_name: "Marie Sklodowska Curie" }}
        />,
      );
      expect(screen.getAllByText("MS").length).toBeGreaterThan(0);
    });

    it("uses a single initial for single-word names", () => {
      render(<UserAvatar user={{ ...baseUser, full_name: "Cher" }} />);
      expect(screen.getAllByText("C").length).toBeGreaterThan(0);
    });

    it("collapses extra whitespace between names", () => {
      render(
        <UserAvatar user={{ ...baseUser, full_name: "  Ada    Lovelace  " }} />,
      );
      expect(screen.getAllByText("AL").length).toBeGreaterThan(0);
    });

    it("falls back to '?' for empty names", () => {
      render(<UserAvatar user={{ ...baseUser, full_name: "   " }} />);
      expect(screen.getAllByText("?").length).toBeGreaterThan(0);
    });
  });
});
