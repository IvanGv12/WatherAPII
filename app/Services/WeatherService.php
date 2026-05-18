<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class WeatherService
{
    protected string $apiKey;
    protected string $baseUrl;

    public function __construct()
    {
        $this->apiKey = config('services.openweathermap.key');
        $this->baseUrl = config('services.openweathermap.base_url');
    }

    /**
     * Obtiene los datos del clima actual.
     * @param string $lat Latitud.
     * @param string $lon Longitud.
     * @return array
     */
    public function getCurrentWeather(string $lat, string $lon): array
    {
        $response = Http::baseUrl($this->baseUrl)
            ->get('weather', [
                'lat' => $lat,
                'lon' => $lon,
                'appid' => $this->apiKey,
                'units' => 'metric', // Para Celsius
                'lang'  => 'es',
            ]);

        // Manejo de errores
        if ($response->failed()) {
            // Logear el error o lanzar una excepción
            return []; 
        }

        return $response->json();
    }

    /**
     * Obtiene el pronóstico extendido (ej. 5 días / 3 horas).
     * @param string $lat Latitud.
     * @param string $lon Longitud.
     * @return array
     */
    public function getForecast(string $lat, string $lon): array
    {
        // En OpenWeatherMap, el endpoint 'forecast' da el pronóstico de 5 días/3 horas
        $response = Http::baseUrl($this->baseUrl)
            ->get('forecast', [
                'lat' => $lat,
                'lon' => $lon,
                'appid' => $this->apiKey,
                'units' => 'metric',
                'lang'  => 'es',
            ]);

        if ($response->failed()) {
            return [];
        }

        return $response->json();
    }
}
