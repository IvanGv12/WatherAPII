// Feature: weather-app-react, Property 11: getWeather lanza WeatherServiceError para cualquier HTTP no-200
// Feature: weather-app-react, Property 5: Cada solicitud incluye la API Key y el city query
import { describe, test, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import axios from 'axios';
import { getWeather, WeatherServiceError } from './weatherService';

vi.mock('axios');

describe('weatherService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Property 5: Cada solicitud al servicio incluye la API Key y el city query
   * Validates: Requirements 2.1, 5.1, 5.2
   *
   * Para cualquier string de consulta, cuando getWeather(query) es invocado,
   * la llamada HTTP realizada por axios debe incluir la API_Key como parámetro `key`
   * y el `query` como parámetro `q`.
   */
  test('Property 5: every request includes the API Key and city query as params', async () => {
    const TEST_API_KEY = 'test-api-key';
    import.meta.env.VITE_WEATHER_API_KEY = TEST_API_KEY;

    const successResponse = {
      data: {
        location: { name: 'London', country: 'UK', lat: 51.5, lon: -0.1 },
        current: {
          temp_c: 15,
          feelslike_c: 13,
          humidity: 70,
          wind_kph: 10,
          condition: { text: 'Sunny', icon: '//cdn.weatherapi.com/...', code: 1000 },
        },
      },
    };

    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary non-empty query strings (city names or coordinates)
        fc.string({ minLength: 1 }),
        async (query) => {
          axios.get.mockResolvedValueOnce(successResponse);

          await getWeather(query);

          // Verify axios.get was called with the correct params
          const callArgs = axios.get.mock.calls[axios.get.mock.calls.length - 1];
          const params = callArgs[1]?.params;

          if (!params) return false;
          if (params.key !== TEST_API_KEY) return false;
          if (params.q !== query) return false;

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11: getWeather lanza WeatherServiceError para cualquier HTTP no-200
   * Validates: Requirements 5.3
   *
   * Para cualquier código de respuesta HTTP distinto de 200 retornado por la WeatherAPI,
   * getWeather debe lanzar una instancia de WeatherServiceError con un `type` no vacío
   * y un `message` descriptivo no vacío.
   */
  test('Property 11: getWeather throws WeatherServiceError for any non-200 HTTP response', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary HTTP status codes != 200 (covering 4xx, 5xx, and other non-200 codes)
        fc.integer({ min: 100, max: 599 }).filter((s) => s !== 200),
        async (status) => {
          // Mock axios to reject with an HTTP error response for the given status
          const axiosError = {
            response: {
              status,
              data: { error: { code: 9999, message: 'Some API error' } },
            },
          };
          axios.get.mockRejectedValueOnce(axiosError);

          // getWeather must throw a WeatherServiceError
          const thrown = await getWeather('test-city').catch((e) => e);

          // Must be an instance of WeatherServiceError
          if (!(thrown instanceof WeatherServiceError)) {
            return false;
          }

          // type must be a non-empty string
          if (typeof thrown.type !== 'string' || thrown.type.length === 0) {
            return false;
          }

          // message must be a non-empty string
          if (typeof thrown.message !== 'string' || thrown.message.length === 0) {
            return false;
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
