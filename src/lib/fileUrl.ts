const API_BASE = (import.meta.env.VITE_API_URL ?? "http://localhost:3001/api").replace(
  /\/+$/,
  "",
);

/**
 * Build a displayable URL for a stored private file (e.g. the clock-in selfie).
 * The /file/download endpoint is consumed via <img src>, so no auth header is
 * attached by the browser. Pass-through for already-absolute URLs.
 *
 * SECURITY (backend contract — cannot be enforced from the client): the
 * /file/download endpoint MUST authorize the request (session cookie / signed
 * token) and the `privateUrl` values MUST be unguessable, opaque, and ideally
 * signed + expiring. If the backend serves private files solely on a guessable
 * `privateUrl`, that is an IDOR/data-exposure risk and must be fixed server-side
 * by moving to signed, expiring URLs. This builder relies on that guarantee.
 */
export function fileUrlFromPrivate(privateUrl?: string | null): string | null {
  if (!privateUrl) return null;
  const u = String(privateUrl);
  if (/^https?:\/\//i.test(u)) return u;
  return `${API_BASE}/file/download?privateUrl=${encodeURIComponent(u)}`;
}
