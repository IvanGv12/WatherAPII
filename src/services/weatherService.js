import axios from "axios";

export class WeatherServiceError extends Error {
  /**
   * @param {"NOT_FOUND" | "AUTH_ERROR" | "NETWORK_ERROR"} type
   * @param {string} message
   */
  constructor(type, message) {
    super(message);
    this.type = type;
    this.name = "WeatherServiceError";
  }
}

export async function getWeather(query) {
  try {
    const response = await axios.get(
      "https://api.weatherapi.com/v1/current.json",
      {
        params: {
          key: import.meta.env.VITE_WEATHER_API_KEY,
          q: query,
        },
      }
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
        throw new WeatherServiceError(
          "AUTH_ERROR",
          "Error de autenticación con el servicio de clima"
        );
      }
    }
    throw new WeatherServiceError(
      "NETWORK_ERROR",
      "No se pudo conectar con el servicio de clima. Intenta de nuevo."
    );
  }
}
