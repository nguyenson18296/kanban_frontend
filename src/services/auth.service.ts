import { httpClient } from "@/lib/http-client"
import type { LoginResponse } from "@/types"

export const login = (email: string, password: string) => {
  return httpClient.post<LoginResponse>('/auth/login', { email, password })
}
