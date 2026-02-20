interface LoginPayload {
  email: string
  password: string
}

interface User {
  id: string
  email: string
  full_name: string
  role: string
}

interface LoginResponse {
  access_token: string
  user: User
}

export type { LoginPayload, LoginResponse, User }