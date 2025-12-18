export function getServerErrorMessage(error: any, fallback = 'Error desconocido') {
  try {
    if (!error) return fallback;
    // Prefer explicit server message
    const serverMessage = error?.response?.data?.message || error?.data?.message || error?.data || null;
    if (serverMessage) return typeof serverMessage === 'string' ? serverMessage : (serverMessage.message || JSON.stringify(serverMessage));
    // Generic message
    if (error?.message) return error.message;
    return fallback;
  } catch (e) {
    return fallback;
  }
}

export default getServerErrorMessage;
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
