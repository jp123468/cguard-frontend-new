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
      // `app` tags the session channel for single-active-session enforcement:
      // a second WEB login supersedes the previous browser session, while the
      // mobile apps ('worker'/'supervisor') live on their own channels.
      const response = await ApiService.post('/auth/sign-in', { ...credentials, app: 'web' }, { skipAuth: true })
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
    // NOTE: never log `payload`/`response` here — they contain the plaintext password.
    const response = await ApiService.post('/auth/sign-up', payload, { skipAuth: true })
    return response
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
