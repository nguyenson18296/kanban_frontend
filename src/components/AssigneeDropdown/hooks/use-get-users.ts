import { useQuery } from "@tanstack/react-query";

import { getUsers } from "@/services/user.service";
import { useStoreUsersList } from "@/stores/use-store-users-list";

export const useGetUsers = () => {
  const setUsers = useStoreUsersList((s) => s.setUsers);

  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const users = await getUsers();
      setUsers(users);
      return users;
    },
  });
}
