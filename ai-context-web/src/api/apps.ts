import client from './client'
import type { App } from './systems'

export interface CreateAppData {
  name: string
  git_url: string
  tracked_branch?: string
  tech_stack?: string
  owner?: string
}

export interface UpdateAppData {
  name?: string
  git_url?: string
  tracked_branch?: string
  tech_stack?: string
  owner?: string
}

export async function listApps(systemId: string): Promise<App[]> {
  const res = await client.get<App[]>(`/systems/${systemId}/apps`)
  return res.data
}

export async function getApp(id: string): Promise<App> {
  const res = await client.get<App>(`/apps/${id}`)
  return res.data
}

export async function createApp(systemId: string, data: CreateAppData): Promise<App> {
  const res = await client.post<App>(`/systems/${systemId}/apps`, data)
  return res.data
}

export async function updateApp(id: string, data: UpdateAppData): Promise<App> {
  const res = await client.put<App>(`/apps/${id}`, data)
  return res.data
}

export async function deleteApp(id: string): Promise<void> {
  await client.delete(`/apps/${id}`)
}
