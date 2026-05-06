import client from './client'

export interface ImpactRequest {
  target: string
  direction?: string
  depth?: number
  cross_project?: boolean
  cross_system?: boolean
}

export interface ImpactResult {
  target: { name: string; type: string; file: string }
  risk: string
  summary: {
    direct_upstream: number
    direct_downstream: number
    affected_processes: number
    cross_project_impacts?: { app_id: string; symbols: unknown[] }[]
    cross_system_impacts?: { system_id: string; system_name: string; symbols: unknown[] }[]
  }
  upstream: { depth: number; nodes: unknown[] }[]
  downstream: { depth: number; nodes: unknown[] }[]
  affected_processes: { id: string; label: string; steps: unknown[] }[]
}

export async function analyzeImpact(appId: string, data: ImpactRequest): Promise<ImpactResult> {
  const res = await client.post(`/apps/${appId}/impact`, {
    direction: 'both',
    depth: 3,
    ...data,
  })
  return res.data
}
