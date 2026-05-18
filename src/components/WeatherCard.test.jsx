import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import * as fc from 'fast-check';
import WeatherCard from './WeatherCard';

// Clean up DOM between every test (including PBT iterations)
afterEach(() => cleanup());

// ---------------------------------------------------------------------------
// Generator
// ---------------------------------------------------------------------------

/**
 * Generates arbitrary valid WeatherData objects.
 * Feature: weather-app-react, Property 4: WeatherCard renderiza todos los campos requeridos
 */
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

// ---------------------------------------------------------------------------
// Unit test — null data
// ---------------------------------------------------------------------------

describe('WeatherCard — unit tests', () => {
  it('returns null when data is null', () => {
    const { container } = render(<WeatherCard data={null} />);
    expect(container.firstChild).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Property-based tests
// ---------------------------------------------------------------------------

/**
 * Property 4: WeatherCard renderiza todos los campos requeridos
 * Validates: Requirements 2.2, 2.3, 2.4, 2.5, 2.6, 2.7
 */
describe('Property 4 — WeatherCard renders all required fields', () => {
  it(
    'renders city, country, temp, feelslike, condition, humidity and wind for any WeatherData',
    () => {
      fc.assert(
        fc.property(arbitraryWeatherData(), (data) => {
          const { container, unmount } = render(<WeatherCard data={data} />);

          const text = container.textContent;

          // Req 2.2 — city and country in h2
          const h2 = container.querySelector('h2');
          expect(h2).not.toBeNull();
          expect(h2.textContent).toContain(data.location.name);
          expect(h2.textContent).toContain(data.location.country);

          // Req 2.3 — temperature
          expect(text).toContain(String(data.current.temp_c));

          // Req 2.4 — feels like
          expect(text).toContain(String(data.current.feelslike_c));

          // Req 2.5 — condition text
          expect(text).toContain(data.current.condition.text);

          // Req 2.6 — humidity
          expect(text).toContain(String(data.current.humidity));

          // Req 2.7 — wind speed
          expect(text).toContain(String(data.current.wind_kph));

          unmount();
        }),
        { numRuns: 100 }
      );
    },
    30000
  );
});
