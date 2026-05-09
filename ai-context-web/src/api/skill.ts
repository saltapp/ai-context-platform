import client from './client'

export async function downloadSkillZip(): Promise<void> {
  const res = await client.get('/skill/download', { responseType: 'blob' })
  const url = URL.createObjectURL(res.data)
  const a = document.createElement('a')
  a.href = url
  a.download = 'ai-context-skill.zip'
  a.click()
  URL.revokeObjectURL(url)
}
