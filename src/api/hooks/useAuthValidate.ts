import { useMutation } from '@tanstack/react-query'
import { apiClient } from '../client'

export function useAuthValidateFace() {
  return useMutation({
    mutationFn: (image: string) => apiClient.authValidateFace(image),
  })
}
