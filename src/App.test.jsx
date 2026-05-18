import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import App from './App';
import { WeatherServiceError } from './services/weatherService';

// Mock weatherService
vi.mock('./services/weatherService', () => ({
  getWeather: vi.fn(),
  WeatherServiceError: class WeatherServiceError extends Error {
    constructor(type, message) {
      super(message);
      this.type = type;
      this.name = 'WeatherServiceError';
    }
  },
}));

// Mock Search component to simplify App testing in isolation
vi.mock('./components/Search', () => ({
  default: ({ onSearch, loading }) => (
    <button
      data-testid="search-btn"
      onClick={() => onSearch('test-city')}
      disabled={loading}
    >
      Search
    </button>
  ),
}));

// Mock WeatherCard component
vi.mock('./components/WeatherCard', () => ({
  default: ({ data }) =>
    data ? <div data-testid="weather-card">{data.location.name}</div> : null,
}));

import { getWeather } from './services/weatherService';

// Generators
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
        icon: fc.constant('//cdn.weatherapi.com/weather/64x64/day/116.png'),
        code: fc.integer({ min: 1000, max: 1300 }),
      }),
    }),
  });

const arbitraryCoordinates = () =>
  fc.record({
    latitude: fc.float({ min: -90, max: 90 }),
    longitude: fc.float({ min: -180, max: 180 }),
  });

beforeEach(() => {
  vi.clearAllMocks();
});

describe('App unit tests', () => {
  // Task 6.2: Loading spinner is visible while a request is pending (Req 4.1)
  test('El indicador de carga es visible durante una solicitud activa (Req 4.1)', async () => {
    // Use a never-resolving promise so the spinner stays visible
    getWeather.mockReturnValueOnce(new Promise(() => {}));

    render(<App />);

    await act(async () => {
      screen.getByTestId('search-btn').click();
    });

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  // Task 6.3: Geolocation button is visible when navigator.geolocation is defined (Req 6.1)
  test('App muestra el botón de geolocalización cuando el navegador lo soporta (Req 6.1)', () => {
    Object.defineProperty(global.navigator, 'geolocation', {
      value: { getCurrentPosition: vi.fn() },
      configurable: true,
      writable: true,
    });

    render(<App />);

    expect(screen.getByText('Mi ubicación')).toBeInTheDocument();
  });

  // Task 6.4: Geolocation button is hidden when navigator.geolocation is undefined (Req 6.4)
  test('App oculta el botón de geolocalización cuando navigator.geolocation es undefined (Req 6.4)', () => {
    Object.defineProperty(global.navigator, 'geolocation', {
      value: undefined,
      configurable: true,
      writable: true,
    });

    render(<App />);

    expect(screen.queryByText('Mi ubicación')).not.toBeInTheDocument();
  });

  // Task 6.5: "Permiso de ubicación denegado" shown when geolocation permission is denied (Req 6.3)
  test('App muestra "Permiso de ubicación denegado" cuando se deniega el permiso (Req 6.3)', async () => {
    Object.defineProperty(global.navigator, 'geolocation', {
      value: {
        getCurrentPosition: vi.fn((_success, error) => {
          error({ code: 1, message: 'User denied Geolocation' });
        }),
      },
      configurable: true,
      writable: true,
    });

    render(<App />);

    await act(async () => {
      screen.getByText('Mi ubicación').click();
    });

    expect(screen.getByText('Permiso de ubicación denegado')).toBeInTheDocument();
  });

  // Task 6.7: "Ciudad no encontrada" shown when service throws NOT_FOUND (Req 3.1)
  test('App muestra "Ciudad no encontrada" cuando el servicio lanza NOT_FOUND (Req 3.1)', async () => {
    getWeather.mockRejectedValueOnce(
      new WeatherServiceError('NOT_FOUND', 'Ciudad no encontrada')
    );

    render(<App />);

    await act(async () => {
      screen.getByTestId('search-btn').click();
    });

    await waitFor(() => {
      expect(screen.getByText('Ciudad no encontrada')).toBeInTheDocument();
    });
  });

  // Task 6.8: "Error de autenticación con el servicio de clima" shown when service throws AUTH_ERROR (Req 3.2)
  test('App muestra "Error de autenticación con el servicio de clima" cuando el servicio lanza AUTH_ERROR (Req 3.2)', async () => {
    getWeather.mockRejectedValueOnce(
      new WeatherServiceError('AUTH_ERROR', 'Error de autenticación con el servicio de clima')
    );

    render(<App />);

    await act(async () => {
      screen.getByTestId('search-btn').click();
    });

    await waitFor(() => {
      expect(screen.getByText('Error de autenticación con el servicio de clima')).toBeInTheDocument();
    });
  });

  // Task 6.9: Network error message shown when service throws NETWORK_ERROR (Req 3.3)
  test('App muestra "No se pudo conectar con el servicio de clima. Intenta de nuevo." cuando el servicio lanza NETWORK_ERROR (Req 3.3)', async () => {
    getWeather.mockRejectedValueOnce(
      new WeatherServiceError('NETWORK_ERROR', 'No se pudo conectar con el servicio de clima. Intenta de nuevo.')
    );

    render(<App />);

    await act(async () => {
      screen.getByTestId('search-btn').click();
    });

    await waitFor(() => {
      expect(
        screen.getByText('No se pudo conectar con el servicio de clima. Intenta de nuevo.')
      ).toBeInTheDocument();
    });
  });
});

describe('App property tests', () => {
  // Feature: weather-app-react, Property 6: Los errores de WeatherAPI se mapean al mensaje de usuario correcto
  // Validates: Requirements 3.1, 3.2, 3.3
  test('Property 6: Los errores de WeatherAPI se mapean al mensaje de usuario correcto', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          { type: 'NOT_FOUND', message: 'Ciudad no encontrada' },
          { type: 'AUTH_ERROR', message: 'Error de autenticación con el servicio de clima' },
          { type: 'NETWORK_ERROR', message: 'No se pudo conectar con el servicio de clima. Intenta de nuevo.' }
        ),
        async ({ type, message }) => {
          vi.clearAllMocks();

          getWeather.mockRejectedValueOnce(new WeatherServiceError(type, message));

          const { unmount } = render(<App />);

          await act(async () => {
            screen.getByTestId('search-btn').click();
          });

          await waitFor(() => {
            expect(screen.getByText(message)).toBeInTheDocument();
          });

          unmount();
        }
      ),
      { numRuns: 50 }
    );
  });

  // Feature: weather-app-react, Property 7: Un error oculta los datos climáticos previos
  // Validates: Requirements 3.4
  test('Property 7: Un error oculta los datos climáticos previos', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryWeatherData(), async (weatherData) => {
        const errorTypes = ['NOT_FOUND', 'AUTH_ERROR', 'NETWORK_ERROR'];
        const errorMessages = {
          NOT_FOUND: 'Ciudad no encontrada',
          AUTH_ERROR: 'Error de autenticación con el servicio de clima',
          NETWORK_ERROR: 'No se pudo conectar con el servicio de clima. Intenta de nuevo.',
        };

        for (const errorType of errorTypes) {
          vi.clearAllMocks();

          // First call resolves with weather data so WeatherCard is shown
          getWeather.mockResolvedValueOnce(weatherData);

          const { unmount } = render(<App />);

          // Trigger first search to show weather data
          await act(async () => {
            screen.getByTestId('search-btn').click();
          });

          // WeatherCard should be visible
          await waitFor(() => {
            expect(screen.getByTestId('weather-card')).toBeInTheDocument();
          });

          // Second call rejects with a WeatherServiceError
          getWeather.mockRejectedValueOnce(
            new WeatherServiceError(errorType, errorMessages[errorType])
          );

          // Trigger second search to cause an error
          await act(async () => {
            screen.getByTestId('search-btn').click();
          });

          // WeatherCard should no longer be in the DOM
          await waitFor(() => {
            expect(screen.queryByTestId('weather-card')).not.toBeInTheDocument();
          });

          unmount();
        }
      }),
      { numRuns: 50 }
    );
  });

  // Feature: weather-app-react, Property 8: Una búsqueda exitosa limpia el mensaje de error previo
  // Validates: Requirements 3.5
  test('Property 8: Una búsqueda exitosa limpia el mensaje de error previo', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryWeatherData(), async (weatherData) => {
        vi.clearAllMocks();

        // First call rejects so an error message is shown
        getWeather.mockRejectedValueOnce(
          new WeatherServiceError('NOT_FOUND', 'Ciudad no encontrada')
        );

        const { unmount } = render(<App />);

        // Trigger first search to show error
        await act(async () => {
          screen.getByTestId('search-btn').click();
        });

        // Error message should be visible
        await waitFor(() => {
          expect(screen.getByRole('alert')).toBeInTheDocument();
        });

        // Second call resolves successfully
        getWeather.mockResolvedValueOnce(weatherData);

        // Trigger second search to clear the error
        await act(async () => {
          screen.getByTestId('search-btn').click();
        });

        // Error message should be gone
        await waitFor(() => {
          expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        });

        unmount();
      }),
      { numRuns: 50 }
    );
  });

  // Feature: weather-app-react, Property 10: El indicador de carga desaparece tras cualquier respuesta
  // Validates: Requirements 4.2
  test('Property 10: El indicador de carga desaparece tras cualquier respuesta', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          arbitraryWeatherData().map((data) => ({ type: 'success', data })),
          fc.constantFrom(
            { type: 'error', errorType: 'NOT_FOUND', message: 'Ciudad no encontrada' },
            { type: 'error', errorType: 'AUTH_ERROR', message: 'Error de autenticación con el servicio de clima' },
            { type: 'error', errorType: 'NETWORK_ERROR', message: 'No se pudo conectar con el servicio de clima. Intenta de nuevo.' }
          )
        ),
        async (scenario) => {
          vi.clearAllMocks();

          if (scenario.type === 'success') {
            getWeather.mockResolvedValueOnce(scenario.data);
          } else {
            getWeather.mockRejectedValueOnce(
              new WeatherServiceError(scenario.errorType, scenario.message)
            );
          }

          const { unmount } = render(<App />);

          // Trigger search
          await act(async () => {
            screen.getByTestId('search-btn').click();
          });

          // Spinner should not be visible after the promise resolves
          await waitFor(() => {
            expect(screen.queryByRole('status')).not.toBeInTheDocument();
          });

          unmount();
        }
      ),
      { numRuns: 50 }
    );
  });

  // Feature: weather-app-react, Property 12: La geolocalización usa las coordenadas del dispositivo como query
  // Validates: Requirements 6.2
  test('Property 12: La geolocalización usa las coordenadas del dispositivo como query', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryCoordinates(), async ({ latitude, longitude }) => {
        vi.clearAllMocks();

        // Mock navigator.geolocation
        const mockGetCurrentPosition = vi.fn((successCallback) => {
          successCallback({ coords: { latitude, longitude } });
        });

        Object.defineProperty(global.navigator, 'geolocation', {
          value: { getCurrentPosition: mockGetCurrentPosition },
          configurable: true,
          writable: true,
        });

        // getWeather resolves so the test doesn't hang
        getWeather.mockResolvedValueOnce({
          location: { name: 'Test', country: 'TC' },
          current: {
            temp_c: 20,
            feelslike_c: 18,
            humidity: 50,
            wind_kph: 10,
            condition: { text: 'Sunny', icon: '//cdn.weatherapi.com/weather/64x64/day/113.png', code: 1000 },
          },
        });

        const { unmount } = render(<App />);

        // Click the geolocation button
        const geoBtn = screen.getByText('Mi ubicación');
        await act(async () => {
          geoBtn.click();
        });

        // getWeather should have been called with "lat,lon" format
        await waitFor(() => {
          expect(getWeather).toHaveBeenCalledWith(`${latitude},${longitude}`);
        });

        unmount();
      }),
      { numRuns: 50 }
    );
  });
});
