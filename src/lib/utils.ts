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

/**
 * Today's date as YYYY-MM-DD in the operator's LOCAL wall-clock (NOT UTC).
 * `new Date().toISOString()` is UTC, which rolls to the next day in negative-UTC
 * zones (Ecuador UTC-5 after 19:00) — that pushed a guard assigned "today" onto
 * tomorrow's shift. Use this for any startDate/"today" the user picks.
 */
export function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
