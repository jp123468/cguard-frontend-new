# Alternativa: Implementación con Leaflet y OpenStreetMap (Open Source)

## 🌍 ¿Por qué usar Leaflet?

- **100% Gratis** - Sin costos ni límites de uso
- **Open Source** - Totalmente código abierto
- **Sin API Key** - No necesitas registrarte
- **Datos de OpenStreetMap** - Mapas de calidad gratuitos

## 📦 Instalación

Para usar esta alternativa, instala las siguientes dependencias:

```bash
npm install leaflet react-leaflet
npm install -D @types/leaflet
```

## 📝 Implementación con Nominatim (Geocoding Gratuito)

### 1. Componente AddressAutocompleteOSM

```tsx
// src/components/maps/AddressAutocompleteOSM.tsx
import React, { useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, Search } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export interface AddressComponents {
  address: string;
  city: string;
  postalCode: string;
  country: string;
  latitude: number;
  longitude: number;
}

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
  address: {
    road?: string;
    house_number?: string;
    city?: string;
    town?: string;
    village?: string;
    postcode?: string;
    country?: string;
    state?: string;
  };
}

interface Props {
  onAddressSelect: (address: AddressComponents) => void;
  defaultValue?: string;
  placeholder?: string;
  initialLat?: number;
  initialLng?: number;
}

function DraggableMarker({ 
  position, 
  setPosition, 
  onDragEnd 
}: { 
  position: [number, number], 
  setPosition: (pos: [number, number]) => void,
  onDragEnd: (lat: number, lng: number) => void 
}) {
  const markerRef = useRef<L.Marker>(null);

  const eventHandlers = {
    dragend() {
      const marker = markerRef.current;
      if (marker != null) {
        const pos = marker.getLatLng();
        setPosition([pos.lat, pos.lng]);
        onDragEnd(pos.lat, pos.lng);
      }
    },
  };

  return (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={position}
      ref={markerRef}
    />
  );
}

export default function AddressAutocompleteOSM({
  onAddressSelect,
  defaultValue = '',
  placeholder = 'Buscar dirección...',
  initialLat = 40.4168,
  initialLng = -3.7038,
}: Props) {
  const [searchQuery, setSearchQuery] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState<[number, number]>([initialLat, initialLng]);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // Search addresses using Nominatim (OpenStreetMap geocoding)
  const searchAddress = async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
        `format=json&q=${encodeURIComponent(query)}&` +
        `addressdetails=1&limit=5&` +
        `accept-language=es`
      );
      const data: SearchResult[] = await response.json();
      setSuggestions(data);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Error searching address:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchAddress(value);
    }, 500);
  };

  const selectSuggestion = (result: SearchResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    
    setPosition([lat, lng]);
    setSearchQuery(result.display_name);
    setShowSuggestions(false);

    const addressData: AddressComponents = {
      address: [result.address.road, result.address.house_number]
        .filter(Boolean)
        .join(' ') || result.display_name,
      city: result.address.city || result.address.town || result.address.village || '',
      postalCode: result.address.postcode || '',
      country: result.address.country || '',
      latitude: lat,
      longitude: lng,
    };

    onAddressSelect(addressData);
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?` +
        `format=json&lat=${lat}&lon=${lng}&` +
        `addressdetails=1&accept-language=es`
      );
      const data = await response.json();
      
      setSearchQuery(data.display_name);
      
      const addressData: AddressComponents = {
        address: [data.address.road, data.address.house_number]
          .filter(Boolean)
          .join(' ') || data.display_name,
        city: data.address.city || data.address.town || data.address.village || '',
        postalCode: data.address.postcode || '',
        country: data.address.country || '',
        latitude: lat,
        longitude: lng,
      };

      onAddressSelect(addressData);
    } catch (error) {
      console.error('Error reverse geocoding:', error);
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocalización no soportada');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setPosition([lat, lng]);
        reverseGeocode(lat, lng);
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('No se pudo obtener la ubicación');
      }
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Input
            type="text"
            value={searchQuery}
            onChange={handleInputChange}
            placeholder={placeholder}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          />
          
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
              {suggestions.map((result, index) => (
                <div
                  key={index}
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => selectSuggestion(result)}
                >
                  <div className="font-medium text-sm">{result.display_name}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <Button
          type="button"
          variant="outline"
          onClick={handleUseCurrentLocation}
          className="flex items-center gap-2"
        >
          <MapPin className="h-4 w-4" />
          <span className="hidden sm:inline">Mi ubicación</span>
        </Button>
      </div>

      <div className="h-[350px] rounded-md border overflow-hidden">
        <MapContainer
          center={position}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <DraggableMarker
            position={position}
            setPosition={setPosition}
            onDragEnd={reverseGeocode}
          />
        </MapContainer>
      </div>

      <p className="text-xs text-muted-foreground">
        💡 Puedes arrastrar el marcador para ajustar la ubicación exacta
      </p>
    </div>
  );
}
```

## 🚀 Uso en el Formulario

Simplemente reemplaza el import en PostSiteForm.tsx:

```tsx
// Antes (Google Maps)
import AddressAutocomplete from '@/components/maps/AddressAutocomplete';

// Después (OpenStreetMap)
import AddressAutocomplete from '@/components/maps/AddressAutocompleteOSM';

// El resto del código permanece igual
```

## ⚙️ Configuración de CSS

Asegúrate de importar los estilos de Leaflet en tu archivo principal:

```tsx
// src/main.tsx o src/App.tsx
import 'leaflet/dist/leaflet.css';
```

## 📊 Comparación: Google Maps vs OpenStreetMap

| Característica | Google Maps | OpenStreetMap + Leaflet |
|----------------|-------------|-------------------------|
| **Costo** | $200/mes gratis, luego pago | 100% Gratis |
| **API Key** | Requerida | No requerida |
| **Límites** | 28k solicitudes/mes gratis | Sin límites (con uso justo) |
| **Calidad de datos** | ⭐⭐⭐⭐⭐ Excelente | ⭐⭐⭐⭐ Muy buena |
| **Autocompletado** | Muy preciso | Bueno |
| **Cobertura global** | Excelente | Muy buena |
| **Personalización** | Limitada | Total |
| **Open Source** | ❌ No | ✅ Sí |

## ⚠️ Limitaciones de Nominatim

**Política de uso justo de Nominatim:**

- No más de 1 solicitud por segundo
- Incluir un User-Agent en producción
- Para aplicaciones de alto tráfico, considera hostear tu propio servidor Nominatim

### Mejora para Producción

```typescript
// Añade headers personalizados
const response = await fetch(url, {
  headers: {
    'User-Agent': 'TuAppName/1.0 (contacto@tuempresa.com)'
  }
});
```

## 🌟 Ventajas de la Implementación OSM

1. **Sin Costos** - Ideal para startups y proyectos pequeños
2. **Sin Límites de Cuota** - No te preocupes por exceder límites
3. **Privacidad** - No envías datos a Google
4. **Código Abierto** - Puedes modificar y mejorar
5. **Comunidad Activa** - Soporte de la comunidad Open Source

## 📈 Cuándo Usar Cada Opción

### Usa Google Maps si:
- ✅ Necesitas la mejor precisión posible
- ✅ Tu aplicación tiene presupuesto
- ✅ Necesitas funciones avanzadas (Street View, etc.)
- ✅ Operas principalmente en áreas urbanas

### Usa OpenStreetMap si:
- ✅ Quieres evitar costos
- ✅ Valoras la privacidad
- ✅ Necesitas personalización total
- ✅ Tienes tráfico alto que excedería cuotas gratuitas

## 🔄 Migración Fácil

Ambas implementaciones usan la misma interfaz `AddressComponents`, por lo que puedes cambiar entre ellas sin modificar el resto de tu código.

---

**Recomendación:** Empieza con OpenStreetMap para desarrollo y pequeña escala. Migra a Google Maps si necesitas más precisión o funciones avanzadas.
