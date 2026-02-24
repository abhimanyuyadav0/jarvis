const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const apiClient = {
  async chat(messages: { role: string; content: string }[]) {
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
    return data.content as string
  },

  async faceAnalyze(imageBase64: string) {
    const res = await fetch(`${API_BASE}/api/face/analyze-base64`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imageBase64 }),
    })
    if (!res.ok) throw new Error('Face analysis failed')
    return res.json()
  },

  async uploadDocument(file: File) {
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
  },

  async queryDocuments(question: string) {
    const res = await fetch(`${API_BASE}/api/documents/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    })
    if (!res.ok) throw new Error('Query failed')
    return res.json()
  },

  async listDocuments() {
    const res = await fetch(`${API_BASE}/api/documents/list`)
    if (!res.ok) return { documents: [] }
    return res.json()
  },

  async authValidateFace(imageBase64: string) {
    const res = await fetch(`${API_BASE}/api/auth/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imageBase64 }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || 'Validation failed')
    }
    return res.json()
  },

  async authRegisterFace(imageBase64: string) {
    const res = await fetch(`${API_BASE}/api/auth/register-face`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imageBase64 }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || 'Registration failed')
    }
    return res.json()
  },

  async authRegisterComplete(userId: string, name?: string) {
    const res = await fetch(`${API_BASE}/api/auth/register-complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, name: name || '' }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || 'Registration failed')
    }
    return res.json()
  },

  async authRegister(imageBase64: string, name?: string) {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imageBase64, name: name || '' }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || 'Registration failed')
    }
    return res.json()
  },

  async authLogin(imageBase64: string) {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imageBase64 }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || 'Login failed')
    }
    return res.json()
  },
}
