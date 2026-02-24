import { useMutation } from '@tanstack/react-query'
import { apiClient } from '../client'

export function useFaceAnalyzeMutation() {
  return useMutation({
    mutationFn: (imageBase64: string) => apiClient.faceAnalyze(imageBase64),
  })
}
