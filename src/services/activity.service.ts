import { httpClient } from "@/lib/http-client";
import type { IActivity, IActivityQueryParams, IResponse } from "@/types";

export const getActivities = (taskId: string, params: IActivityQueryParams = {}) => {
  const queryParams = new URLSearchParams(
    Object.entries(params)
      .filter((entry): entry is [string, string | number | boolean] => entry[1] != null)
      .map(([key, value]) => [key, String(value)])
  );
  const query = queryParams.toString();
  return httpClient.get<IResponse<IActivity[]>>(
    `/tasks/${taskId}/activities${query ? `?${query}` : ""}`
  );
};
