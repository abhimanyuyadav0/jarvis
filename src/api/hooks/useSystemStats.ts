import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../client'

export function useSystemStats(enabled: boolean) {
  return useQuery({
    queryKey: ['system-stats'],
    queryFn: () => apiClient.systemStats(),
    enabled,
    refetchInterval: 4000,
    retry: false,
  })
}
