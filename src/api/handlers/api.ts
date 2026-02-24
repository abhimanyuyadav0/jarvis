/**
 * Legacy API handlers - use api/client.ts and api/hooks/* instead.
 */
import { apiClient } from '../client'

export { apiClient }

export const chatApi = apiClient.chat.bind(apiClient)
export const faceAnalyzeBase64 = apiClient.faceAnalyze.bind(apiClient)
export const uploadDocument = apiClient.uploadDocument.bind(apiClient)
export const queryDocuments = apiClient.queryDocuments.bind(apiClient)
export const listDocuments = apiClient.listDocuments.bind(apiClient)
export const authRegister = (image: string, name?: string) =>
  apiClient.authRegister(image, name)
export const authLogin = (image: string) => apiClient.authLogin(image)
