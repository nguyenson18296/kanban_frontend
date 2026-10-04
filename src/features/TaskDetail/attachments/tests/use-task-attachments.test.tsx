import { renderHook, waitFor } from "@testing-library/react";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useTaskAttachments } from "../hooks/use-task-attachments";
import { getTaskAttachments } from "@/services/attachment.service";
import { ATTACHMENTS_PAGE_SIZE } from "../hooks/use-task-attachments";
import { TASK_ID, createQueryWrapper, makeAttachment, makePage } from "./test-utils";

vi.mock("@/services/attachment.service");

afterEach(() => {
  vi.clearAllMocks();
});

describe("useTaskAttachments", () => {
  it("fetches the first page and exposes the rows with the server total", async () => {
    const rows = [
      makeAttachment({ id: "a1", file_name: "one.png" }),
      makeAttachment({ id: "a2", file_name: "two.pdf" }),
    ];
    vi.mocked(getTaskAttachments).mockResolvedValue(makePage(rows, { total: 2 }));
    const { wrapper } = createQueryWrapper();

    const { result } = renderHook(() => useTaskAttachments(TASK_ID), { wrapper });

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(getTaskAttachments).toHaveBeenCalledWith(
      TASK_ID,
      1,
      ATTACHMENTS_PAGE_SIZE,
      expect.any(AbortSignal),
    );
    expect(result.current.data?.attachments.map((a) => a.id)).toEqual(["a1", "a2"]);
    expect(result.current.data?.total).toBe(2);
    expect(result.current.hasNextPage).toBe(false);
  });

  it("pages forward while more pages exist and drops rows that drifted across pages", async () => {
    const a = makeAttachment({ id: "a1" });
    const b = makeAttachment({ id: "a2" });
    const c = makeAttachment({ id: "a3" });
    vi.mocked(getTaskAttachments)
      .mockResolvedValueOnce(makePage([a, b], { page: 1, total: 3, totalPages: 2 }))
      // An offset shift (upload/delete in between) can repeat a row on page 2.
      .mockResolvedValueOnce(makePage([b, c], { page: 2, total: 3, totalPages: 2 }));
    const { wrapper } = createQueryWrapper();

    const { result } = renderHook(() => useTaskAttachments(TASK_ID), { wrapper });

    // Read every property the assertions below depend on — react-query only
    // re-renders for tracked properties (see use-search-tasks.test.tsx).
    await waitFor(() => {
      expect(result.current.data?.attachments).toHaveLength(2);
      expect(result.current.hasNextPage).toBe(true);
    });

    await act(async () => {
      await result.current.fetchNextPage();
    });

    await waitFor(() =>
      expect(result.current.data?.attachments.map((row) => row.id)).toEqual(["a1", "a2", "a3"]),
    );
    expect(getTaskAttachments).toHaveBeenLastCalledWith(
      TASK_ID,
      2,
      ATTACHMENTS_PAGE_SIZE,
      expect.any(AbortSignal),
    );
    expect(result.current.hasNextPage).toBe(false);
  });
});
