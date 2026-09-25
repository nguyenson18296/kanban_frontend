import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";

import { searchTasksAllProjects } from "@/services/search.service";
import type { ITaskSearchHit } from "@/types";

export const SEARCH_PAGE_SIZE = 20;

/** The API rejects `q` over 200 Unicode code points (checked before trimming server-side). */
const MAX_QUERY_CODE_POINTS = 200;

/** Shorter than the app default: results drift as tasks change, but retyping/toggling scope should still serve cache. */
const SEARCH_STALE_TIME_MS = 30_000;

/**
 * Cross-project task search (JSP-38), cache-backed. Each query string is its
 * own cache entry, so a stale response can never overwrite a newer query's results.
 */
export function useSearchTasks(query: string) {
  const q = Array.from(query.trim()).slice(0, MAX_QUERY_CODE_POINTS).join("");

  return useInfiniteQuery({
    queryKey: ["task-search", q],
    queryFn: ({ pageParam, signal }) =>
      searchTasksAllProjects(q, pageParam, SEARCH_PAGE_SIZE, signal),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined,
    enabled: q.length > 0,
    staleTime: SEARCH_STALE_TIME_MS,
    placeholderData: keepPreviousData,
    select: (data) => {
      // Results can drift between page fetches (tasks edited/created), letting
      // one hit land on two pages — keep the first occurrence so React keys
      // stay unique.
      const seen = new Set<string>();
      const hits: ITaskSearchHit[] = [];
      for (const page of data.pages) {
        for (const hit of page.data) {
          if (!seen.has(hit.id)) {
            seen.add(hit.id);
            hits.push(hit);
          }
        }
      }
      return { hits, total: data.pages.at(-1)?.meta.total ?? 0 };
    },
  });
}
