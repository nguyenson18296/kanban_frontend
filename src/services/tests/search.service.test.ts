import { afterEach, describe, expect, it, vi } from "vitest";

import { searchTasksAllProjects } from "../search.service";
import { httpClient } from "@/lib/http-client";

vi.mock("@/lib/http-client", () => ({
  httpClient: { get: vi.fn() },
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe("searchTasksAllProjects service", () => {
  it("URL-encodes the query and passes q, page, limit and the abort signal through", async () => {
    vi.mocked(httpClient.get).mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });
    const controller = new AbortController();

    await searchTasksAllProjects('"login page" -mobile', 2, 20, controller.signal);

    expect(httpClient.get).toHaveBeenCalledWith(
      "/search/tasks?q=%22login+page%22+-mobile&page=2&limit=20",
      controller.signal,
    );
  });
});
