import { useMutation, useQueryClient } from "@tanstack/react-query"
import { login } from "@/services/auth.service"
import { decodeJwt } from "@/lib/jwt"
import { setCookie } from "@/lib/cookie"
import type { LoginPayload } from "@/types"

export const useLogin = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: LoginPayload) => login(payload.email, payload.password),
    onSuccess: (data) => {
      const payload = decodeJwt(data.access_token)
      const maxAge = payload.exp ? payload.exp - Math.floor(Date.now() / 1000) : undefined

      setCookie('access_token', data.access_token, { maxAge })
      queryClient.setQueryData(['currentUser'], data.user)
    },
  })
}
