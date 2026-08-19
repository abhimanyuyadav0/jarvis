import { useMutation } from '@tanstack/react-query'
import { apiClient } from '../client'

export interface AuthUser {
  user_id: string
  name: string
  token: string
}

export function useAuthRegister() {
  return useMutation({
    mutationFn: ({ email, password, name }: { email: string; password: string; name?: string }) =>
      apiClient.authRegister(email, password, name),
  })
}

export function useAuthLogin() {
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      apiClient.authLogin(email, password),
  })
}
