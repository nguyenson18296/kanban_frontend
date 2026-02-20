import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { httpClient } from '../lib/http-client.ts';

interface User {
  id: string;
  email: string;
  name: string;
}

interface LoginPayload {
  email: string;
  password: string;
}

interface LoginResponse {
  token: string;
  user: User;
}

export function useLogin() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: LoginPayload) =>
      httpClient.post<LoginResponse>('/auth/login', payload),
    onSuccess: (data) => {
      localStorage.setItem('auth_token', data.token);
      qc.setQueryData(['currentUser'], data.user);
    },
  });
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ['currentUser'],
    queryFn: ({ signal }) => httpClient.get<User>('/auth/me', signal),
  });
}
