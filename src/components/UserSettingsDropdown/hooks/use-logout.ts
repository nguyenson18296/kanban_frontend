import { useMutation } from "@tanstack/react-query"
import { logout } from "@/services/auth.service"

export const useLogout = () => {
  return useMutation({
    mutationFn: logout,
  })
}

export default useLogout;