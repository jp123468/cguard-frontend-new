import { useState } from 'react'

interface UseAuthFormReturn {
  email: string
  password: string
  confirmPassword: string
  showPassword: boolean
  isLoading: boolean
  formError: string
  setEmail: (email: string) => void
  setPassword: (password: string) => void
  setConfirmPassword: (password: string) => void
  toggleShowPassword: () => void
  setIsLoading: (loading: boolean) => void
  setFormError: (error: string) => void
  resetForm: () => void
  validateEmail: () => boolean
  validatePassword: (minLength?: number) => boolean
  validatePasswordMatch: () => boolean
}

export const useAuthForm = (): UseAuthFormReturn => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formError, setFormError] = useState('')

  const toggleShowPassword = () => setShowPassword(!showPassword)

  const resetForm = () => {
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setShowPassword(false)
    setIsLoading(false)
    setFormError('')
  }

  const validateEmail = (): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email) {
      setFormError('El correo electrónico es requerido')
      return false
    }
    if (!emailRegex.test(email)) {
      setFormError('Correo electrónico inválido')
      return false
    }
    return true
  }

  const validatePassword = (minLength = 6): boolean => {
    if (!password) {
      setFormError('La contraseña es requerida')
      return false
    }
    if (password.length < minLength) {
      setFormError(`La contraseña debe tener al menos ${minLength} caracteres`)
      return false
    }
    return true
  }

  const validatePasswordMatch = (): boolean => {
    if (password !== confirmPassword) {
      setFormError('Las contraseñas no coinciden')
      return false
    }
    return true
  }

  return {
    email,
    password,
    confirmPassword,
    showPassword,
    isLoading,
    formError,
    setEmail,
    setPassword,
    setConfirmPassword,
    toggleShowPassword,
    setIsLoading,
    setFormError,
    resetForm,
    validateEmail,
    validatePassword,
    validatePasswordMatch,
  }
}