# Plan de Implementación: weather-app-react

## Descripción general

Implementación incremental de la SPA de clima en React 19 + Vite. Cada tarea construye sobre la anterior, comenzando por el servicio HTTP y terminando con el cableado completo de la aplicación. El estado global vive en `App.jsx`; los componentes son desacoplados y testeables de forma independiente.

## Tareas

- [x] 1. Refactorizar `weatherService.js` con manejo de errores tipificado
  - Definir la clase `WeatherServiceError` con `type: WeatherErrorType` y `message`
  - Reescribir `getWeather(query)` para usar `import.meta.env.VITE_WEATHER_API_KEY` en lugar de la API Key hardcodeada
  - Implementar el bloque `try/catch` con mapeo de errores: HTTP 400/code 1006 → `NOT_FOUND`, HTTP 401/403 → `AUTH_ERROR`, error de red → `NETWORK_ERROR`
  - Usar `axios.get` con `params: { key, q: query }` en lugar de interpolación en la URL
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 1.1 Escribir property test — Property 11: getWeather lanza WeatherServiceError para cualquier HTTP no-200
    - **Property 11: getWeather lanza WeatherServiceError para cualquier HTTP no-200**
    - Mockear axios para simular respuestas con códigos HTTP arbitrarios distintos de 200
    - Verificar que el error lanzado es instancia de `WeatherServiceError` con `type` y `message` no vacíos
    - **Validates: Requirements 5.3**

  - [x] 1.2 Escribir property test — Property 5: Cada solicitud incluye la API Key y el city query
    - **Property 5: Cada solicitud al servicio incluye la API Key y el city query**
    - Para cualquier string de consulta, verificar que axios recibe `params.key` y `params.q` correctos
    - **Validates: Requirements 2.1, 5.1, 5.2**

- [x] 2. Actualizar `Search.jsx` con validación, prop `loading` y accesibilidad
  - Agregar prop `loading: boolean` al componente
  - Implementar validación: si `city.trim() === ""`, mostrar mensaje "Escribe una ciudad" sin invocar `onSearch`
  - Deshabilitar el botón `<button disabled={loading}>` cuando `loading === true`
  - Limpiar el campo (`setCity("")`) después de invocar `onSearch`
  - Agregar `onKeyDown` para disparar búsqueda al presionar Enter
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 4.3_

  - [x] 2.1 Escribir property test — Property 1: Búsqueda dispara onSearch con el valor ingresado
    - **Property 1: Búsqueda dispara onSearch con el valor ingresado**
    - Para cualquier string no vacío, verificar que `onSearch` es invocado exactamente una vez con ese valor
    - Cubrir tanto el clic en el botón como la tecla Enter
    - **Validates: Requirements 1.2, 1.3**

  - [x] 2.2 Escribir property test — Property 2: Input vacío o solo-whitespace es rechazado
    - **Property 2: Input vacío o solo-whitespace es rechazado**
    - Para cualquier string de solo espacios en blanco, verificar que `onSearch` no es invocado y se muestra "Escribe una ciudad"
    - Usar el generador `arbitraryWhitespaceString` de fast-check
    - **Validates: Requirements 1.4**

  - [x] 2.3 Escribir property test — Property 3: El campo se limpia tras invocar onSearch
    - **Property 3: El campo de búsqueda se limpia tras invocar onSearch**
    - Para cualquier string no vacío, verificar que el valor del input es `""` después de invocar `onSearch`
    - **Validates: Requirements 1.5**

  - [x] 2.4 Escribir property test — Property 9: El botón está deshabilitado durante la carga
    - **Property 9: El botón de búsqueda está deshabilitado durante la carga**
    - Renderizar `Search` con `loading={true}` y verificar que el botón tiene el atributo `disabled`
    - **Validates: Requirements 4.3**

- [x] 3. Actualizar `WeatherCard.jsx` con todos los campos requeridos
  - Agregar los campos faltantes: `feelslike_c`, `humidity`, `wind_kph` al JSX
  - Mantener el renderizado condicional `if (!data) return null`
  - Asegurar que cada campo está envuelto en un elemento semántico con texto legible (ej. `<p>Humedad: {data.current.humidity}%</p>`)
  - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [x] 3.1 Escribir property test — Property 4: WeatherCard renderiza todos los campos requeridos
    - **Property 4: WeatherCard renderiza todos los campos requeridos**
    - Para cualquier objeto `WeatherData` válido con valores arbitrarios, verificar que todos los campos aparecen en el DOM
    - Usar el generador `arbitraryWeatherData` de fast-check
    - **Validates: Requirements 2.2, 2.3, 2.4, 2.5, 2.6, 2.7**

- [x] 4. Refactorizar `App.jsx` — estado global y handlers
  - Eliminar el estado `city` de `App.jsx` (ahora vive en `Search.jsx`)
  - Implementar `handleSearch(city: string)` con el ciclo completo: `setLoading(true)` → `getWeather(city)` → `setWeather(data)` / `setWeather(null) + setError(err.message)` → `setLoading(false)` en `finally`
  - Limpiar `error` al inicio de cada búsqueda (`setError("")`)
  - Implementar `handleLocation()` con `navigator.geolocation.getCurrentPosition`, llamando a `handleSearch` con `"lat,lon"` en caso de éxito y `setError("Permiso de ubicación denegado")` en caso de denegación
  - Detectar soporte de geolocalización con `navigator.geolocation` y condicionar la visibilidad del botón
  - Renderizar el indicador de carga: `{loading && <div className="spinner" aria-label="Cargando..." role="status" />}`
  - Renderizar el mensaje de error: `{error && <p role="alert">{error}</p>}`
  - Pasar `loading` como prop a `Search`
  - _Requirements: 3.4, 3.5, 4.1, 4.2, 6.1, 6.2, 6.3, 6.4_

  - [x] 4.1 Escribir property test — Property 7: Un error oculta los datos climáticos previos
    - **Property 7: Un error oculta los datos climáticos previos**
    - Para cualquier estado con `WeatherData` visible, simular un error de búsqueda y verificar que `WeatherCard` no está en el DOM
    - **Validates: Requirements 3.4**

  - [x] 4.2 Escribir property test — Property 8: Una búsqueda exitosa limpia el mensaje de error previo
    - **Property 8: Una búsqueda exitosa limpia el mensaje de error previo**
    - Para cualquier estado con mensaje de error visible, simular una búsqueda exitosa y verificar que el error desaparece
    - **Validates: Requirements 3.5**

  - [x] 4.3 Escribir property test — Property 10: El indicador de carga desaparece tras cualquier respuesta
    - **Property 10: El indicador de carga desaparece tras cualquier respuesta**
    - Para cualquier tipo de respuesta (exitosa o con error), verificar que el spinner no está visible después de que la promesa se resuelve
    - **Validates: Requirements 4.2**

  - [x] 4.4 Escribir property test — Property 12: La geolocalización usa las coordenadas del dispositivo como query
    - **Property 12: La geolocalización usa las coordenadas del dispositivo como query**
    - Para cualquier par (latitud, longitud), mockear `navigator.geolocation` y verificar que `getWeather` es invocado con `"lat,lon"`
    - Usar el generador `arbitraryCoordinates` de fast-check
    - **Validates: Requirements 6.2**

- [x] 5. Checkpoint — Verificar integración parcial
  - Asegurar que todos los tests pasan, preguntar al usuario si hay dudas antes de continuar.

- [x] 6. Escribir tests unitarios de ejemplo para casos no cubiertos por propiedades
  - [x] 6.1 Test: `Search` renderiza input y botón visibles (Req 1.1)
  - [x] 6.2 Test: El indicador de carga es visible durante una solicitud activa (Req 4.1)
  - [x] 6.3 Test: `App` muestra el botón de geolocalización cuando el navegador lo soporta (Req 6.1)
  - [x] 6.4 Test: `App` oculta el botón de geolocalización cuando `navigator.geolocation` es `undefined` (Req 6.4)
  - [x] 6.5 Test: `App` muestra "Permiso de ubicación denegado" cuando se deniega el permiso (Req 6.3)
  - [x] 6.6 Test: `weatherService` usa `axios` para las solicitudes HTTP (Req 5.4)
  - [x] 6.7 Test: `App` muestra "Ciudad no encontrada" cuando el servicio lanza `NOT_FOUND` (Req 3.1)
  - [x] 6.8 Test: `App` muestra "Error de autenticación con el servicio de clima" cuando el servicio lanza `AUTH_ERROR` (Req 3.2)
  - [x] 6.9 Test: `App` muestra "No se pudo conectar con el servicio de clima. Intenta de nuevo." cuando el servicio lanza `NETWORK_ERROR` (Req 3.3)
  - _Requirements: 1.1, 3.1, 3.2, 3.3, 4.1, 5.4, 6.1, 6.3, 6.4_

- [x] 7. Escribir property test — Property 6: Errores de WeatherAPI se mapean al mensaje correcto
  - **Property 6: Los errores de WeatherAPI se mapean al mensaje de usuario correcto**
  - Mockear `getWeather` para lanzar `WeatherServiceError` con cada `type` posible
  - Verificar que el mensaje mostrado en la UI corresponde exactamente al tipo de error
  - **Validates: Requirements 3.1, 3.2, 3.3**

- [x] 8. Cablear `App.jsx` con todos los componentes y verificar flujo completo
  - Reemplazar el JSX inline de clima en `App.jsx` por el componente `<WeatherCard data={weather} />`
  - Reemplazar el input/botón inline por `<Search onSearch={handleSearch} loading={loading} />`
  - Agregar el botón de geolocalización con renderizado condicional `{navigator.geolocation && <button onClick={handleLocation}>...}</button>}`
  - Verificar que el flujo completo funciona: búsqueda → carga → resultado / error
  - _Requirements: 1.1, 1.2, 1.3, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 4.1, 4.2, 6.1_

- [x] 9. Configurar Vitest y dependencias de testing
  - Instalar `vitest`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom` y `fast-check` si no están presentes en `package.json`
  - Crear `vitest.config.js` (o actualizar `vite.config.js`) con `environment: 'jsdom'` y `setupFiles`
  - Crear `src/test/setup.js` con `import '@testing-library/jest-dom'`
  - Crear los archivos de test: `src/services/weatherService.test.js`, `src/components/Search.test.jsx`, `src/components/WeatherCard.test.jsx`, `src/App.test.jsx`
  - _Requirements: todos (infraestructura de testing)_

- [x] 10. Checkpoint final — Todos los tests pasan
  - Ejecutar `vitest --run` y verificar que todos los tests pasan sin errores.
  - Asegurar que no hay API Keys hardcodeadas en el código fuente.
  - Asegurar que `VITE_WEATHER_API_KEY` está documentada en `.env.example`.
  - Preguntar al usuario si hay dudas antes de cerrar.

## Notas

- Las tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido.
- El orden recomendado es: servicio → componentes → App → cableado → tests de integración.
- La tarea 9 (configuración de Vitest) puede ejecutarse en paralelo con las tareas 1–4 si el entorno de testing aún no está configurado.
- Cada tarea referencia requisitos específicos para trazabilidad completa.
- Los generadores fast-check (`arbitraryWeatherData`, `arbitraryWhitespaceString`, `arbitraryCoordinates`) pueden definirse en un archivo compartido `src/test/generators.js`.
