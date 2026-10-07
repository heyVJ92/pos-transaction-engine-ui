import { apiRequest } from './client'

export interface LoginResult {
  accessToken: string
}

export async function login(email: string, password: string): Promise<LoginResult> {
  const { data } = await apiRequest<LoginResult>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  return data
}
