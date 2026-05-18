# Design Document — weather-app-react

## Overview

La feature **weather-app-react** es una Single Page Application (SPA) construida en React 19 que permite a los usuarios consultar el clima actual de cualquier ciudad del mundo, ya sea escribiendo el nombre de la ciudad o usando la geolocalización del navegador. La aplicación consume directamente la API pública de [WeatherAPI](https://www.weatherapi.com/) (`api.weatherapi.com`) desde el frontend, sin pasar por el backend Laravel para las consultas climáticas.

### Objetivos principales

- Proporcionar una interfaz de búsqueda de ciudades clara y accesible.
- Mostrar datos climáticos actuales (temperatura, sensación térmica, condición, humedad, viento, ciudad/país).
- Manejar errores de forma descriptiva (ciudad no encontrada, autenticación fallida, error de red).
- Mostrar un indicador de carga durante las solicitudes.
- Encapsular toda la lógica HTTP en `weatherService.js`.
- Soportar geolocalización del dispositivo como alternativa a la búsqueda manual.

### Contexto tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React 19 + Vite |
| HTTP client | axios ^1.15 |
| API externa | WeatherAPI (`api.weatherapi.com/v1`) |
| Backend (soporte) | Laravel 11 + Breeze (auth, favoritos) |
| Testing | Vitest + React Testing Library + fast-check (PBT) |

---

## Architecture

La arquitectura sigue un patrón de **capas desacopladas** dentro del frontend React:

```
┌─────────────────────────────────────────────────────┐
│                    App.jsx (root)                   │
│  Estado global: weather, error, loading, city       │
│  Orquesta: handleSearch, handleLocation             │
└────────────┬──────────────────────┬─────────────────┘
             │                      │
    ┌────────▼────────┐    ┌────────▼────────┐
    │  Search.jsx     │    │  WeatherCard.jsx │
    │  (entrada)      │    │  (presentación) │
    └────────┬────────┘    └─────────────────┘
             │
    ┌────────▼────────────────────────────────────────┐
    │           weatherService.js                     │
    │  getWeather(query: string) → WeatherData        │
    │  Encapsula axios + API_KEY + error mapping      │
    └────────────────────┬────────────────────────────┘
                         │ HTTPS GET
                ┌────────▼────────┐
                │   WeatherAPI    │
                │ api.weatherapi  │
                │ .com/v1/current │
                └─────────────────┘
```

### Flujo de datos principal

1. El usuario escribe una ciudad en `Search` o activa la geolocalización.
2. `App.jsx` recibe el evento, activa `loading = true` y llama a `weatherService.getWeather(query)`.
3. `weatherService` realiza el GET a WeatherAPI con la API_Key y el query.
4. Si la respuesta es exitosa, `App.jsx` actualiza `weather` y limpia `error`.
5. Si hay error, `weatherService` lanza una excepción tipificada y `App.jsx` actualiza `error`.
6. En ambos casos, `loading = false` al finalizar.
7. `WeatherCard` renderiza los datos cuando `weather !== null`.

### Decisiones de diseño

- **API Key en el frontend**: La API Key de WeatherAPI se almacena en una variable de entorno de Vite (`VITE_WEATHER_API_KEY`). Esto es aceptable para una API pública de clima con rate limiting por key. No se expone en el código fuente.
- **Sin proxy Laravel para clima**: La consulta climática va directamente al frontend para evitar latencia adicional y simplificar el flujo. El backend Laravel queda disponible para funcionalidades futuras (favoritos, historial).
- **Manejo de errores en el servicio**: `weatherService` mapea los códigos HTTP y de error de WeatherAPI a mensajes de usuario descriptivos, manteniendo los componentes agnósticos a los detalles de la API.
- **Estado en App.jsx**: El estado global de la aplicación (weather, error, loading) vive en el componente raíz para facilitar la coordinación entre `Search` y `WeatherCard`.

---

## Components and Interfaces

### `App.jsx` — Componente raíz

Orquesta el estado global y los handlers de eventos.

```jsx
// Estado
const [weather, setWeather] = useState(null);   // WeatherData | null
const [error, setError]     = useState("");      // string
const [loading, setLoading] = useState(false);   // boolean

// Handlers
handleSearch(city: string): Promise<void>
handleLocation(): void
```

**Responsabilidades:**
- Gestionar el ciclo de vida de una búsqueda (loading → data/error → idle).
- Ocultar datos previos cuando hay un error nuevo (Req 3.4).
- Limpiar el error cuando una búsqueda es exitosa (Req 3.5).
- Detectar soporte de geolocalización y condicionar la visibilidad del botón (Req 6.4).

---

### `Search.jsx` — Componente de búsqueda

Recibe input del usuario y dispara la búsqueda.

```jsx
// Props
interface SearchProps {
  onSearch: (city: string) => void;
  loading: boolean;          // deshabilita el botón durante carga
}

// Estado interno
const [city, setCity] = useState("");
```

**Comportamiento:**
- Renderiza `<input type="text">` y `<button type="submit">` (Req 1.1).
- Dispara `onSearch(city)` al presionar Enter o hacer clic en el botón (Req 1.2, 1.3).
- Si `city.trim() === ""`, muestra el mensaje de validación "Escribe una ciudad" sin llamar a `onSearch` (Req 1.4).
- Limpia el campo tras una búsqueda exitosa (Req 1.5) — el padre notifica el éxito a través de un prop o el componente limpia tras invocar `onSearch`.
- El botón queda `disabled` cuando `loading === true` (Req 4.3).

---

### `WeatherCard.jsx` — Tarjeta de clima actual

Componente de presentación pura que muestra los datos climáticos.

```jsx
// Props
interface WeatherCardProps {
  data: WeatherData | null;
}
```

**Datos mostrados** (Req 2.2–2.7):
- Nombre de ciudad y país: `data.location.name`, `data.location.country`
- Temperatura actual: `data.current.temp_c` °C
- Sensación térmica: `data.current.feelslike_c` °C
- Condición: `data.current.condition.text`
- Humedad: `data.current.humidity` %
- Viento: `data.current.wind_kph` km/h
- Ícono de condición: `data.current.condition.icon`

Retorna `null` si `data` es `null`.

---

### `weatherService.js` — Servicio HTTP

Encapsula toda la comunicación con WeatherAPI.

```js
// Interfaz pública
export async function getWeather(query: string): Promise<WeatherData>
```

**Contrato:**
- `query` puede ser un nombre de ciudad (`"London"`) o coordenadas (`"51.5,-0.1"`).
- Incluye `VITE_WEATHER_API_KEY` en cada solicitud (Req 5.2).
- Usa `axios` para el GET (Req 5.4).
- Si la respuesta HTTP no es 200, lanza un `WeatherServiceError` con `type` y `message` (Req 5.3).
- Mapeo de errores:
  - HTTP 400 / error code 1006 → `type: "NOT_FOUND"` → mensaje "Ciudad no encontrada"
  - HTTP 401 / 403 → `type: "AUTH_ERROR"` → mensaje "Error de autenticación con el servicio de clima"
  - Error de red / timeout → `type: "NETWORK_ERROR"` → mensaje "No se pudo conectar con el servicio de clima. Intenta de nuevo."

---

### `LoadingSpinner` — Indicador de carga (inline o componente)

Puede implementarse como un componente simple o inline en `App.jsx`.

```jsx
// Renderizado condicional en App.jsx
{loading && <div className="spinner" aria-label="Cargando..." role="status" />}
```

---

## Data Models

### `WeatherData` — Respuesta de WeatherAPI (subconjunto usado)

```typescript
interface WeatherData {
  location: {
    name: string;       // "London"
    country: string;    // "United Kingdom"
    lat: number;
    lon: number;
  };
  current: {
    temp_c: number;         // 18.5
    feelslike_c: number;    // 16.2
    humidity: number;       // 72  (porcentaje)
    wind_kph: number;       // 14.4
    condition: {
      text: string;         // "Partly cloudy"
      icon: string;         // "//cdn.weatherapi.com/weather/64x64/day/116.png"
      code: number;         // 1003
    };
  };
}
```

### `WeatherServiceError` — Error tipificado del servicio

```typescript
type WeatherErrorType = "NOT_FOUND" | "AUTH_ERROR" | "NETWORK_ERROR";

class WeatherServiceError extends Error {
  type: WeatherErrorType;
  constructor(type: WeatherErrorType, message: string) {
    super(message);
    this.type = type;
  }
}
```

### Estado de la aplicación (`App.jsx`)

```typescript
interface AppState {
  weather: WeatherData | null;  // null = sin datos / error
  error: string;                // "" = sin error
  loading: boolean;             // true durante solicitud activa
}
```

### Mapeo de errores del servicio a mensajes de UI

| `WeatherErrorType` | Mensaje mostrado al usuario |
|---|---|
| `NOT_FOUND` | "Ciudad no encontrada" |
| `AUTH_ERROR` | "Error de autenticación con el servicio de clima" |
| `NETWORK_ERROR` | "No se pudo conectar con el servicio de clima. Intenta de nuevo." |
| Geoloc denegada | "Permiso de ubicación denegado" |


---

## Correctness Properties

*Una propiedad es una característica o comportamiento que debe mantenerse verdadero en todas las ejecuciones válidas del sistema — esencialmente, una declaración formal sobre lo que el sistema debe hacer. Las propiedades sirven como puente entre las especificaciones legibles por humanos y las garantías de corrección verificables por máquinas.*

La feature weather-app-react involucra lógica de transformación de datos, validación de entradas, mapeo de errores y renderizado condicional — todas áreas donde el property-based testing aporta valor al verificar invariantes sobre un amplio espacio de entradas. Se utiliza **fast-check** como librería de PBT para JavaScript/TypeScript.

---

### Property 1: Búsqueda dispara onSearch con el valor ingresado

*Para cualquier* string no vacío escrito en el campo de búsqueda, activar la búsqueda (ya sea presionando Enter o haciendo clic en el botón) debe invocar `onSearch` exactamente una vez con ese mismo string como argumento.

**Validates: Requirements 1.2, 1.3**

---

### Property 2: Input vacío o solo-whitespace es rechazado

*Para cualquier* string compuesto únicamente de caracteres de espacio en blanco (incluyendo el string vacío), intentar ejecutar la búsqueda no debe invocar `onSearch` y debe mostrar el mensaje de validación "Escribe una ciudad".

**Validates: Requirements 1.4**

---

### Property 3: El campo de búsqueda se limpia tras invocar onSearch

*Para cualquier* string no vacío ingresado en el campo de búsqueda, después de que `onSearch` es invocado, el valor del campo de texto debe ser el string vacío.

**Validates: Requirements 1.5**

---

### Property 4: WeatherCard renderiza todos los campos requeridos

*Para cualquier* objeto `WeatherData` válido con valores arbitrarios en sus campos, el componente `WeatherCard` debe renderizar en el DOM: el nombre de la ciudad, el país, la temperatura en °C, la sensación térmica en °C, la condición en texto, el porcentaje de humedad y la velocidad del viento en km/h.

**Validates: Requirements 2.2, 2.3, 2.4, 2.5, 2.6, 2.7**

---

### Property 5: Cada solicitud al servicio incluye la API Key y el city query

*Para cualquier* string de consulta (nombre de ciudad o coordenadas), cuando `getWeather(query)` es invocado, la llamada HTTP realizada por axios debe incluir la `API_Key` como parámetro `key` y el `query` como parámetro `q` en la URL del endpoint `current.json`.

**Validates: Requirements 2.1, 5.2**

---

### Property 6: Los errores de WeatherAPI se mapean al mensaje de usuario correcto

*Para cualquier* tipo de error de WeatherAPI (HTTP 400/código 1006, HTTP 401/403, o error de red), el mensaje mostrado en la interfaz debe corresponder exactamente al mensaje definido para ese tipo de error: "Ciudad no encontrada", "Error de autenticación con el servicio de clima", o "No se pudo conectar con el servicio de clima. Intenta de nuevo." respectivamente.

**Validates: Requirements 3.1, 3.2, 3.3**

---

### Property 7: Un error oculta los datos climáticos previos

*Para cualquier* estado de la aplicación donde `WeatherData` estaba visible, cuando ocurre cualquier error de búsqueda, el componente `WeatherCard` no debe estar presente en el DOM.

**Validates: Requirements 3.4**

---

### Property 8: Una búsqueda exitosa limpia el mensaje de error previo

*Para cualquier* estado de la aplicación donde había un mensaje de error visible, cuando se completa una búsqueda exitosa, el mensaje de error debe desaparecer de la interfaz.

**Validates: Requirements 3.5**

---

### Property 9: El botón de búsqueda está deshabilitado durante la carga

*Para cualquier* estado donde `loading === true`, el botón de búsqueda del componente `Search` debe tener el atributo `disabled` activo.

**Validates: Requirements 4.3**

---

### Property 10: El indicador de carga desaparece tras cualquier respuesta

*Para cualquier* tipo de respuesta de la WeatherAPI (exitosa o con error), después de que la promesa se resuelve o rechaza, el indicador de carga no debe estar visible en la interfaz.

**Validates: Requirements 4.2**

---

### Property 11: getWeather lanza WeatherServiceError para cualquier HTTP no-200

*Para cualquier* código de respuesta HTTP distinto de 200 retornado por la WeatherAPI, `getWeather` debe lanzar una instancia de `WeatherServiceError` con un `type` no vacío y un `message` descriptivo no vacío.

**Validates: Requirements 5.3**

---

### Property 12: La geolocalización usa las coordenadas del dispositivo como query

*Para cualquier* par de coordenadas (latitud, longitud) retornadas por la API de geolocalización del navegador, `getWeather` debe ser invocado con esas coordenadas en el formato `"lat,lon"`.

**Validates: Requirements 6.2**

---

## Error Handling

### Estrategia de manejo de errores

El manejo de errores sigue un flujo de dos capas:

**Capa 1 — `weatherService.js`**: Captura errores de axios e intercepta respuestas HTTP no exitosas. Lanza `WeatherServiceError` con un `type` tipificado.

```js
export async function getWeather(query) {
  try {
    const response = await axios.get(
      `https://api.weatherapi.com/v1/current.json`,
      { params: { key: import.meta.env.VITE_WEATHER_API_KEY, q: query } }
    );
    return response.data;
  } catch (error) {
    if (error.response) {
      const status = error.response.status;
      const code = error.response.data?.error?.code;
      if (status === 400 || code === 1006) {
        throw new WeatherServiceError("NOT_FOUND", "Ciudad no encontrada");
      }
      if (status === 401 || status === 403) {
        throw new WeatherServiceError("AUTH_ERROR", "Error de autenticación con el servicio de clima");
      }
    }
    throw new WeatherServiceError("NETWORK_ERROR", "No se pudo conectar con el servicio de clima. Intenta de nuevo.");
  }
}
```

**Capa 2 — `App.jsx`**: Captura el `WeatherServiceError` y actualiza el estado `error` con el mensaje del error. Limpia `weather` para ocultar datos previos.

```js
const handleSearch = async (city) => {
  setLoading(true);
  setError("");
  try {
    const data = await getWeather(city);
    setWeather(data);
  } catch (err) {
    setWeather(null);
    setError(err.message ?? "Error desconocido");
  } finally {
    setLoading(false);
  }
};
```

### Casos de error cubiertos

| Escenario | Origen | Mensaje al usuario |
|---|---|---|
| Ciudad no encontrada | WeatherAPI HTTP 400 / code 1006 | "Ciudad no encontrada" |
| API Key inválida | WeatherAPI HTTP 401/403 | "Error de autenticación con el servicio de clima" |
| Sin conexión / timeout | axios network error | "No se pudo conectar con el servicio de clima. Intenta de nuevo." |
| Campo vacío | Validación en Search | "Escribe una ciudad" |
| Geolocalización denegada | Browser Geolocation API | "Permiso de ubicación denegado" |
| Navegador sin geolocalización | `navigator.geolocation === undefined` | Botón oculto (sin mensaje) |

### Geolocalización

```js
const handleLocation = () => {
  if (!navigator.geolocation) return; // botón no se muestra (Req 6.4)
  navigator.geolocation.getCurrentPosition(
    async ({ coords }) => {
      await handleSearch(`${coords.latitude},${coords.longitude}`);
    },
    () => {
      setError("Permiso de ubicación denegado"); // Req 6.3
    }
  );
};
```

---

## Testing Strategy

### Enfoque dual: Unit tests + Property-based tests

La estrategia combina tests de ejemplo para casos concretos y tests de propiedades para verificar invariantes sobre un amplio espacio de entradas.

### Herramientas

| Herramienta | Propósito |
|---|---|
| **Vitest** | Test runner (compatible con Vite) |
| **React Testing Library** | Renderizado y queries de componentes |
| **fast-check** | Property-based testing (PBT) |
| **@testing-library/user-event** | Simulación de interacciones de usuario |
| **vi.mock / vi.fn** | Mocking de axios y APIs del navegador |

### Tests unitarios (ejemplo-based)

Cubren casos concretos, puntos de integración y edge cases:

- `Search` renderiza input y botón (Req 1.1)
- `App` muestra el botón de geolocalización cuando el navegador lo soporta (Req 6.1)
- `App` oculta el botón de geolocalización cuando no hay soporte (Req 6.4)
- `App` muestra "Permiso de ubicación denegado" cuando se deniega (Req 6.3)
- `weatherService` usa axios para las solicitudes (Req 5.4)
- Indicador de carga visible durante solicitud activa (Req 4.1)

### Tests de propiedades (property-based)

Cada propiedad del diseño se implementa como un test de fast-check con mínimo **100 iteraciones**. Cada test incluye un comentario de trazabilidad:

```js
// Feature: weather-app-react, Property 4: WeatherCard renderiza todos los campos requeridos
test("WeatherCard renders all required fields for any WeatherData", () => {
  fc.assert(
    fc.property(arbitraryWeatherData(), (data) => {
      const { getByText } = render(<WeatherCard data={data} />);
      expect(getByText(new RegExp(data.current.temp_c))).toBeInTheDocument();
      expect(getByText(new RegExp(data.current.feelslike_c))).toBeInTheDocument();
      expect(getByText(data.current.condition.text)).toBeInTheDocument();
      expect(getByText(new RegExp(data.current.humidity))).toBeInTheDocument();
      expect(getByText(new RegExp(data.current.wind_kph))).toBeInTheDocument();
      expect(getByText(new RegExp(data.location.name))).toBeInTheDocument();
      expect(getByText(new RegExp(data.location.country))).toBeInTheDocument();
    }),
    { numRuns: 100 }
  );
});
```

### Generadores fast-check para el dominio

```js
// Generador de WeatherData arbitrario
const arbitraryWeatherData = () =>
  fc.record({
    location: fc.record({
      name: fc.string({ minLength: 1, maxLength: 50 }),
      country: fc.string({ minLength: 1, maxLength: 50 }),
    }),
    current: fc.record({
      temp_c: fc.float({ min: -60, max: 60 }),
      feelslike_c: fc.float({ min: -60, max: 60 }),
      humidity: fc.integer({ min: 0, max: 100 }),
      wind_kph: fc.float({ min: 0, max: 300 }),
      condition: fc.record({
        text: fc.string({ minLength: 1 }),
        icon: fc.constant("//cdn.weatherapi.com/weather/64x64/day/116.png"),
        code: fc.integer({ min: 1000, max: 1300 }),
      }),
    }),
  });

// Generador de strings whitespace-only
const arbitraryWhitespaceString = () =>
  fc.stringOf(fc.constantFrom(" ", "\t", "\n", "\r"));

// Generador de coordenadas geográficas
const arbitraryCoordinates = () =>
  fc.record({
    latitude: fc.float({ min: -90, max: 90 }),
    longitude: fc.float({ min: -180, max: 180 }),
  });
```

### Cobertura por requisito

| Requisito | Tipo de test | Propiedad |
|---|---|---|
| 1.1 | Unit (example) | — |
| 1.2, 1.3 | Property | Property 1 |
| 1.4 | Property | Property 2 |
| 1.5 | Property | Property 3 |
| 2.1, 5.2 | Property | Property 5 |
| 2.2–2.7 | Property | Property 4 |
| 3.1, 3.2, 3.3 | Property | Property 6 |
| 3.4 | Property | Property 7 |
| 3.5 | Property | Property 8 |
| 4.1 | Unit (example) | — |
| 4.2 | Property | Property 10 |
| 4.3 | Property | Property 9 |
| 5.1 | Property | Property 5 |
| 5.3 | Property | Property 11 |
| 5.4 | Unit (example) | — |
| 6.1 | Unit (example) | — |
| 6.2 | Property | Property 12 |
| 6.3 | Unit (example) | — |
| 6.4 | Unit (example) | — |
