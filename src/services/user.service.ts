import { httpClient } from "@/lib/http-client";
import type { IUser } from "@/types";

export const getUsers = () => {
  return httpClient.get<IUser[]>('/users');
}
