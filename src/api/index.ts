export { apiClient, setAuthToken, setOnUnauthorized } from './client'
export {
  useAuthRegister,
  useAuthLogin,
  type AuthUser,
} from './hooks/useAuth'
export { useChatMutation } from './hooks/useChat'
export type { Message } from './hooks/useChat'
export { useFaceAnalyzeMutation } from './hooks/useFace'
export { useSystemStats } from './hooks/useSystemStats'
export {
  useDocumentsList,
  useDocumentUpload,
  useDocumentQuery,
  documentKeys,
} from './hooks/useDocuments'
