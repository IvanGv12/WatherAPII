# Requirements Document

## Introduction

Esta feature consiste en una página web construida en React que permite a los usuarios consultar información climática en tiempo real. La aplicación consume la API de WeatherAPI directamente desde el frontend y presenta los datos de forma clara e intuitiva. El proyecto cuenta con una estructura base existente que incluye los componentes `Search`, `WeatherCard` y `Forecast`, así como un servicio `weatherService.js`. El backend en Laravel actúa como capa de soporte opcional (autenticación, favoritos), pero la consulta climática principal se realiza desde el frontend React.

## Glossary

- **Weather_App**: La aplicación React que consulta y muestra información climática.
- **Search_Component**: El componente React responsable de recibir el nombre de una ciudad del usuario y disparar la búsqueda.
- **WeatherCard_Component**: El componente React que muestra los datos climáticos actuales de una ciudad.
- **Forecast_Component**: El componente React que muestra el pronóstico extendido de días futuros.
- **WeatherService**: El módulo JavaScript (`weatherService.js`) que encapsula las llamadas HTTP a la WeatherAPI.
- **WeatherAPI**: El servicio externo `api.weatherapi.com` que provee datos climáticos en tiempo real.
- **Current_Weather**: El conjunto de datos climáticos del momento presente para una ciudad: temperatura, sensación térmica, condición, humedad y velocidad del viento.
- **City_Query**: El texto ingresado por el usuario para identificar una ciudad a consultar.
- **API_Key**: La clave de autenticación requerida por WeatherAPI para autorizar las solicitudes.

---

## Requirements

### Requirement 1: Búsqueda de ciudad

**User Story:** Como usuario, quiero ingresar el nombre de una ciudad en un campo de texto y ejecutar la búsqueda, para poder consultar el clima de cualquier ciudad del mundo.

#### Acceptance Criteria

1. THE Search_Component SHALL renderizar un campo de texto y un botón de búsqueda visibles en la interfaz.
2. WHEN el usuario escribe texto en el campo de búsqueda y presiona la tecla Enter, THE Search_Component SHALL invocar la función de búsqueda con el valor ingresado.
3. WHEN el usuario hace clic en el botón de búsqueda, THE Search_Component SHALL invocar la función de búsqueda con el valor ingresado.
4. IF el campo de texto está vacío al momento de ejecutar la búsqueda, THEN THE Search_Component SHALL mostrar el mensaje "Escribe una ciudad" sin realizar ninguna llamada a la WeatherAPI.
5. WHEN la búsqueda se ejecuta exitosamente, THE Search_Component SHALL limpiar el campo de texto.

---

### Requirement 2: Consulta de datos climáticos actuales

**User Story:** Como usuario, quiero ver los datos climáticos actuales de la ciudad buscada, para tomar decisiones informadas sobre mi día.

#### Acceptance Criteria

1. WHEN el usuario ejecuta una búsqueda con un nombre de ciudad válido, THE WeatherService SHALL realizar una solicitud HTTP GET al endpoint `current.json` de la WeatherAPI incluyendo la API_Key y el City_Query como parámetros.
2. WHEN la WeatherAPI devuelve una respuesta exitosa, THE WeatherCard_Component SHALL mostrar la temperatura actual en grados Celsius.
3. WHEN la WeatherAPI devuelve una respuesta exitosa, THE WeatherCard_Component SHALL mostrar la sensación térmica en grados Celsius.
4. WHEN la WeatherAPI devuelve una respuesta exitosa, THE WeatherCard_Component SHALL mostrar la condición del clima en texto descriptivo.
5. WHEN la WeatherAPI devuelve una respuesta exitosa, THE WeatherCard_Component SHALL mostrar el porcentaje de humedad.
6. WHEN la WeatherAPI devuelve una respuesta exitosa, THE WeatherCard_Component SHALL mostrar la velocidad del viento en kilómetros por hora.
7. WHEN la WeatherAPI devuelve una respuesta exitosa, THE WeatherCard_Component SHALL mostrar el nombre de la ciudad y el país.

---

### Requirement 3: Manejo de errores y ciudad no encontrada

**User Story:** Como usuario, quiero recibir mensajes claros cuando la ciudad no existe o hay un problema de conexión, para entender qué ocurrió y poder corregir mi búsqueda.

#### Acceptance Criteria

1. IF la WeatherAPI devuelve un error de ciudad no encontrada (código HTTP 400 o código de error 1006), THEN THE Weather_App SHALL mostrar el mensaje "Ciudad no encontrada" en la interfaz.
2. IF la WeatherAPI devuelve un error de autenticación (código HTTP 401 o 403), THEN THE Weather_App SHALL mostrar el mensaje "Error de autenticación con el servicio de clima".
3. IF ocurre un error de red o la WeatherAPI no responde, THEN THE Weather_App SHALL mostrar el mensaje "No se pudo conectar con el servicio de clima. Intenta de nuevo.".
4. WHEN se muestra un mensaje de error, THE Weather_App SHALL ocultar cualquier dato climático previo que estuviera visible.
5. WHEN se ejecuta una nueva búsqueda exitosa, THE Weather_App SHALL limpiar el mensaje de error previo.

---

### Requirement 4: Indicador de carga

**User Story:** Como usuario, quiero ver una indicación visual mientras se consulta el clima, para saber que la aplicación está procesando mi solicitud.

#### Acceptance Criteria

1. WHEN el WeatherService inicia una solicitud a la WeatherAPI, THE Weather_App SHALL mostrar un indicador de carga visible en la interfaz.
2. WHEN la WeatherAPI devuelve una respuesta (exitosa o con error), THE Weather_App SHALL ocultar el indicador de carga.
3. WHILE el indicador de carga está visible, THE Search_Component SHALL deshabilitar el botón de búsqueda para evitar solicitudes duplicadas.

---

### Requirement 5: Integración con WeatherService

**User Story:** Como desarrollador, quiero que toda la lógica de comunicación con la WeatherAPI esté encapsulada en el WeatherService, para mantener los componentes desacoplados de los detalles de la API.

#### Acceptance Criteria

1. THE WeatherService SHALL exponer una función `getWeather` que acepte un City_Query como parámetro y retorne los datos de Current_Weather.
2. THE WeatherService SHALL incluir la API_Key en cada solicitud a la WeatherAPI sin exponerla directamente en los componentes React.
3. IF la WeatherAPI retorna un código de respuesta HTTP distinto de 200, THEN THE WeatherService SHALL lanzar un error con un mensaje descriptivo que identifique el tipo de fallo.
4. THE WeatherService SHALL utilizar la librería `axios` para realizar las solicitudes HTTP.

---

### Requirement 6: Geolocalización del usuario

**User Story:** Como usuario, quiero poder consultar el clima de mi ubicación actual sin escribir una ciudad, para obtener información climática de forma rápida.

#### Acceptance Criteria

1. THE Weather_App SHALL mostrar un botón o control que permita al usuario solicitar el clima de su ubicación actual.
2. WHEN el usuario activa la geolocalización y el navegador concede el permiso, THE Weather_App SHALL obtener las coordenadas de latitud y longitud del dispositivo y consultar el clima correspondiente a esas coordenadas.
3. IF el navegador deniega el permiso de geolocalización, THEN THE Weather_App SHALL mostrar el mensaje "Permiso de ubicación denegado".
4. IF el navegador no soporta la API de geolocalización, THEN THE Weather_App SHALL ocultar el control de geolocalización.
