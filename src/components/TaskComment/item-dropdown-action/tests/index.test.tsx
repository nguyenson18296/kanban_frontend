import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import ItemDropdownAction from "../index";

// --- Helpers ---

const defaultProps = {
  isOwner: true,
  onEdit: vi.fn(),
  onCopyLink: vi.fn(),
  onDelete: vi.fn(),
};

async function renderAndOpen(props: Partial<typeof defaultProps> = {}) {
  const merged = { ...defaultProps, ...props };
  const user = userEvent.setup();

  render(
    <ItemDropdownAction {...merged}>
      <button>Menu</button>
    </ItemDropdownAction>,
  );

  await user.click(screen.getByRole("button", { name: "Menu" }));

  return { user, ...merged };
}

// --- Tests ---

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ItemDropdownAction", () => {
  describe("owner view", () => {
    it("shows Edit, Copy link, and Delete for owner", async () => {
      await renderAndOpen({ isOwner: true });

      expect(screen.getByText("Edit")).toBeInTheDocument();
      expect(screen.getByText("Copy link to comment")).toBeInTheDocument();
      expect(screen.getByText("Delete")).toBeInTheDocument();
    });

    it("calls onEdit when Edit is clicked", async () => {
      const onEdit = vi.fn();
      const { user } = await renderAndOpen({ isOwner: true, onEdit });

      await user.click(screen.getByText("Edit"));

      expect(onEdit).toHaveBeenCalledOnce();
    });

    it("calls onCopyLink when Copy link is clicked", async () => {
      const onCopyLink = vi.fn();
      const { user } = await renderAndOpen({ isOwner: true, onCopyLink });

      await user.click(screen.getByText("Copy link to comment"));

      expect(onCopyLink).toHaveBeenCalledOnce();
    });

    it("calls onDelete when Delete is clicked", async () => {
      const onDelete = vi.fn();
      const { user } = await renderAndOpen({ isOwner: true, onDelete });

      await user.click(screen.getByText("Delete"));

      expect(onDelete).toHaveBeenCalledOnce();
    });
  });

  describe("non-owner view", () => {
    it("shows only Copy link for non-owner", async () => {
      await renderAndOpen({ isOwner: false });

      expect(screen.queryByText("Edit")).not.toBeInTheDocument();
      expect(screen.getByText("Copy link to comment")).toBeInTheDocument();
      expect(screen.queryByText("Delete")).not.toBeInTheDocument();
    });

    it("calls onCopyLink for non-owner", async () => {
      const onCopyLink = vi.fn();
      const { user } = await renderAndOpen({ isOwner: false, onCopyLink });

      await user.click(screen.getByText("Copy link to comment"));

      expect(onCopyLink).toHaveBeenCalledOnce();
    });
  });
});
