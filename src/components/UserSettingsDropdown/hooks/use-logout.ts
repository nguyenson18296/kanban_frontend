import { useMutation } from "@tanstack/react-query"
import { logout } from "@/services/auth.service"
import { toastError } from "@/lib/toast-error"

export const useLogout = () => {
  return useMutation({
    mutationFn: logout,
    onError: (error) => {
      toastError(error, "Couldn't log out. Please try again.")
    },
  })
}

export default useLogout;