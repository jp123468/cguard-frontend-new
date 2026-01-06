import axios, { AxiosError, AxiosInstance } from "axios"
import { toast } from "sonner"

const API_URL = import.meta.env.VITE_API_URL as string | undefined

const TOKEN_KEY = "authToken"

let _token: string | null = localStorage.getItem(TOKEN_KEY)

export const setAuthToken = (token: string | null) => {
  _token = token
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export const getAuthToken = () => _token

export const clearAuthToken = () => setAuthToken(null)

export type ApiError = {
  status?: number
  code?: string
  message: string
  details?: unknown
  url?: string
  method?: string
}

type MutableConfig = { __toastId?: string | number }

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: false,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
})

api.interceptors.request.use((config) => {
  const token = getAuthToken()
  // Debug: log token presence (masked) and url
  try {
    const mask = (t: string | null) => {
      if (!t) return null;
      if (t.length <= 12) return t;
      return `${t.slice(0, 6)}...${t.slice(-4)}`;
    };
  } catch {}
  if (token) {
    if (!config.headers) config.headers = {} as any;
    try {
      // Axios headers may be a plain object; set Authorization reliably
      (config.headers as any)["Authorization"] = `Bearer ${token}`
    } catch (e) {
      // fallback: ignore
    }
  }
  if (config.toast?.loading) {
    const id = toast.loading(config.toast.loading)
      ; (config as unknown as MutableConfig).__toastId = id
  }
  return config
})

function normalizeError(error: AxiosError): ApiError {
  const status = error.response?.status ?? (error.code === "ECONNABORTED" ? 408 : 0)
  const data: any = error.response?.data
  let message = error.message || "Error"
  if (data) {
    if (typeof data === "string") {
      // Backend returned plain text (localized message)
      message = data.trim()
    } else {
      message =
        data?.message ||
        data?.error ||
        (Array.isArray(data?.errors) ? data.errors.join(", ") : data?.errors) ||
        message
    }
  }

  const code = (data?.code as string | undefined) ?? error.code

  return {
    status,
    code,
    message,
    details: data,
    url: error.config?.url,
    method: error.config?.method?.toUpperCase(),
  }
}

api.interceptors.response.use(
  (response) => {
    const cfg = response.config as any as MutableConfig & { toast?: any }
    if (cfg.__toastId) {
      toast.dismiss(cfg.__toastId)
        ; (cfg as MutableConfig).__toastId = undefined
    }
    const successMsg = response.config.toast?.success
    if (successMsg) toast.success(successMsg)
    return response
  },
  (error) => {
    const cfg = (error.config || {}) as any as MutableConfig & { toast?: any }
    if (cfg.__toastId) {
      toast.dismiss(cfg.__toastId)
        ; (cfg as MutableConfig).__toastId = undefined
    }
    const apiError = normalizeError(error as AxiosError)
    if (!cfg.toast?.silentError) {
      const custom = cfg.toast?.error
      const msg = typeof custom === "function" ? custom(apiError) : custom || apiError.message
      toast.error(msg)
    }
    return Promise.reject(apiError)
  }
)

export default api
