import client from './client'

export interface User {
  id: number
  username: string
  display_name: string
  role: string
  created_at: string | null
}

export interface LoginResponse {
  access_token: string
  refresh_token: string
  user: User
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const res = await client.post<LoginResponse>('/auth/login', { username, password })
  return res.data
}

export async function refreshTokens(
  refreshToken: string,
): Promise<{ access_token: string; refresh_token: string }> {
  const res = await client.post<{ access_token: string; refresh_token: string }>('/auth/refresh', {
    refresh_token: refreshToken,
  })
  return res.data
}

export async function getMe(): Promise<User> {
  const res = await client.get<User>('/auth/me')
  return res.data
}
