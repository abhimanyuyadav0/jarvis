const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export async function chatApi(messages: { role: string; content: string }[]) {
  const res = await fetch(`${API_BASE}/api/chat/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(messages),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Chat failed')
  }
  const data = await res.json()
  return data.content
}

export async function faceAnalyzeBase64(imageBase64: string) {
  const res = await fetch(`${API_BASE}/api/face/analyze-base64`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: imageBase64 }),
  })
  if (!res.ok) throw new Error('Face analysis failed')
  return res.json()
}

export async function uploadDocument(file: File) {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${API_BASE}/api/documents/upload`, {
    method: 'POST',
    body: form,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Upload failed')
  }
  return res.json()
}

export async function queryDocuments(question: string) {
  const res = await fetch(`${API_BASE}/api/documents/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  })
  if (!res.ok) throw new Error('Query failed')
  return res.json()
}

export async function listDocuments() {
  const res = await fetch(`${API_BASE}/api/documents/list`)
  if (!res.ok) return { documents: [] }
  return res.json()
}
