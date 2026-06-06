const API_BASE = (import.meta.env.VITE_API_URL ?? "http://localhost:3001/api").replace(
  /\/+$/,
  "",
);

/**
 * Build a displayable URL for a stored private file (e.g. the clock-in selfie).
 * The /file/download endpoint is reachable without an auth header (works in an
 * <img src>) and sets permissive CORS. Pass-through for already-absolute URLs.
 */
export function fileUrlFromPrivate(privateUrl?: string | null): string | null {
  if (!privateUrl) return null;
  const u = String(privateUrl);
  if (/^https?:\/\//i.test(u)) return u;
  return `${API_BASE}/file/download?privateUrl=${encodeURIComponent(u)}`;
}
