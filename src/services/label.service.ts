import { httpClient } from "@/lib/http-client";
import type { ILabel } from "@/types";

export const getLabels = () => {
  return httpClient.get<ILabel[]>('/labels');
}
