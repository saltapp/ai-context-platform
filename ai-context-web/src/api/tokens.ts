import client from './client'

export interface ApiToken {
  id: string
  name: string
  token_prefix: string
  status: string
  expires_at: string | null
  last_used_at: string | null
}

export interface CreateTokenResponse {
  id: string
  token: string
  expires_at: string | null
}

export interface RotateTokenResponse {
  id: string
  token: string
  expires_at: string | null
}

export async function createToken(name: string): Promise<CreateTokenResponse> {
  const res = await client.post<CreateTokenResponse>('/tokens', { name })
  return res.data
}

export async function listTokens(): Promise<ApiToken[]> {
  const res = await client.get<ApiToken[]>('/tokens')
  return res.data
}

export async function rotateToken(id: string): Promise<RotateTokenResponse> {
  const res = await client.post<RotateTokenResponse>(`/tokens/${id}/rotate`)
  return res.data
}

export async function deleteToken(id: string): Promise<void> {
  await client.delete(`/tokens/${id}`)
}

export async function hardDeleteToken(id: string): Promise<void> {
  await client.delete(`/tokens/${id}/hard`)
}
