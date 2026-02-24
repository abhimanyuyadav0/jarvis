export { apiClient } from './client'
export {
  useAuthRegister,
  useAuthRegisterFace,
  useAuthRegisterComplete,
  useAuthLogin,
  type AuthUser,
} from './hooks/useAuth'
export { useAuthValidateFace } from './hooks/useAuthValidate'
export { useChatMutation } from './hooks/useChat'
export type { Message } from './hooks/useChat'
export { useFaceAnalyzeMutation } from './hooks/useFace'
export {
  useDocumentsList,
  useDocumentUpload,
  useDocumentQuery,
  documentKeys,
} from './hooks/useDocuments'
