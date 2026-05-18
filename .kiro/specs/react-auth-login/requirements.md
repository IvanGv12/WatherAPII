# Requirements Document — react-auth-login

## Introduction

Esta feature agrega un sistema de autenticación completo al frontend React de la weather-app. La aplicación actualmente es una SPA sin rutas ni protección de páginas. El backend Laravel 11 + Breeze ya expone los endpoints de autenticación basados en sesiones con cookies (`POST /login`, `POST /logout`, `POST /register`) y protección CSRF. El objetivo es que el frontend React consuma esos endpoints mediante axios, gestione el estado de sesión del usuario, proteja la vista principal del clima y ofrezca formularios de login y registro propios en React — sin depender de las vistas Blade existentes.

## Glossary

- **Auth_System**: El conjunto de componentes, servicios y lógica del frontend React responsables de gestionar la autenticación del usuario.
- **Auth_Service**: El módulo JavaScript (`authService.js`) que encapsula las llamadas HTTP a los endpoints de autenticación de Laravel.
- **Login_Form**: El componente React que renderiza el formulario de inicio de sesión.
- **Register_Form**: El componente React que renderiza el formulario de registro de nuevos usuarios.
- **Auth_Context**: El contexto React (`AuthContext`) que almacena y distribuye el estado de autenticación (usuario autenticado o no) a toda la aplicación.
- **Protected_Route**: El componente React que restringe el acceso a rutas que requieren autenticación, redirigiendo al Login_Form si el usuario no está autenticado.
- **Guest_Route**: El componente React que restringe el acceso a rutas de invitado (login, registro), redirigiendo a la vista principal si el usuario ya está autenticado.
- **Weather_View**: La vista principal de la aplicación que muestra el buscador de clima y los resultados (el `App.jsx` actual).
- **CSRF_Token**: El token de protección contra Cross-Site Request Forgery que Laravel requiere en las solicitudes de mutación (POST, PUT, DELETE). Se obtiene llamando a `GET /sanctum/csrf-cookie` antes de las solicitudes de autenticación.
- **Session_Cookie**: La cookie de sesión que Laravel establece tras un login exitoso y que axios envía automáticamente en solicitudes subsiguientes.
- **Laravel_Backend**: El servidor Laravel 11 + Breeze que expone los endpoints de autenticación y gestiona las sesiones.
- **Authenticated_User**: El objeto con los datos del usuario actualmente autenticado (id, name, email).
- **Validation_Error**: Un error de validación retornado por Laravel con código HTTP 422 y un objeto `errors` con los campos que fallaron.

---

## Requirements

### Requirement 1: Enrutamiento del frontend

**User Story:** Como usuario, quiero que la aplicación me muestre la pantalla correcta según mi estado de autenticación, para que no pueda acceder a la vista de clima sin estar autenticado ni ver el login si ya inicié sesión.

#### Acceptance Criteria

1. THE Auth_System SHALL implementar un sistema de enrutamiento en el frontend que distinga entre rutas protegidas y rutas de invitado.
2. WHEN un usuario no autenticado intenta acceder a la Weather_View, THE Auth_System SHALL redirigirlo al Login_Form.
3. WHEN un usuario autenticado intenta acceder al Login_Form o al Register_Form, THE Auth_System SHALL redirigirlo a la Weather_View.
4. WHEN la aplicación se carga por primera vez, THE Auth_System SHALL verificar el estado de autenticación del usuario antes de renderizar cualquier vista protegida.
5. WHILE la verificación inicial del estado de autenticación está en curso, THE Auth_System SHALL mostrar un indicador de carga en lugar de redirigir al usuario.

---

### Requirement 2: Inicio de sesión

**User Story:** Como usuario registrado, quiero iniciar sesión con mi correo electrónico y contraseña, para poder acceder a la vista de clima.

#### Acceptance Criteria

1. THE Login_Form SHALL renderizar un campo de texto para el correo electrónico, un campo de contraseña y un botón de envío.
2. WHEN el usuario envía el formulario de login con credenciales válidas, THE Auth_Service SHALL realizar una solicitud `POST /login` al Laravel_Backend incluyendo el email y la password.
3. WHEN el Laravel_Backend responde con HTTP 200 al login, THE Auth_System SHALL actualizar el Auth_Context con los datos del Authenticated_User y redirigir al usuario a la Weather_View.
4. IF el Laravel_Backend responde con HTTP 422 al login, THEN THE Login_Form SHALL mostrar el mensaje de error de validación correspondiente junto al campo que lo originó.
5. IF el Laravel_Backend responde con HTTP 401 o HTTP 419 al login, THEN THE Login_Form SHALL mostrar el mensaje "Credenciales incorrectas o sesión expirada".
6. IF ocurre un error de red durante el login, THEN THE Login_Form SHALL mostrar el mensaje "No se pudo conectar con el servidor. Intenta de nuevo.".
7. WHILE la solicitud de login está en curso, THE Login_Form SHALL deshabilitar el botón de envío para evitar envíos duplicados.
8. THE Login_Form SHALL incluir un enlace visible hacia el Register_Form para usuarios que no tienen cuenta.

---

### Requirement 3: Registro de usuario

**User Story:** Como usuario nuevo, quiero crear una cuenta con mi nombre, correo electrónico y contraseña, para poder acceder a la aplicación.

#### Acceptance Criteria

1. THE Register_Form SHALL renderizar un campo de texto para el nombre, un campo de texto para el correo electrónico, un campo de contraseña y un campo de confirmación de contraseña.
2. WHEN el usuario envía el formulario de registro con datos válidos, THE Auth_Service SHALL realizar una solicitud `POST /register` al Laravel_Backend incluyendo name, email, password y password_confirmation.
3. WHEN el Laravel_Backend responde con HTTP 201 o HTTP 200 al registro, THE Auth_System SHALL actualizar el Auth_Context con los datos del Authenticated_User y redirigir al usuario a la Weather_View.
4. IF el Laravel_Backend responde con HTTP 422 al registro, THEN THE Register_Form SHALL mostrar el mensaje de error de validación correspondiente junto al campo que lo originó.
5. IF ocurre un error de red durante el registro, THEN THE Register_Form SHALL mostrar el mensaje "No se pudo conectar con el servidor. Intenta de nuevo.".
6. WHILE la solicitud de registro está en curso, THE Register_Form SHALL deshabilitar el botón de envío para evitar envíos duplicados.
7. THE Register_Form SHALL incluir un enlace visible hacia el Login_Form para usuarios que ya tienen cuenta.

---

### Requirement 4: Cierre de sesión

**User Story:** Como usuario autenticado, quiero poder cerrar sesión desde la Weather_View, para que mi cuenta quede protegida al terminar de usar la aplicación.

#### Acceptance Criteria

1. THE Weather_View SHALL mostrar un control de cierre de sesión visible cuando el usuario está autenticado.
2. WHEN el usuario activa el cierre de sesión, THE Auth_Service SHALL realizar una solicitud `POST /logout` al Laravel_Backend.
3. WHEN el Laravel_Backend responde con HTTP 200 o HTTP 204 al logout, THE Auth_System SHALL limpiar el Auth_Context y redirigir al usuario al Login_Form.
4. IF ocurre un error de red durante el logout, THEN THE Auth_System SHALL limpiar el Auth_Context de forma local y redirigir al usuario al Login_Form de todas formas.
5. THE Weather_View SHALL mostrar el nombre del Authenticated_User junto al control de cierre de sesión.

---

### Requirement 5: Gestión del estado de autenticación

**User Story:** Como desarrollador, quiero que el estado de autenticación esté centralizado y disponible en toda la aplicación, para que cualquier componente pueda saber si el usuario está autenticado sin hacer llamadas HTTP adicionales.

#### Acceptance Criteria

1. THE Auth_Context SHALL almacenar el objeto Authenticated_User (o `null` si no hay sesión activa) y exponerlo a todos los componentes de la aplicación.
2. THE Auth_Context SHALL exponer una función `login` que actualice el estado del usuario autenticado tras un inicio de sesión exitoso.
3. THE Auth_Context SHALL exponer una función `logout` que limpie el estado del usuario autenticado tras un cierre de sesión.
4. WHEN la aplicación se inicializa, THE Auth_System SHALL realizar una solicitud `GET /api/user` al Laravel_Backend para verificar si existe una sesión activa y poblar el Auth_Context con los datos del usuario si la hay.
5. IF el Laravel_Backend responde con HTTP 401 a la solicitud `GET /api/user`, THEN THE Auth_System SHALL establecer el Authenticated_User como `null` en el Auth_Context sin mostrar ningún error al usuario.

---

### Requirement 6: Integración CSRF con Laravel

**User Story:** Como desarrollador, quiero que el frontend maneje automáticamente el token CSRF requerido por Laravel, para que las solicitudes de autenticación no sean rechazadas por protección CSRF.

#### Acceptance Criteria

1. WHEN el Auth_Service realiza la primera solicitud de mutación (login o registro), THE Auth_Service SHALL primero realizar una solicitud `GET /sanctum/csrf-cookie` para obtener el CSRF_Token.
2. THE Auth_Service SHALL configurar axios con `withCredentials: true` para que las Session_Cookie y el CSRF_Token se envíen automáticamente en todas las solicitudes al Laravel_Backend.
3. THE Auth_Service SHALL configurar el header `X-Requested-With: XMLHttpRequest` en todas las solicitudes al Laravel_Backend para que Laravel las identifique como solicitudes AJAX.
4. IF el Laravel_Backend responde con HTTP 419 a cualquier solicitud, THEN THE Auth_Service SHALL reintentar la solicitud una vez después de obtener un nuevo CSRF_Token mediante `GET /sanctum/csrf-cookie`.

---

### Requirement 7: Validación de formularios en el cliente

**User Story:** Como usuario, quiero recibir retroalimentación inmediata sobre errores en los formularios antes de enviarlos al servidor, para corregir mis datos sin esperar una respuesta de red.

#### Acceptance Criteria

1. IF el campo de email del Login_Form o Register_Form no tiene formato de correo electrónico válido al momento del envío, THEN THE Auth_System SHALL mostrar el mensaje "Ingresa un correo electrónico válido" sin realizar ninguna solicitud al Laravel_Backend.
2. IF el campo de password del Login_Form está vacío al momento del envío, THEN THE Auth_System SHALL mostrar el mensaje "La contraseña es requerida" sin realizar ninguna solicitud al Laravel_Backend.
3. IF el campo de name del Register_Form está vacío al momento del envío, THEN THE Auth_System SHALL mostrar el mensaje "El nombre es requerido" sin realizar ninguna solicitud al Laravel_Backend.
4. IF el campo de password_confirmation del Register_Form no coincide con el campo de password al momento del envío, THEN THE Auth_System SHALL mostrar el mensaje "Las contraseñas no coinciden" sin realizar ninguna solicitud al Laravel_Backend.
5. WHEN el usuario corrige un campo con error de validación, THE Auth_System SHALL limpiar el mensaje de error de ese campo.

---

### Requirement 8: Encapsulación del servicio de autenticación

**User Story:** Como desarrollador, quiero que toda la lógica de comunicación con los endpoints de autenticación de Laravel esté encapsulada en el Auth_Service, para mantener los componentes desacoplados de los detalles de la API.

#### Acceptance Criteria

1. THE Auth_Service SHALL exponer las funciones `login(email, password)`, `register(name, email, password, passwordConfirmation)`, `logout()` y `getUser()`.
2. THE Auth_Service SHALL utilizar una instancia de axios configurada con la URL base del Laravel_Backend y `withCredentials: true`.
3. IF el Laravel_Backend retorna un código HTTP distinto de los esperados para cada operación, THEN THE Auth_Service SHALL lanzar un error con un mensaje descriptivo que identifique el tipo de fallo.
4. THE Auth_Service SHALL obtener la URL base del Laravel_Backend desde una variable de entorno Vite (`VITE_API_BASE_URL`) para permitir configuración por entorno.
