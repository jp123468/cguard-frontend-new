# 🚀 Guía de Inicio Rápido - Autocompletado de Direcciones

## ⚡ TL;DR - Puesta en Marcha Rápida

### Paso 1: Configurar Google Maps API Key

1. Abre el archivo `.env` en la raíz del proyecto frontend
2. Reemplaza esta línea:
   ```env
   VITE_GOOGLE_MAPS_API_KEY=YOUR_API_KEY_HERE
   ```
   Con tu clave real de Google Maps:
   ```env
   VITE_GOOGLE_MAPS_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXX
   ```

### Paso 2: Obtener API Key (si no la tienes)

1. Ve a: https://console.cloud.google.com/
2. Crea un proyecto (o selecciona uno existente)
3. Ve a **APIs & Services > Library**
4. Habilita estas 3 APIs:
   - Maps JavaScript API
   - Places API
   - Geocoding API
5. Ve a **APIs & Services > Credentials**
6. Click en **Create Credentials > API Key**
7. Copia la clave generada
8. (Opcional) Click en la clave para restringirla

### Paso 3: Reiniciar el Servidor

```bash
npm run dev
```

### Paso 4: ¡Prueba!

1. Navega a la página de creación de Post Sites
2. Verás el nuevo campo de búsqueda de direcciones con el mapa
3. Escribe una dirección (ej: "Gran Vía, Madrid")
4. Selecciona de las sugerencias
5. ¡Todos los campos se llenan automáticamente! 🎉

---

## 📋 Checklist de Verificación

- [ ] Archivo `.env` actualizado con la API key
- [ ] Servidor reiniciado (`npm run dev`)
- [ ] Las 3 APIs están habilitadas en Google Cloud Console
- [ ] Navegador abierto en `http://localhost:5173` (o tu puerto)
- [ ] Consola del navegador sin errores (F12 > Console)

---

## 🆘 Solución de Problemas Comunes

### ❌ "Google Maps API key not configured"

**Solución:**
```bash
# 1. Verifica que el archivo .env existe
ls .env

# 2. Verifica el contenido
cat .env

# 3. Debe contener:
VITE_GOOGLE_MAPS_API_KEY=AIzaSy...

# 4. Reinicia el servidor
npm run dev
```

### ❌ Error: "This API key is not authorized"

**Solución:**
1. Ve a Google Cloud Console > Credentials
2. Click en tu API key
3. En "Application restrictions", selecciona "HTTP referrers"
4. Añade:
   - `http://localhost:*`
   - `http://127.0.0.1:*`
   - Tu dominio de producción
5. En "API restrictions", selecciona las 3 APIs necesarias
6. Guarda

### ❌ El mapa no se muestra / Pantalla gris

**Solución:**
1. Abre la consola del navegador (F12)
2. Busca errores rojos
3. Común: "Google Maps JavaScript API error: InvalidKeyMapError"
   - Verifica que la API key sea correcta
   - Asegúrate de que Maps JavaScript API esté habilitada

### ❌ El autocompletado no funciona

**Solución:**
1. Verifica que **Places API** esté habilitada
2. Espera unos minutos (a veces tarda en activarse)
3. Revisa la consola del navegador para errores específicos

---

## 🎯 Características Principales

### 1. Búsqueda Inteligente
- Escribe cualquier dirección
- Sugerencias en tiempo real
- Selecciona de la lista

### 2. Autocompletado Automático
Cuando seleccionas una dirección, se llenan automáticamente:
- ✅ Dirección
- ✅ Ciudad
- ✅ Código Postal
- ✅ País
- ✅ Latitud
- ✅ Longitud

### 3. Mapa Interactivo
- 🗺️ Visualiza la ubicación
- 📍 Arrastra el pin para ajustar
- 🔍 Zoom automático

### 4. Ubicación GPS
- 📱 Click en "Mi ubicación"
- 🛰️ Usa el GPS de tu dispositivo
- ⚡ Completa campos automáticamente

### 5. Modo Manual
- 🔄 Toggle para cambiar a entrada manual
- ⌨️ Útil si prefieres escribir todo
- ✏️ Los campos siguen siendo editables

---

## 📱 Ejemplo de Uso

### Flujo Normal de Usuario

```
1. Usuario abre formulario de Post Site
2. Ve campo "Búsqueda de Dirección" con mapa
3. Escribe: "Calle de Alcalá 42, Madrid"
4. Aparecen sugerencias mientras escribe
5. Selecciona: "Calle de Alcalá, 42, 28014 Madrid, España"
6. ✨ MAGIA - Todos los campos se llenan:
   - Dirección: "Calle de Alcalá 42"
   - Ciudad: "Madrid"
   - Código Postal: "28014"
   - País: "España"
   - Latitud: "40.41889"
   - Longitud: "-3.69344"
7. Pin aparece en el mapa en esa ubicación
8. (Opcional) Arrastra el pin para ajustar
9. Click en "Enviar" - ¡Listo!
```

### Flujo con GPS

```
1. Usuario abre formulario
2. Click en "Mi ubicación" 📍
3. Navegador pide permiso de ubicación
4. Usuario acepta
5. ✨ Mapa se centra en ubicación actual
6. ✨ Campos se llenan con dirección actual
7. Usuario puede ajustar si es necesario
8. Click en "Enviar"
```

---

## 🔧 Personalización

### Cambiar el Idioma de las Sugerencias

Edita `src/hooks/useGoogleMaps.ts`, línea ~51:

```typescript
// Español (default)
script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=es`;

// Inglés
script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=en`;

// Francés
script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=fr`;
```

### Restringir Búsqueda por País

Edita `src/components/maps/AddressAutocomplete.tsx`, línea ~50:

```typescript
// Permitir todos los países (default)
autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
  componentRestrictions: { country: [] },
  fields: ['address_components', 'geometry', 'formatted_address', 'name'],
});

// Solo España
autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
  componentRestrictions: { country: ['es'] },
  fields: ['address_components', 'geometry', 'formatted_address', 'name'],
});

// España y México
autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
  componentRestrictions: { country: ['es', 'mx'] },
  fields: ['address_components', 'geometry', 'formatted_address', 'name'],
});
```

### Cambiar Altura del Mapa

En `PostSiteForm.tsx`, donde se usa el componente:

```tsx
<AddressAutocomplete
  // ...otras props
  mapHeight="350px"  // Cambia este valor
/>

// Opciones:
// mapHeight="200px"  - Más pequeño
// mapHeight="500px"  - Más grande
// mapHeight="50vh"   - 50% de la altura de la ventana
```

---

## 💰 Costos Estimados

### Uso Típico (pequeña empresa)

```
Usuarios por mes: 100
Búsquedas por usuario: 5
Total búsquedas: 500/mes

Costo estimado: $0 (dentro del tier gratuito)
```

### Tier Gratuito de Google Maps

Google ofrece **$200/mes de crédito gratis**, que incluye:

| Servicio | Gratis hasta | Costo después |
|----------|-------------|---------------|
| Maps JavaScript API | 28,000 cargas | $7 / 1000 cargas |
| Places Autocomplete | 28,000 solicitudes | $2.83 / 1000 solicitudes |
| Geocoding | 40,000 solicitudes | $5 / 1000 solicitudes |

**💡 Para la mayoría de aplicaciones pequeñas/medianas, no hay costo.**

---

## 🔐 Seguridad: Restricciones Recomendadas

### Para Desarrollo

```
Application restrictions:
- HTTP referrers:
  - http://localhost:*
  - http://127.0.0.1:*

API restrictions:
- Maps JavaScript API
- Places API
- Geocoding API
```

### Para Producción

```
Application restrictions:
- HTTP referrers:
  - https://tudominio.com/*
  - https://www.tudominio.com/*

API restrictions:
- Maps JavaScript API
- Places API
- Geocoding API
```

---

## 📚 Recursos Adicionales

### Documentación Creada

1. **IMPLEMENTACION_AUTOCOMPLETADO_DIRECCIONES.md** - Documentación completa
2. **ALTERNATIVA_OPENSTREETMAP.md** - Alternativa gratuita sin API key
3. Este archivo - Guía rápida

### Enlaces Útiles

- [Google Maps Platform](https://developers.google.com/maps)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Pricing Calculator](https://mapsplatform.google.com/pricing/)
- [OpenStreetMap Alternative](./ALTERNATIVA_OPENSTREETMAP.md)

---

## ❓ FAQ

**P: ¿Es gratis?**  
R: Sí, para la mayoría de usos. Google da $200/mes gratis.

**P: ¿Puedo usar sin API key?**  
R: No con Google Maps. Pero sí con la [alternativa OpenStreetMap](./ALTERNATIVA_OPENSTREETMAP.md).

**P: ¿Funciona en móviles?**  
R: ¡Sí! Totalmente responsive. El GPS funciona genial en móviles.

**P: ¿Puedo editar los campos después?**  
R: Sí, todos los campos siguen siendo editables.

**P: ¿Qué pasa si no encuentro mi dirección?**  
R: Usa el botón para cambiar a "Entrada manual" y escribe todo manualmente.

**P: ¿Funciona offline?**  
R: No, necesita conexión a internet para cargar el mapa y buscar direcciones.

---

## ✅ ¡Listo para Producción!

Una vez que todo funcione en desarrollo:

1. [ ] Actualiza `.env` con API key de producción
2. [ ] Configura restricciones de API key para tu dominio
3. [ ] Prueba en staging
4. [ ] Monitorea uso en Google Cloud Console
5. [ ] ¡Despliega! 🚀

---

**¿Necesitas ayuda?**  
Revisa los archivos de documentación completa o contacta al equipo de desarrollo.

**Versión:** 1.0.0  
**Última actualización:** Marzo 2026
