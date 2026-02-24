import { chatApi } from './api'

export interface Message {
  role: 'user' | 'assistant'
  content: string
}

const MOCK_RESPONSES = [
  "At your service. How may I assist you today?",
  "Processing your request. I'm always here to help.",
  "An excellent question. Allow me to elaborate...",
  "Sir, I've analyzed the situation. Here are my findings.",
]

export async function sendMessage(messages: Message[]): Promise<string> {
  const apiUrl = import.meta.env.VITE_API_URL
  if (apiUrl) {
    try {
      const formatted = messages.map(m => ({ role: m.role, content: m.content }))
      return await chatApi(formatted)
    } catch (e) {
      throw new Error(e instanceof Error ? e.message : 'API error')
    }
  }
  await new Promise(r => setTimeout(r, 600 + Math.random() * 300))
  const lastUser = [...messages].reverse().find(m => m.role === 'user')
  return MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)] +
    (lastUser ? ` (You said: "${lastUser.content.slice(0, 40)}...")` : '')
}
