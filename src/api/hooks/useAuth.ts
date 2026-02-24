import { useMutation } from '@tanstack/react-query'
import { apiClient } from '../client'

export interface AuthUser {
  user_id: string
  name: string
  token: string
}

export function useAuthRegister() {
  return useMutation({
    mutationFn: ({ image, name }: { image: string; name?: string }) =>
      apiClient.authRegister(image, name),
  })
}

export function useAuthRegisterFace() {
  return useMutation({
    mutationFn: (image: string) => apiClient.authRegisterFace(image),
  })
}

export function useAuthRegisterComplete() {
  return useMutation({
    mutationFn: ({ userId, name }: { userId: string; name?: string }) =>
      apiClient.authRegisterComplete(userId, name),
  })
}

export function useAuthLogin() {
  return useMutation({
    mutationFn: (image: string) => apiClient.authLogin(image),
  })
}
