import { useMutation, useQueryClient } from "@tanstack/react-query"
import { login } from "@/services/auth.service"
import { saveTokens } from "@/lib/http-client"
import type { LoginPayload } from "@/types"

export const useLogin = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: LoginPayload) => login(payload.email, payload.password),
    onSuccess: (data) => {
      saveTokens(data)
      queryClient.setQueryData(['currentUser'], data.user)
    },
  })
}
