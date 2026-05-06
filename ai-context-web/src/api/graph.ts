import client from './client'

export interface SearchResult {
  results: unknown[]
  total: number
}

export async function searchCode(
  appId: string,
  query: string,
  mode = 'hybrid',
  limit = 20,
): Promise<SearchResult> {
  const res = await client.post(`/apps/${appId}/search`, { query, mode, limit })
  return res.data
}

export async function getWikiIndex(appId: string): Promise<{
  modules: { name: string; file: string }[]
}> {
  const res = await client.get(`/apps/${appId}/wiki`)
  return res.data
}

export async function getWikiContent(
  appId: string,
  module: string,
): Promise<{ name: string; content: string }> {
  const res = await client.get(`/apps/${appId}/wiki/${module}`)
  return res.data
}

export async function getRoutes(appId: string): Promise<{
  routes: {
    method: string
    path: string
    handler: string
    handler_file: string
    middleware: string[]
    consumers: { name: string; file: string }[]
  }[]
}> {
  const res = await client.get(`/apps/${appId}/routes`)
  return res.data
}
