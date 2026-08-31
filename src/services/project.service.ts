import { httpClient } from "@/lib/http-client";
import type { IProject } from "@/types";

export const getProjects = (signal?: AbortSignal) => {
  return httpClient.get<IProject[]>("/projects", signal);
};
