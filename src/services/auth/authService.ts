import { ApiService } from '../api/apiService'

export interface LoginCredentials {
  email: string
  password: string
}

export interface SignUpData {
  email: string
  password: string
  name: string
  invitationToken?: string
  tenantId?: string
}

export interface AuthResponse {
  token: string
  user?: any
}

export class AuthService {
  static async signIn(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await ApiService.post('/auth/sign-in', credentials, { skipAuth: true })
      return response
    } catch (err: any) {
      const msg = err?.message || ''
      if (msg === 'auth.emailNotVerified') {
        try {
          await ApiService.post(
            '/auth/send-email-address-verification-email',
            { email: credentials.email },
            { skipAuth: true }
          )
        } catch {}
      }
      throw err
    }
  }

  static async signUp(data: SignUpData): Promise<AuthResponse> {
    // Some backends expect `fullName` or `firstName` instead of `name`.
    // Include both to improve compatibility with different schemas.
    // split name into firstName and lastName
    const rawName = (data as any).name ? String((data as any).name).trim() : ''
    let firstName: string | undefined = undefined
    let lastName: string | undefined = undefined
    if (rawName) {
      const parts = rawName.split(/\s+/)
      firstName = parts[0]
      if (parts.length > 1) {
        lastName = parts.slice(1).join(' ')
      }
    }

    const payload = {
      ...data,
      fullName: rawName || undefined,
      firstName: firstName || undefined,
      lastName: lastName || undefined,
    }
    try {
      console.log('[AuthService] signUp payload ->', payload)
      const response = await ApiService.post('/auth/sign-up', payload, { skipAuth: true })
      console.log('[AuthService] signUp response <-', response)
      return response
    } catch (err: any) {
      console.error('[AuthService] signUp error <-', err)
      throw err
    }
  }

  static async getProfile(): Promise<any> {
    return ApiService.get('/auth/me')
  }

  static async signOut(): Promise<void> {
    // El logout se maneja completamente en el frontend limpiando el localStorage
    // No es necesario llamar al backend ya que estamos usando JWT stateless
    return Promise.resolve();
  }

  static async sendPasswordResetEmail(email: string): Promise<void> {
    return ApiService.post('/auth/send-password-reset-email', { email }, { skipAuth: true })
  }

  static async resetPassword(token: string, newPassword: string): Promise<void> {
    // Backend expects PUT /auth/password-reset with { token, password }
    return ApiService.put('/auth/password-reset', { token, password: newPassword }, { skipAuth: true })
  }
}
