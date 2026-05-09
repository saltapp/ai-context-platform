import client from './client'

export interface System {
  id: string
  name: string
  group_name: string
  description: string | null
  owner: string | null
  gitlab_username: string | null
  created_by: number | null
  created_at: string
  updated_at: string
  apps?: App[]
}

export interface App {
  id: string
  system_id: string
  name: string
  git_url: string
  repo_path: string | null
  tracked_branch: string
  tech_stack: string | null
  owner: string | null
  created_by: number | null
  /** none | pending | running | success | failed | cancelled */
  index_status: string
  last_indexed_at: string | null
  last_commit: string | null
  current_job_id?: number | null
}

export interface CreateSystemData {
  name: string
  description?: string
  owner?: string
  gitlab_username?: string
  gitlab_token?: string
}

export interface UpdateSystemData {
  name?: string
  description?: string
  owner?: string
}

export async function listSystems(): Promise<System[]> {
  const res = await client.get<System[]>('/systems')
  return res.data
}

export async function getSystem(id: string): Promise<System> {
  const res = await client.get<System>(`/systems/${id}`)
  return res.data
}

export async function createSystem(data: CreateSystemData): Promise<System> {
  const res = await client.post<System>('/systems', data)
  return res.data
}

export async function updateSystem(id: string, data: UpdateSystemData): Promise<System> {
  const res = await client.put<System>(`/systems/${id}`, data)
  return res.data
}

export async function deleteSystem(id: string, confirmName?: string): Promise<void> {
  await client.delete(`/systems/${id}`, {
    data: confirmName ? { confirm_name: confirmName } : undefined,
  })
}

export async function updateGitlabCredentials(
  id: string,
  gitlab_username: string,
  gitlab_token: string,
): Promise<System> {
  const res = await client.put<System>(`/systems/${id}/gitlab-credentials`, {
    gitlab_username,
    gitlab_token,
  })
  return res.data
}

// Relations
export interface SystemRelation {
  id: number
  source_system_id: string
  target_system_id: string
  relation_type: string
  description: string | null
  created_at: string
  target_system?: { id: string; name: string }
  source_system?: { id: string; name: string }
}

export async function listRelations(systemId: string): Promise<SystemRelation[]> {
  const res = await client.get<SystemRelation[]>(`/systems/${systemId}/relations`)
  return res.data
}

export async function addRelation(
  systemId: string,
  target_system_id: string,
  relation_type: string,
  description?: string,
): Promise<SystemRelation> {
  const res = await client.post<SystemRelation>(`/systems/${systemId}/relations`, {
    target_system_id,
    relation_type,
    description,
  })
  return res.data
}

export async function removeRelation(systemId: string, targetId: string): Promise<void> {
  await client.delete(`/systems/${systemId}/relations/${targetId}`)
}
