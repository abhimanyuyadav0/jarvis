import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../client'

export const documentKeys = {
  all: ['documents'] as const,
  list: () => [...documentKeys.all, 'list'] as const,
}

export function useDocumentsList() {
  return useQuery({
    queryKey: documentKeys.list(),
    queryFn: () => apiClient.listDocuments(),
    select: (data) => data.documents ?? [],
    retry: false,
  })
}

export function useDocumentUpload() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => apiClient.uploadDocument(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentKeys.list() })
    },
  })
}

export function useDocumentQuery() {
  return useMutation({
    mutationFn: (question: string) => apiClient.queryDocuments(question),
  })
}
