import { httpClient } from "@/lib/http-client"
import type { LoginResponse } from "@/types"
import { getCookie, removeCookie } from "@/lib/cookie"

export const login = (email: string, password: string) => {
  return httpClient.post<LoginResponse>('/auth/login', { email, password })
}

export const logout = async () => {
  await httpClient.post('/auth/logout', {
    refresh_token: getCookie('refresh_token'),
  })

  removeCookie('access_token');
  removeCookie('refresh_token');

  window.location.href = '/login';
}