import { useState, useEffect } from 'react';

declare global {
  interface Window {
    google?: any;
    googleMapsLoaded?: boolean;
  }
}

/**
 * Hook to load Google Maps script with Places API
 * @returns Object with google maps instance, loading state, and error state
 */
export function useGoogleMaps() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<Error | null>(null);

  useEffect(() => {
    const apiKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY;

    if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
      setLoadError(new Error('Google Maps API key not configured'));
      return;
    }

    // Check if already loaded
    if (window.googleMapsLoaded && window.google) {
      setIsLoaded(true);
      return;
    }

    // Check if script is already in DOM
    const existingScript = document.querySelector(
      `script[src*="maps.googleapis.com"]`
    );
    
    if (existingScript) {
      // Script exists, wait for it to load
      const checkLoaded = setInterval(() => {
        if (window.google) {
          window.googleMapsLoaded = true;
          setIsLoaded(true);
          clearInterval(checkLoaded);
        }
      }, 100);
      
      setTimeout(() => clearInterval(checkLoaded), 10000);
      return;
    }

    // Create and load script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=es`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      window.googleMapsLoaded = true;
      setIsLoaded(true);
    };

    script.onerror = () => {
      setLoadError(new Error('Failed to load Google Maps script'));
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup is tricky with Google Maps, usually we keep it loaded
      // But we can clear our listeners
    };
  }, []);

  return {
    isLoaded,
    loadError,
    google: window.google,
  };
}
