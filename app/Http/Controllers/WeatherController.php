<?php

namespace App\Http\Controllers;

use App\Services\WeatherService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
// No es necesario importar App\Http\Controllers\Controller si ya estás en ese namespace

class WeatherController extends Controller
{
    protected WeatherService $weatherService;

    public function __construct(WeatherService $weatherService)
    {
        
        $this->weatherService = $weatherService;
    }

    public function showWeather(Request $request)
    {
        // Usamos la ciudad por defecto para la primera carga.
        $cityName = $request->input('city', 'Sombrerete, Zacatecas');

        $currentWeather = [];
        $forecast = [];
        $apiError = null;

        if ($cityName) {
            try {
                // 1. Obtener el clima actual por nombre de ciudad
                $currentWeather = $this->getWeatherByName($cityName);

                // 2. Verificar si la API devolvió datos válidos y no un error
                if (isset($currentWeather['coord'])) {
                    $lat = $currentWeather['coord']['lat'];
                    $lon = $currentWeather['coord']['lon'];

                    // 3. Obtener el pronóstico usando las coordenadas
                    $forecast = $this->weatherService->getForecast($lat, $lon);
                } elseif (isset($currentWeather['cod']) && $currentWeather['cod'] == '404') {
                    // Manejo específico si la API devuelve 404 (Ciudad no encontrada)
                    $apiError = 'La ciudad "' . $cityName . '" no fue encontrada. Intente con otro nombre.';
                } else {
                    // Error general de la API (clave inválida, etc.)
                    $apiError = 'Error de conexión con el servicio de clima o clave de API inválida.';
                }

            } catch (\Exception $e) {
                // Capturar errores de red o excepciones internas de Laravel/PHP
                $apiError = 'Error interno del servidor al consultar el clima.';
                // Recomendación: \Log::error('Weather API Error: ' . $e->getMessage());
            }
        }

        return view('weather.dashboard', [
            'cityName'  => $cityName,
            'current'   => $currentWeather,
            'forecast'  => $forecast,
            'api_error' => $apiError,
        ]);
    }

    protected function getWeatherByName(string $cityName): array
    {
        // El endpoint 'weather' con parámetro 'q' (query)
        $response = Http::baseUrl(config('services.openweathermap.base_url'))
            ->get('weather', [
                'q'     => $cityName,
                'appid' => config('services.openweathermap.key'),
                'units' => 'metric',
                'lang'  => 'es',
            ]);

        // Devolvemos el JSON de la respuesta. 
        // Si el código HTTP no es 200, OpenWeatherMap devuelve un JSON con 'cod' y 'message'.
        // Esto permite manejar el error 404 en el método showWeather.
        return $response->json();
    }
}