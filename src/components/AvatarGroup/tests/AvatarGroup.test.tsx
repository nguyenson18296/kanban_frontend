import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import AvatarGroupCustom from "../index";
import { createAssignee } from "@/test-factories";

afterEach(cleanup);

describe("AvatarGroupCustom", () => {
  it("renders nothing when avatars is empty", () => {
    const { container } = render(<AvatarGroupCustom avatars={[]} />);
    expect(container.querySelectorAll('[data-slot="avatar"]')).toHaveLength(0);
    expect(container.querySelector('[data-slot="avatar-group-count"]')).not.toBeInTheDocument();
  });

  it("renders a single avatar with fallback initial", () => {
    render(<AvatarGroupCustom avatars={[createAssignee("1", "Alice Smith")]} />);

    const group = screen.getByTestId("avatar-group");
    expect(within(group).getByText("A")).toBeInTheDocument();
  });

  it("renders up to 3 avatars by default", () => {
    const avatars = [
      createAssignee("1", "Alice"),
      createAssignee("2", "Bob"),
      createAssignee("3", "Charlie"),
    ];
    render(<AvatarGroupCustom avatars={avatars} />);

    const group = screen.getByTestId("avatar-group");
    expect(within(group).getByText("A")).toBeInTheDocument();
    expect(within(group).getByText("B")).toBeInTheDocument();
    expect(within(group).getByText("C")).toBeInTheDocument();
  });

  it("shows only first 3 avatars and a count when more than 3", () => {
    const avatars = [
      createAssignee("1", "Alice"),
      createAssignee("2", "Bob"),
      createAssignee("3", "Charlie"),
      createAssignee("4", "Diana"),
      createAssignee("5", "Eve"),
    ];
    const { container } = render(<AvatarGroupCustom avatars={avatars} />);

    // Only 3 avatar slots rendered
    expect(container.querySelectorAll('[data-slot="avatar"]')).toHaveLength(3);

    // 4th and 5th not rendered as avatars
    const group = screen.getByTestId("avatar-group");
    expect(within(group).queryByText("D")).not.toBeInTheDocument();
    expect(within(group).queryByText("E")).not.toBeInTheDocument();

    // Remaining count shown
    const countEl = container.querySelector('[data-slot="avatar-group-count"]');
    expect(countEl).toBeInTheDocument();
    expect(countEl).toHaveTextContent("+2");
  });

  it("does not show count when exactly 3 avatars", () => {
    const avatars = [
      createAssignee("1", "Alice"),
      createAssignee("2", "Bob"),
      createAssignee("3", "Charlie"),
    ];
    const { container } = render(<AvatarGroupCustom avatars={avatars} />);

    expect(container.querySelector('[data-slot="avatar-group-count"]')).not.toBeInTheDocument();
  });

  it("shows +1 when there are 4 avatars", () => {
    const avatars = [
      createAssignee("1", "Alice"),
      createAssignee("2", "Bob"),
      createAssignee("3", "Charlie"),
      createAssignee("4", "Diana"),
    ];
    const { container } = render(<AvatarGroupCustom avatars={avatars} />);

    const countEl = container.querySelector('[data-slot="avatar-group-count"]');
    expect(countEl).toBeInTheDocument();
    expect(countEl).toHaveTextContent("+1");
  });

  it("respects custom visibleCount", () => {
    const avatars = [
      createAssignee("1", "Alice"),
      createAssignee("2", "Bob"),
      createAssignee("3", "Charlie"),
      createAssignee("4", "Diana"),
    ];
    const { container } = render(<AvatarGroupCustom avatars={avatars} visibleCount={2} />);

    // Only 2 avatars rendered
    expect(container.querySelectorAll('[data-slot="avatar"]')).toHaveLength(2);

    // Count shows remaining 2
    const countEl = container.querySelector('[data-slot="avatar-group-count"]');
    expect(countEl).toBeInTheDocument();
    expect(countEl).toHaveTextContent("+2");
  });

  it("clamps negative visibleCount to 0", () => {
    const avatars = [createAssignee("1", "Alice"), createAssignee("2", "Bob")];
    const { container } = render(<AvatarGroupCustom avatars={avatars} visibleCount={-1} />);

    expect(container.querySelectorAll('[data-slot="avatar"]')).toHaveLength(0);

    const countEl = container.querySelector('[data-slot="avatar-group-count"]');
    expect(countEl).toBeInTheDocument();
    expect(countEl).toHaveTextContent("+2");
  });

  it("floors non-integer visibleCount", () => {
    const avatars = [
      createAssignee("1", "Alice"),
      createAssignee("2", "Bob"),
      createAssignee("3", "Charlie"),
    ];
    const { container } = render(<AvatarGroupCustom avatars={avatars} visibleCount={1.7} />);

    expect(container.querySelectorAll('[data-slot="avatar"]')).toHaveLength(1);

    const countEl = container.querySelector('[data-slot="avatar-group-count"]');
    expect(countEl).toBeInTheDocument();
    expect(countEl).toHaveTextContent("+2");
  });
});
