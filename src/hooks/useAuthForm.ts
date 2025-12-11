import { useState } from 'react'
import { toast } from "sonner";
interface UseAuthFormReturn {
  email: string
  password: string
  confirmPassword: string
  showPassword: boolean
  isLoading: boolean
  setEmail: (email: string) => void
  setPassword: (password: string) => void
  setConfirmPassword: (password: string) => void
  toggleShowPassword: () => void
  setIsLoading: (loading: boolean) => void
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

  const toggleShowPassword = () => setShowPassword(!showPassword)

  const resetForm = () => {
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setShowPassword(false)
    setIsLoading(false)

  }

  const validateEmail = (): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email) {
       toast.error('El correo electrónico es requerido')
      return false
    }
    if (!emailRegex.test(email)) {
       toast.error('Correo electrónico inválido')
      return false
    }
    return true
  }

  const validatePassword = (minLength = 6): boolean => {
    if (!password) {
       toast.error('La contraseña es requerida')
      return false
    }
    if (password.length < minLength) {
       toast.error(`La contraseña debe tener al menos ${minLength} caracteres`)
      return false
    }
    return true
  }

  const validatePasswordMatch = (): boolean => {
    if (password !== confirmPassword) {
       toast.error('Las contraseñas no coinciden')
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
    setEmail,
    setPassword,
    setConfirmPassword,
    toggleShowPassword,
    setIsLoading,
    resetForm,
    validateEmail,
    validatePassword,
    validatePasswordMatch,
  }
}