import { useMutation } from '@tanstack/react-query'
import { apiClient } from '../client'

export interface Message {
  role: 'user' | 'assistant'
  content: string
}

export function useChatMutation() {
  return useMutation({
    mutationFn: (messages: Message[]) =>
      apiClient.chat(messages.map((m) => ({ role: m.role, content: m.content }))),
  })
}
