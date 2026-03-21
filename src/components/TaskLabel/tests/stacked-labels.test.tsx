import { createRef } from "react";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import StackedLabels from "../stacked-labels";
import type { ILabel } from "@/types";

// --- Helpers ---

function createLabel(id: string, name: string, color: string): ILabel {
  return { id, name, color, created_at: "", updated_at: "" };
}

afterEach(cleanup);

describe("StackedLabels", () => {
  describe("rendering", () => {
    it("renders all label names", () => {
      const labels = [
        createLabel("1", "Bug", "#ef4444"),
        createLabel("2", "Feature", "#3b82f6"),
      ];
      render(<StackedLabels labels={labels} />);

      expect(screen.getByText("Bug")).toBeInTheDocument();
      expect(screen.getByText("Feature")).toBeInTheDocument();
    });

    it("renders nothing inside button when labels are empty", () => {
      render(<StackedLabels labels={[]} />);

      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
      expect(button.children).toHaveLength(0);
    });

    it("renders color dots with correct background color", () => {
      const labels = [createLabel("1", "Bug", "#ef4444")];
      const { container } = render(<StackedLabels labels={labels} />);

      const dot = container.querySelector(".size-2.rounded-full");
      expect(dot).toHaveStyle({ backgroundColor: "#ef4444" });
    });
  });

  describe("stacking layout", () => {
    it("applies negative margin to labels after the first", () => {
      const labels = [
        createLabel("1", "Bug", "#ef4444"),
        createLabel("2", "Feature", "#3b82f6"),
        createLabel("3", "Docs", "#22c55e"),
      ];
      const { container } = render(<StackedLabels labels={labels} />);

      const spans = container.querySelectorAll("button > span");
      expect(spans[0]).toHaveStyle({ marginLeft: "0px" });
      expect(spans[1]).toHaveStyle({ marginLeft: "-8px" });
      expect(spans[2]).toHaveStyle({ marginLeft: "-8px" });
    });

    it("applies descending z-index so first label is on top", () => {
      const labels = [
        createLabel("1", "Bug", "#ef4444"),
        createLabel("2", "Feature", "#3b82f6"),
        createLabel("3", "Docs", "#22c55e"),
      ];
      const { container } = render(<StackedLabels labels={labels} />);

      const spans = container.querySelectorAll("button > span");
      expect(spans[0]).toHaveStyle({ zIndex: 3 });
      expect(spans[1]).toHaveStyle({ zIndex: 2 });
      expect(spans[2]).toHaveStyle({ zIndex: 1 });
    });
  });

  describe("ref and props", () => {
    it("passes ref to the button element", () => {
      const ref = createRef<HTMLButtonElement>();
      render(<StackedLabels ref={ref} labels={[]} />);

      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });

    it("spreads additional props onto the button", () => {
      const handleClick = vi.fn();
      render(
        <StackedLabels
          labels={[]}
          data-testid="custom-trigger"
          onClick={handleClick}
        />,
      );

      const button = screen.getByTestId("custom-trigger");
      fireEvent.click(button);
      expect(handleClick).toHaveBeenCalledOnce();
    });
  });
});
