import client from './client'

export interface IndexJob {
  id: number
  app_id: string
  /** none | pending | running | success | failed | cancelled */
  status: string
  trigger_type: string
  commit_hash: string | null
  include_wiki: boolean
  started_at: string | null
  completed_at: string | null
  stats: Record<string, number> | null
  error_message: string | null
}

export async function triggerIndex(
  appId: string,
  includeWiki = true,
  force = false,
): Promise<{ job_id: number; status: string }> {
  const res = await client.post(`/apps/${appId}/index`, {
    include_wiki: includeWiki,
    force,
  })
  return res.data
}

export async function getIndexStatus(appId: string): Promise<{
  status: string
  last_commit: string | null
  last_indexed_at: string | null
  stats: Record<string, number> | null
  current_job_id: number | null
}> {
  const res = await client.get(`/apps/${appId}/index/status`)
  return res.data
}

export async function getIndexJob(jobId: number): Promise<IndexJob> {
  const res = await client.get(`/index/jobs/${jobId}`)
  return res.data
}

export function getProgressUrl(jobId: number): string {
  const base = import.meta.env.VITE_API_BASE_URL || '/api/v1'
  return `${base}/index/jobs/${jobId}/progress`
}

export async function cancelIndex(appId: string): Promise<{ message: string }> {
  const res = await client.post(`/apps/${appId}/index/cancel`)
  return res.data
}

export interface SystemIndexStatus {
  running_count: number
  pending_count: number
  max_concurrent: number
  status_counts: Record<string, number>
  recent_completed: {
    app_id: string
    status: string
    completed_at: string | null
  } | null
}

export async function getSystemIndexStatus(systemId: string): Promise<SystemIndexStatus> {
  const res = await client.get<SystemIndexStatus>(`/systems/${systemId}/index-status`)
  return res.data
}
