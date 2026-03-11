# Implementación de Autocompletado de Direcciones con Google Maps

## 📋 Resumen

Se ha modernizado el formulario de direcciones para incluir autocompletado y geocodificación automática utilizando Google Maps API. Los usuarios ya no necesitan ingresar manualmente la latitud y longitud.

## ✨ Características Implementadas

### 1. **Autocompletado de Direcciones**
- Campo de búsqueda con sugerencias en tiempo real mientras el usuario escribe
- Utiliza Google Places Autocomplete API
- Soporta búsqueda global (configurable por países)

### 2. **Geocodificación Automática**
- Al seleccionar una dirección, se capturan automáticamente:
  - Dirección completa
  - Ciudad
  - Código postal
  - País
  - Latitud y Longitud

### 3. **Mapa Interactivo**
- Visualización del mapa con un marcador en la ubicación seleccionada
- Marcador arrastrable para ajustar la ubicación exacta
- Geocodificación inversa al mover el marcador
- Zoom automático al seleccionar una dirección

### 4. **Botón de Ubicación Actual**
- Obtiene la ubicación GPS del dispositivo
- Geocodifica la posición actual y completa los campos

### 5. **Modo Manual Opcional**
- Los usuarios pueden alternar entre búsqueda automática y entrada manual
- Útil para direcciones que no existen en Google Maps

## 📁 Archivos Creados/Modificados

### Nuevos Archivos

1. **`src/hooks/useGoogleMaps.ts`**
   - Hook personalizado para cargar el script de Google Maps
   - Maneja el estado de carga y errores
   - Evita cargar el script múltiples veces

2. **`src/components/maps/AddressAutocomplete.tsx`**
   - Componente reutilizable de autocompletado de direcciones
   - Incluye mapa interactivo opcional
   - Maneja geocodificación y geocodificación inversa

### Archivos Modificados

1. **`src/pages/admin/post-sites/PostSiteForm.tsx`**
   - Integración del componente AddressAutocomplete
   - Mantiene los campos manuales como respaldo
   - Toggle para cambiar between modos automático/manual

## 🔧 Configuración Requerida

### 1. Google Maps API Key

La aplicación ya tiene configurada la variable de entorno:

```env
VITE_GOOGLE_MAPS_API_KEY=YOUR_API_KEY_HERE
```

**⚠️ IMPORTANTE:** Debes reemplazar `YOUR_API_KEY_HERE` con tu clave real de Google Maps API.

### 2. Activar APIs en Google Cloud Console

Asegúrate de que las siguientes APIs estén habilitadas en tu proyecto de Google Cloud:

- ✅ **Maps JavaScript API** - Para renderizar mapas
- ✅ **Places API** - Para autocompletado de direcciones
- ✅ **Geocoding API** - Para geocodificación inversa

#### Pasos para obtener/configurar la API Key:

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea o selecciona un proyecto
3. Ve a **APIs & Services > Library**
4. Busca y habilita las 3 APIs mencionadas arriba
5. Ve a **APIs & Services > Credentials**
6. Crea una **API Key**
7. (Recomendado) Restringe la key:
   - Restricciones de aplicación: HTTP referrers
   - Restricciones de API: Selecciona solo las 3 APIs necesarias
8. Copia la clave y pégala en tu archivo `.env`

### 3. Reiniciar el Servidor de Desarrollo

Después de configurar la API key:

```bash
npm run dev
```

## 📖 Uso del Componente

### En PostSiteForm (ya integrado)

El componente se usa automáticamente en el formulario de Post Sites. Los usuarios verán:

1. Un campo de búsqueda para direcciones
2. Un botón "Mi ubicación" para usar GPS
3. Un mapa interactivo con marcador arrastrable
4. Un botón toggle para cambiar a entrada manual

### Uso en Otros Formularios

Puedes reutilizar el componente en cualquier formulario:

```tsx
import AddressAutocomplete, { AddressComponents } from '@/components/maps/AddressAutocomplete';

function MyForm() {
  const handleAddressSelect = (addressData: AddressComponents) => {
    console.log('Selected address:', addressData);
    // addressData = {
    //   address: "Calle Gran Vía 123",
    //   city: "Madrid",
    //   postalCode: "28013",
    //   country: "España",
    //   latitude: 40.4168,
    //   longitude: -3.7038
    // }
  };

  return (
    <AddressAutocomplete
      onAddressSelect={handleAddressSelect}
      defaultValue=""
      placeholder="Buscar dirección..."
      showMap={true}
      mapHeight="350px"
    />
  );
}
```

### Props del Componente

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `onAddressSelect` | `(address: AddressComponents) => void` | Required | Callback cuando se selecciona una dirección |
| `defaultValue` | `string` | `''` | Valor inicial del campo de búsqueda |
| `placeholder` | `string` | `'Buscar dirección...'` | Placeholder del input |
| `showMap` | `boolean` | `true` | Mostrar/ocultar el mapa interactivo |
| `mapHeight` | `string` | `'300px'` | Altura del mapa |
| `initialLat` | `number` | `undefined` | Latitud inicial del mapa |
| `initialLng` | `number` | `undefined` | Longitud inicial del mapa |

## 🎯 Características Técnicas

### Stack Tecnológico Utilizado

- **React** + **TypeScript**
- **Google Maps JavaScript API**
- **Google Places API**
- **Tailwind CSS** para estilos
- **shadcn/ui** para componentes UI (Button, Input, Alert)
- **lucide-react** para iconos

### Manejo de Errores

El componente maneja varios casos de error:

- ✅ API key no configurada
- ✅ Error al cargar el script de Google Maps
- ✅ Geolocalización no soportada en el navegador
- ✅ Usuario deniega permisos de ubicación
- ✅ No se encuentra geometría para una dirección

### Optimizaciones

- ✅ El script de Google Maps se carga una sola vez
- ✅ No se recarga si ya está cargado
- ✅ Cleanup de listeners para evitar memory leaks
- ✅ Estados de carga visual (spinner)
- ✅ Mensajes de error claros

## 🧪 Testing

### Checklist de Pruebas

- [ ] Configurar API key válida
- [ ] Buscar una dirección en el autocompletado
- [ ] Verificar que todos los campos se llenen automáticamente
- [ ] Arrastrar el marcador en el mapa
- [ ] Verificar que los campos se actualicen al arrastrar
- [ ] Usar el botón "Mi ubicación"
- [ ] Cambiar a modo manual y verificar entrada de datos
- [ ] Crear un Post Site con la nueva funcionalidad
- [ ] Editar un Post Site existente y verificar que los datos se cargan correctamente

### Ejemplo de Prueba Manual

1. Abre el formulario de creación de Post Site
2. En el campo de búsqueda, escribe "Gran Vía, Madrid"
3. Selecciona una sugerencia
4. Verifica que se completen:
   - Dirección
   - Ciudad: "Madrid"
   - Código postal (ej: "28013")
   - País: "España"
   - Latitud y Longitud

## 🚀 Mejoras Futuras (Opcionales)

- [ ] Añadir filtro de países para búsquedas más precisas
- [ ] Guardar direcciones recientes en localStorage
- [ ] Añadir validación de dirección más estricta
- [ ] Integrar con otras APIs de mapas (OpenStreetMap) como fallback
- [ ] Añadir círculo de geofence en el mapa
- [ ] Permitir seleccionar múltiples ubicaciones

## 📝 Notas Importantes

### Costos de Google Maps API

Google Maps ofrece **$200 de crédito mensual gratis**. Con este crédito puedes realizar aproximadamente:

- 28,000 cargas de mapa estático
- 28,000 solicitudes de autocompletado

Para aplicaciones pequeñas/medianas, esto suele ser suficiente y no genera costo.

### Restricciones de API Key

**⚠️ IMPORTANTE para producción:**

Es CRÍTICO restringir tu API key para evitar:
- Uso no autorizado
- Costos inesperados
- Exceder cuotas

Restricciones recomendadas:
1. **HTTP referrers:** Solo tu dominio
2. **API restrictions:** Solo las 3 APIs necesarias

### Alternativas Open Source

Si prefieres evitar costos o dependencias externas, considera:

- **Leaflet + OpenStreetMap** - Completamente gratis y open source
- **Mapbox** - Tiene plan gratuito generoso
- **Here Maps** - Alternativa con plan gratuito

## 🐛 Troubleshooting

### "Google Maps API key not configured"
- Verifica que la variable `VITE_GOOGLE_MAPS_API_KEY` esté en tu `.env`
- Reinicia el servidor de desarrollo

### "Error al cargar Google Maps"
- Verifica que la API key sea válida
- Asegúrate de que las APIs estén habilitadas en Google Cloud Console
- Revisa la consola del navegador para errores específicos

### "Geolocalización no soportada"
- El navegador debe soportar geolocalización (Chrome, Firefox, Safari modernos)
- El sitio debe estar en HTTPS (o localhost para desarrollo)

### El autocompletado no funciona
- Verifica que Places API esté habilitada
- Revisa que no haya límites de cuota excedidos
- Verifica en la consola si hay errores de CORS

## 📞 Soporte

Si encuentras problemas o tienes preguntas:

1. Revisa la documentación de [Google Maps Platform](https://developers.google.com/maps/documentation)
2. Verifica la consola del navegador para errores
3. Revisa el estado de las APIs en [Google Cloud Console](https://console.cloud.google.com/)

---

**Autor:** GitHub Copilot  
**Fecha:** Marzo 2026  
**Versión:** 1.0.0
