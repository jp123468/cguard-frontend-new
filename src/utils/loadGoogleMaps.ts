/**
 * Singleton Google Maps script loader.
 * Guarantees the Maps JS API is injected only once per page, regardless of
 * how many components call this function concurrently.
 */
let _promise: Promise<void> | null = null;

export function loadGoogleMaps(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();

  // Already fully loaded — resolve immediately.
  if ((window as any).google?.maps?.places?.Autocomplete) return Promise.resolve();

  // Loading already in progress — return the same Promise.
  if (_promise) return _promise;

  _promise = new Promise<void>((resolve, reject) => {
    const apiKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY as string;
    if (!apiKey) {
      _promise = null;
      return reject(new Error('VITE_GOOGLE_MAPS_API_KEY is not set'));
    }

    // If ANY Maps script tag is already in the DOM (loaded by a previous
    // hot-reload cycle or another component), just wait for the global.
    const existing = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
    if (existing) {
      poll(resolve, reject);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&loading=async&v=weekly&libraries=places,marker`;
    script.async = true;
    script.defer = true;
    script.onload = () => poll(resolve, reject);
    script.onerror = () => {
      _promise = null;
      reject(new Error('Failed to load Google Maps API'));
    };
    document.head.appendChild(script);
  });

  return _promise;
}

function poll(resolve: () => void, reject: (e: Error) => void, start = Date.now()): void {
  // Wait until both core maps AND places.Autocomplete are available
  if ((window as any).google?.maps?.places?.Autocomplete) { resolve(); return; }
  if (Date.now() - start > 8000) { reject(new Error('Google Maps API timed out')); return; }
  setTimeout(() => poll(resolve, reject, start), 200);
}
