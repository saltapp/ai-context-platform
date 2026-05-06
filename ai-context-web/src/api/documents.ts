import client from './client'

export interface Document {
  id: string
  system_id: string
  app_id: string | null
  doc_type: string
  title: string
  file_name: string
  storage_path: string
  file_size: number
  created_by: number | null
  created_at: string
}

export async function listSystemDocs(systemId: string): Promise<Document[]> {
  const res = await client.get(`/systems/${systemId}/documents`)
  return res.data
}

export async function listAppDocs(appId: string): Promise<Document[]> {
  const res = await client.get(`/apps/${appId}/documents`)
  return res.data
}

export async function uploadDocument(
  url: string,
  file: File,
  docType: string,
  title: string,
): Promise<Document> {
  const form = new FormData()
  form.append('file', file)
  form.append('doc_type', docType)
  form.append('title', title)
  const res = await client.post(url, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data
}

export async function getDownloadUrl(docId: string): Promise<string> {
  const res = await client.get<{ url: string }>(`/documents/${docId}/download`)
  return res.data.url
}

export async function deleteDocument(docId: string): Promise<void> {
  await client.delete(`/documents/${docId}`)
}

export async function downloadFile(docId: string): Promise<void> {
  const url = await getDownloadUrl(docId)
  window.open(url, '_blank')
}
