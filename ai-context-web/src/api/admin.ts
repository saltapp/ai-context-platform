import client from './client'

// ---------- User Management ----------

export interface AdminUser {
  id: number
  username: string
  display_name: string
  role: 'admin' | 'user'
  status: 'active' | 'disabled'
  system_quota: number
  created_at: string
}

export interface CreateUserRequest {
  username: string
  password: string
  display_name?: string
  role?: 'admin' | 'user'
}

export async function listUsers(): Promise<AdminUser[]> {
  const res = await client.get<AdminUser[]>('/admin/users')
  return res.data
}

export async function createUser(data: CreateUserRequest): Promise<AdminUser> {
  const res = await client.post<AdminUser>('/admin/users', data)
  return res.data
}

export async function updateUserStatus(userId: number, status: string): Promise<void> {
  await client.put(`/admin/users/${userId}/status`, { status })
}

// ---------- Audit Logs ----------

export interface AuditLog {
  id: number
  user_id: number | null
  username: string | null
  action: string
  target_type: string | null
  target_id: string | null
  details: string | null
  source: string | null
  ip_address: string | null
  created_at: string
}

export interface AuditLogListResponse {
  items: AuditLog[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface AuditLogQuery {
  page?: number
  page_size?: number
  username?: string
  action?: string
  target_type?: string
  start_date?: string
  end_date?: string
}

export async function listAuditLogs(query?: AuditLogQuery): Promise<AuditLogListResponse> {
  const params: Record<string, string | number | undefined> = {}
  if (query?.page) params.page = query.page
  if (query?.page_size) params.page_size = query.page_size
  if (query?.username) params.username = query.username
  if (query?.action) params.action = query.action
  if (query?.target_type) params.target_type = query.target_type
  if (query?.start_date) params.start_date = query.start_date
  if (query?.end_date) params.end_date = query.end_date

  const res = await client.get<AuditLogListResponse>('/admin/audit-logs', { params })
  return res.data
}
