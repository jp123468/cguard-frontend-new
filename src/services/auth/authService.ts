import { ApiService } from '../api/apiService'

export interface LoginCredentials {
  email: string
  password: string
}

export interface SignUpData {
  email: string
  password: string
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
    const response = await ApiService.post('/auth/sign-up', data, { skipAuth: true })
    return response
  }

  static async getProfile(): Promise<any> {
    return ApiService.get('/auth/me')
  }

  static async signOut(): Promise<void> {
    try {
      await ApiService.post('/auth/sign-out', {})
    } catch (error) {
      console.error('Error during logout:', error)
    }
  }

  static async sendPasswordResetEmail(email: string): Promise<void> {
    return ApiService.post('/auth/send-password-reset-email', { email }, { skipAuth: true })
  }
}
