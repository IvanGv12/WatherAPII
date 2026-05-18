# Implementation Plan: react-auth-login

## Overview

Implementación del sistema de autenticación en el frontend React, consumiendo los endpoints de Laravel 11 + Breeze mediante sesiones con cookies. El plan sigue un orden incremental: primero la capa de servicio y contexto, luego las guardas de rutas, después los formularios, y finalmente el refactor de la vista principal y el cableado en `main.jsx`.

## Tasks

- [x] 1. Instalar react-router-dom y configurar el entorno de tests
  - Instalar `react-router-dom` como dependencia de producción: `npm install react-router-dom`
  - Verificar que `src/test/setup.js` ya importa `@testing-library/jest-dom` (no requiere cambios)
  - Confirmar que `vitest.config` o `vite.config.js` tiene `environment: 'jsdom'` y apunta al setup file
  - _Requirements: 1.1_

- [ ] 2. Implementar `authService.js`
  - [x] 2.1 Crear `src/services/authService.js` con la clase `AuthServiceError` y la instancia axios configurada
    - Definir `AuthServiceError` con `type` (`VALIDATION | UNAUTHORIZED | NETWORK | UNEXPECTED`) y `errors` opcional
    - Crear instancia axios con `baseURL` desde `VITE_API_BASE_URL`, `withCredentials: true` y header `X-Requested-With: XMLHttpRequest`
    - Implementar función interna `fetchCsrf()` que llama `GET /sanctum/csrf-cookie`
    - _Requirements: 6.1, 6.2, 6.3, 8.1, 8.2, 8.4_

  - [x] 2.2 Implementar `login(email, password)` en `authService.js`
    - Llamar `fetchCsrf()` antes del POST
    - Llamar `POST /login` con `{ email, password }`
    - En 200: llamar `GET /api/user` y retornar el objeto usuario
    - En 422: lanzar `AuthServiceError("VALIDATION", response.data.errors)`
    - En 401: lanzar `AuthServiceError("UNAUTHORIZED")`
    - En 419: reintentar una vez tras nuevo `fetchCsrf()`, luego lanzar `AuthServiceError("UNAUTHORIZED")`
    - En otro código: lanzar `AuthServiceError("UNEXPECTED")`
    - En error de red: lanzar `AuthServiceError("NETWORK")`
    - _Requirements: 2.2, 6.1, 6.4, 8.1, 8.3_

  - [x] 2.3 Implementar `register(name, email, password, passwordConfirmation)` en `authService.js`
    - Llamar `fetchCsrf()` antes del POST
    - Llamar `POST /register` con `{ name, email, password, password_confirmation }`
    - En 200/201: llamar `GET /api/user` y retornar el objeto usuario
    - En 422: lanzar `AuthServiceError("VALIDATION", response.data.errors)`
    - En 419: reintentar una vez tras nuevo `fetchCsrf()`
    - En otro código: lanzar `AuthServiceError("UNEXPECTED")`
    - En error de red: lanzar `AuthServiceError("NETWORK")`
    - _Requirements: 3.2, 6.1, 6.4, 8.1, 8.3_

  - [x] 2.4 Implementar `logout()` y `getUser()` en `authService.js`
    - `logout()`: llamar `POST /logout`; resolver siempre (incluso si falla) — nunca lanzar
    - `getUser()`: llamar `GET /api/user`; en 200 retornar usuario; en 401 retornar `null`; en otro error retornar `null`
    - _Requirements: 4.2, 5.1, 5.4, 5.5, 8.1_

  - [-] 2.5 Escribir tests unitarios para `authService.js` (`src/services/authService.test.js`)
    - Mockear axios con `vi.mock`
    - Test: configura `withCredentials: true`
    - Test: configura header `X-Requested-With: XMLHttpRequest`
    - Test: `login()` llama `fetchCsrf()` antes de `POST /login`
    - Test: `login()` retorna usuario tras 200
    - Test: `login()` lanza `AuthServiceError("VALIDATION")` con 422
    - Test: `login()` lanza `AuthServiceError("UNAUTHORIZED")` con 401
    - Test: `login()` reintenta tras 419 y luego lanza `AuthServiceError("UNAUTHORIZED")`
    - Test: `register()` llama `fetchCsrf()` antes de `POST /register`
    - Test: `register()` retorna usuario tras 200/201
    - Test: `logout()` resuelve aunque el servidor falle
    - Test: `getUser()` retorna `null` con 401 sin lanzar error
    - _Requirements: 2.2, 3.2, 4.2, 5.4, 5.5, 6.1, 6.4, 8.1, 8.3_

  - [-] 2.6 Escribir property test: login() envía exactamente las credenciales proporcionadas
    - **Property 3: login() envía exactamente las credenciales proporcionadas**
    - **Validates: Requirements 2.2**
    - Usar `fc.emailAddress()` y `fc.string({ minLength: 1 })` para generar pares (email, password)
    - Verificar que el cuerpo del `POST /login` contiene exactamente esos valores
    - Mínimo 100 iteraciones

  - [-] 2.7 Escribir property test: register() envía exactamente los datos proporcionados
    - **Property 7: register() envía exactamente los datos proporcionados**
    - **Validates: Requirements 3.2**
    - Usar `fc.string({ minLength: 1 })`, `fc.emailAddress()`, `fc.string({ minLength: 8 })` para generar (name, email, password)
    - Verificar que el cuerpo del `POST /register` contiene exactamente esos cuatro valores
    - Mínimo 100 iteraciones

  - [x] 2.8 Escribir property test: códigos HTTP inesperados producen errores descriptivos
    - **Property 13: Códigos HTTP inesperados producen errores descriptivos**
    - **Validates: Requirements 8.3**
    - Usar `fc.integer({ min: 100, max: 599 }).filter(s => ![200, 201, 204, 401, 419, 422].includes(s))`
    - Verificar que `login()` y `register()` lanzan `AuthServiceError` con `message` no vacío
    - Mínimo 100 iteraciones

- [-] 3. Checkpoint — Verificar authService
  - Ejecutar `npm test -- --reporter=verbose src/services/authService.test.js` y confirmar que todos los tests pasan.
  - Preguntar al usuario si hay dudas antes de continuar.

- [~] 4. Implementar `AuthContext.jsx`
  - [~] 4.1 Crear `src/contexts/AuthContext.jsx` con el contexto, el hook `useAuth` y el `AuthProvider`
    - Definir `AuthContext` con shape `{ user, loading, login, logout }`
    - `AuthProvider`: estado `user` (null) y `loading` (true)
    - `useEffect` al montar: llamar `authService.getUser()`, poblar `user`, establecer `loading: false` en `finally`
    - Exponer `login(user)` con `useCallback` que llama `setUser(user)`
    - Exponer `logout()` con `useCallback` que llama `setUser(null)`
    - _Requirements: 1.4, 1.5, 5.1, 5.2, 5.3, 5.4, 5.5_

  - [~] 4.2 Escribir tests unitarios para `AuthContext.jsx` (`src/contexts/AuthContext.test.jsx`)
    - Mockear `authService` con `vi.mock`
    - Test: llama `GET /api/user` al montar
    - Test: `loading` es `true` durante la verificación inicial y `false` después
    - Test: establece `user` con la respuesta de `getUser()`
    - Test: establece `user` a `null` cuando `getUser()` retorna `null` (401)
    - Test: `logout()` establece `user` a `null`
    - Test: `login(user)` actualiza `user` en el contexto
    - _Requirements: 1.4, 1.5, 5.1, 5.2, 5.3, 5.4, 5.5_

  - [~] 4.3 Escribir property test: login() del contexto actualiza user con el objeto proporcionado
    - **Property 9: login() del contexto actualiza el usuario con el objeto proporcionado**
    - **Validates: Requirements 5.2**
    - Usar `fc.record({ id: fc.integer(), name: fc.string(), email: fc.emailAddress() })`
    - Llamar `auth.login(user)` y verificar que `context.user` es igual al objeto pasado
    - Mínimo 100 iteraciones

  - [~] 4.4 Escribir property test: autenticación exitosa actualiza el contexto con el usuario retornado
    - **Property 4: Autenticación exitosa actualiza el contexto con el usuario retornado**
    - **Validates: Requirements 2.3, 3.3**
    - Usar `fc.record({ id: fc.integer(), name: fc.string(), email: fc.emailAddress() })`
    - Mockear `authService.getUser()` para retornar el usuario generado
    - Verificar que `context.user` tiene exactamente el mismo `id`, `name` y `email`
    - Mínimo 100 iteraciones

- [~] 5. Implementar `LoadingSpinner.jsx`
  - Crear `src/components/LoadingSpinner.jsx` extrayendo el spinner existente de `App.jsx`
  - Renderizar `<div className="spinner" aria-label="Cargando..." role="status" />`
  - _Requirements: 1.5_

- [~] 6. Implementar `ProtectedRoute.jsx` y `GuestRoute.jsx`
  - [~] 6.1 Crear `src/routes/ProtectedRoute.jsx`
    - Consumir `useAuth()` para obtener `{ user, loading }`
    - Si `loading`: retornar `<LoadingSpinner />`
    - Si `!user`: retornar `<Navigate to="/login" replace />`
    - Si `user`: retornar `<Outlet />`
    - _Requirements: 1.2, 1.4, 1.5_

  - [~] 6.2 Crear `src/routes/GuestRoute.jsx`
    - Consumir `useAuth()` para obtener `{ user, loading }`
    - Si `loading`: retornar `<LoadingSpinner />`
    - Si `user`: retornar `<Navigate to="/" replace />`
    - Si `!user`: retornar `<Outlet />`
    - _Requirements: 1.3, 1.4, 1.5_

  - [~] 6.3 Escribir tests unitarios para `ProtectedRoute.jsx` (`src/routes/ProtectedRoute.test.jsx`)
    - Mockear `useAuth` con `vi.mock`
    - Test: muestra `LoadingSpinner` cuando `loading: true`
    - Test: redirige a `/login` cuando `user: null, loading: false`
    - Test: renderiza `<Outlet />` cuando hay usuario autenticado
    - _Requirements: 1.2, 1.4, 1.5_

  - [~] 6.4 Escribir property test: ProtectedRoute redirige a usuarios no autenticados
    - **Property 1: ProtectedRoute redirige a usuarios no autenticados**
    - **Validates: Requirements 1.2**
    - Usar `fc.constant({ user: null, loading: false })`
    - Verificar que siempre renderiza `<Navigate to="/login" />`
    - Mínimo 100 iteraciones

  - [~] 6.5 Escribir tests unitarios para `GuestRoute.jsx` (`src/routes/GuestRoute.test.jsx`)
    - Mockear `useAuth` con `vi.mock`
    - Test: muestra `LoadingSpinner` cuando `loading: true`
    - Test: redirige a `/` cuando hay usuario autenticado
    - Test: renderiza `<Outlet />` cuando `user: null, loading: false`
    - _Requirements: 1.3, 1.4, 1.5_

  - [~] 6.6 Escribir property test: GuestRoute redirige a usuarios autenticados
    - **Property 2: GuestRoute redirige a usuarios autenticados**
    - **Validates: Requirements 1.3**
    - Usar `fc.record({ id: fc.integer(), name: fc.string(), email: fc.emailAddress() })`
    - Verificar que para cualquier objeto de usuario válido siempre renderiza `<Navigate to="/" />`
    - Mínimo 100 iteraciones

- [~] 7. Checkpoint — Verificar rutas y contexto
  - Ejecutar `npm test -- --reporter=verbose src/contexts/ src/routes/` y confirmar que todos los tests pasan.
  - Preguntar al usuario si hay dudas antes de continuar.

- [~] 8. Implementar `LoginForm.jsx`
  - [~] 8.1 Crear `src/components/auth/LoginForm.jsx` con estado y estructura del formulario
    - Estado local: `email`, `password`, `fieldErrors`, `serverError`, `submitting`
    - Renderizar campo email, campo password, botón de envío y enlace a `/register`
    - Deshabilitar el botón cuando `submitting` es `true`
    - _Requirements: 2.1, 2.7, 2.8_

  - [~] 8.2 Implementar validación client-side en `LoginForm.jsx`
    - Validar formato de email antes de enviar (sin llamada HTTP si inválido)
    - Validar que password no esté vacío antes de enviar
    - Mostrar mensajes: "Ingresa un correo electrónico válido" y "La contraseña es requerida"
    - Limpiar el error de un campo cuando el usuario cambia su valor
    - _Requirements: 7.1, 7.2, 7.5_

  - [~] 8.3 Implementar lógica de envío en `LoginForm.jsx`
    - Llamar `authService.login(email, password)` al enviar
    - En éxito: llamar `auth.login(user)` y navegar a `/`
    - En `VALIDATION`: mapear `error.errors` a `fieldErrors`
    - En `UNAUTHORIZED`: mostrar "Credenciales incorrectas o sesión expirada" en `serverError`
    - En `NETWORK` o `UNEXPECTED`: mostrar "No se pudo conectar con el servidor. Intenta de nuevo."
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6_

  - [~] 8.4 Escribir tests unitarios para `LoginForm.jsx` (`src/components/auth/LoginForm.test.jsx`)
    - Mockear `authService` y `useAuth` con `vi.mock`
    - Test: renderiza email, password y botón de envío
    - Test: muestra enlace a `/register`
    - Test: muestra "La contraseña es requerida" con password vacío (sin llamada HTTP)
    - Test: muestra "Credenciales incorrectas o sesión expirada" con error `UNAUTHORIZED`
    - Test: muestra "No se pudo conectar con el servidor. Intenta de nuevo." con error `NETWORK`
    - Test: llama `auth.login(user)` y navega a `/` tras login exitoso
    - Test: botón deshabilitado mientras `submitting` es `true`
    - _Requirements: 2.1, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

  - [~] 8.5 Escribir property test: errores 422 se muestran junto al campo correcto (LoginForm)
    - **Property 5: Los errores de validación 422 se muestran junto al campo correcto**
    - **Validates: Requirements 2.4**
    - Usar `fc.record({ email: fc.option(fc.array(fc.string({ minLength: 1 }), { minLength: 1 })), password: fc.option(fc.array(fc.string({ minLength: 1 }), { minLength: 1 })) })`
    - Mockear `authService.login` para lanzar `AuthServiceError("VALIDATION", errors)`
    - Verificar que cada mensaje aparece adyacente a su campo en el DOM
    - Mínimo 100 iteraciones

  - [~] 8.6 Escribir property test: botón deshabilitado durante solicitud en curso (LoginForm)
    - **Property 6: El botón de envío está deshabilitado durante cualquier solicitud en curso**
    - **Validates: Requirements 2.7**
    - Usar `fc.emailAddress()` y `fc.string({ minLength: 1 })` para generar credenciales válidas
    - Mockear `authService.login` con una promesa que no resuelve inmediatamente
    - Verificar que el botón está `disabled` mientras la promesa está pendiente
    - Mínimo 100 iteraciones

  - [~] 8.7 Escribir property test: email inválido bloquea el envío sin llamadas HTTP (LoginForm)
    - **Property 10: Email con formato inválido bloquea el envío sin llamadas HTTP**
    - **Validates: Requirements 7.1**
    - Usar `fc.string().filter(s => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s))`
    - Verificar que aparece "Ingresa un correo electrónico válido" y que `authService.login` no fue llamado
    - Mínimo 100 iteraciones

  - [~] 8.8 Escribir property test: corregir campo limpia su error (LoginForm)
    - **Property 12: Corregir un campo limpia su error de validación**
    - **Validates: Requirements 7.5**
    - Disparar error de validación en el campo email, luego cambiar su valor con `fc.string({ minLength: 1 })`
    - Verificar que el mensaje de error desaparece tras el cambio
    - Mínimo 100 iteraciones

- [~] 9. Implementar `RegisterForm.jsx`
  - [~] 9.1 Crear `src/components/auth/RegisterForm.jsx` con estado y estructura del formulario
    - Estado local: `name`, `email`, `password`, `passwordConfirmation`, `fieldErrors`, `serverError`, `submitting`
    - Renderizar campos name, email, password, password_confirmation, botón de envío y enlace a `/login`
    - Deshabilitar el botón cuando `submitting` es `true`
    - _Requirements: 3.1, 3.6, 3.7_

  - [~] 9.2 Implementar validación client-side en `RegisterForm.jsx`
    - Validar que `name` no esté vacío: "El nombre es requerido"
    - Validar formato de email: "Ingresa un correo electrónico válido"
    - Validar que `password` y `passwordConfirmation` coincidan: "Las contraseñas no coinciden"
    - Limpiar el error de un campo cuando el usuario cambia su valor
    - _Requirements: 7.1, 7.3, 7.4, 7.5_

  - [~] 9.3 Implementar lógica de envío en `RegisterForm.jsx`
    - Llamar `authService.register(name, email, password, passwordConfirmation)` al enviar
    - En éxito: llamar `auth.login(user)` y navegar a `/`
    - En `VALIDATION`: mapear `error.errors` a `fieldErrors`
    - En `NETWORK` o `UNEXPECTED`: mostrar "No se pudo conectar con el servidor. Intenta de nuevo."
    - _Requirements: 3.2, 3.3, 3.4, 3.5_

  - [~] 9.4 Escribir tests unitarios para `RegisterForm.jsx` (`src/components/auth/RegisterForm.test.jsx`)
    - Mockear `authService` y `useAuth` con `vi.mock`
    - Test: renderiza name, email, password, password_confirmation y botón
    - Test: muestra enlace a `/login`
    - Test: muestra "El nombre es requerido" con name vacío (sin llamada HTTP)
    - Test: muestra "No se pudo conectar con el servidor. Intenta de nuevo." con error `NETWORK`
    - Test: llama `auth.login(user)` y navega a `/` tras registro exitoso
    - Test: botón deshabilitado mientras `submitting` es `true`
    - _Requirements: 3.1, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [~] 9.5 Escribir property test: errores 422 se muestran junto al campo correcto (RegisterForm)
    - **Property 5: Los errores de validación 422 se muestran junto al campo correcto**
    - **Validates: Requirements 3.4**
    - Usar `fc.record` con campos opcionales `name`, `email`, `password`, `password_confirmation`
    - Mockear `authService.register` para lanzar `AuthServiceError("VALIDATION", errors)`
    - Verificar que cada mensaje aparece adyacente a su campo en el DOM
    - Mínimo 100 iteraciones

  - [~] 9.6 Escribir property test: botón deshabilitado durante solicitud en curso (RegisterForm)
    - **Property 6: El botón de envío está deshabilitado durante cualquier solicitud en curso**
    - **Validates: Requirements 3.6**
    - Usar `fc.string({ minLength: 1 })`, `fc.emailAddress()`, `fc.string({ minLength: 8 })` para datos válidos
    - Mockear `authService.register` con una promesa que no resuelve inmediatamente
    - Verificar que el botón está `disabled` mientras la promesa está pendiente
    - Mínimo 100 iteraciones

  - [~] 9.7 Escribir property test: contraseñas distintas bloquean el envío sin llamadas HTTP
    - **Property 11: Contraseñas que no coinciden bloquean el envío sin llamadas HTTP**
    - **Validates: Requirements 7.4**
    - Usar `fc.tuple(fc.string({ minLength: 1 }), fc.string({ minLength: 1 })).filter(([a, b]) => a !== b)`
    - Verificar que aparece "Las contraseñas no coinciden" y que `authService.register` no fue llamado
    - Mínimo 100 iteraciones

  - [~] 9.8 Escribir property test: email inválido bloquea el envío sin llamadas HTTP (RegisterForm)
    - **Property 10: Email con formato inválido bloquea el envío sin llamadas HTTP**
    - **Validates: Requirements 7.1**
    - Usar `fc.string().filter(s => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s))`
    - Verificar que aparece "Ingresa un correo electrónico válido" y que `authService.register` no fue llamado
    - Mínimo 100 iteraciones

  - [~] 9.9 Escribir property test: corregir campo limpia su error (RegisterForm)
    - **Property 12: Corregir un campo limpia su error de validación**
    - **Validates: Requirements 7.5**
    - Disparar error de validación en el campo name, luego cambiar su valor con `fc.string({ minLength: 1 })`
    - Verificar que el mensaje de error desaparece tras el cambio
    - Mínimo 100 iteraciones

- [~] 10. Checkpoint — Verificar formularios de autenticación
  - Ejecutar `npm test -- --reporter=verbose src/components/auth/` y confirmar que todos los tests pasan.
  - Preguntar al usuario si hay dudas antes de continuar.

- [~] 11. Refactorizar `App.jsx` a `WeatherView.jsx`
  - [~] 11.1 Crear `src/components/WeatherView.jsx` con el contenido actual de `App.jsx`
    - Copiar la lógica de `App.jsx` a `WeatherView.jsx` (búsqueda, geolocalización, estado de clima)
    - Reemplazar el spinner inline por `<LoadingSpinner />`
    - Agregar `header` con `{user.name}` y botón "Cerrar sesión" usando `useAuth()`
    - Implementar `handleLogout`: llamar `authService.logout()`, luego `auth.logout()`, navegar a `/login`
    - En error de red en logout: limpiar contexto y redirigir de todas formas (Req 4.4)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [~] 11.2 Actualizar `src/App.test.jsx` → `src/components/WeatherView.test.jsx`
    - Crear `src/components/WeatherView.test.jsx` adaptando los tests existentes de `App.test.jsx`
    - Mockear `useAuth` para proveer un usuario autenticado de prueba
    - Mockear `authService.logout`
    - Test: renderiza el nombre del usuario autenticado
    - Test: muestra botón de cierre de sesión
    - Test: al hacer click en logout llama `authService.logout()` y `auth.logout()`
    - Test: en error de red en logout, limpia contexto y redirige a `/login`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [~] 11.3 Escribir property test: WeatherView muestra nombre y logout para cualquier usuario autenticado
    - **Property 8: WeatherView muestra nombre y control de logout para cualquier usuario autenticado**
    - **Validates: Requirements 4.1, 4.5**
    - Usar `fc.record({ id: fc.integer(), name: fc.string({ minLength: 1 }), email: fc.emailAddress() })`
    - Verificar que el nombre exacto del usuario aparece en el DOM y que el botón de logout está presente
    - Mínimo 100 iteraciones

- [~] 12. Crear `src/routes/index.jsx` con la estructura de rutas
  - Definir `AppRoutes` con `<Routes>`:
    - `<Route element={<GuestRoute />}>` con `/login` → `<LoginForm />` y `/register` → `<RegisterForm />`
    - `<Route element={<ProtectedRoute />}>` con `/` → `<WeatherView />`
  - _Requirements: 1.1, 1.2, 1.3_

- [~] 13. Actualizar `src/main.jsx` para cablear toda la aplicación
  - Envolver la app con `<BrowserRouter>` de `react-router-dom`
  - Envolver con `<AuthProvider>` de `AuthContext`
  - Reemplazar `<App />` por `<AppRoutes />` de `routes/index.jsx`
  - Mantener `<StrictMode>`
  - _Requirements: 1.1, 1.4, 5.1_

- [~] 14. Checkpoint final — Verificar suite completa de tests
  - Ejecutar `npm test` y confirmar que todos los tests pasan (incluyendo los tests existentes de `weatherService`, `Search` y `WeatherCard`).
  - Preguntar al usuario si hay dudas antes de continuar.

## Notes

- Las tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido
- Cada tarea referencia los requisitos específicos para trazabilidad
- Los property tests usan `fast-check` (ya instalado) con mínimo 100 iteraciones cada uno
- `react-router-dom` debe instalarse antes de comenzar (tarea 1)
- `WeatherView.test.jsx` reemplaza a `App.test.jsx` — el archivo original puede eliminarse una vez migrado
- La instancia axios de `authService` es independiente de la usada en `weatherService.js`
- El `VITE_API_BASE_URL` debe agregarse al `.env` apuntando al servidor Laravel (ej: `http://localhost:8000`)
