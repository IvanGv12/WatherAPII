<x-app-layout>
    <x-slot name="header">
        <h2 class="font-semibold text-xl text-gray-800 leading-tight">
            Consulta de Clima en Tiempo Real
        </h2>
    </x-slot>

    <div class="py-12">
        <div class="max-w-7xl mx-auto sm:px-6 lg:px-8">
            <div class="bg-white overflow-hidden shadow-2xl sm:rounded-xl p-8">
                
                <form action="{{ route('dashboard') }}" method="GET" class="mb-10">
                    <div class="flex shadow-lg rounded-xl">
                        <input type="text" name="city" placeholder="Buscar ciudad (ej: Londres, CDMX, Tokyo)" 
                               value="{{ $cityName }}"
                               class="flex-1 border-none focus:ring-0 focus:outline-none rounded-l-xl p-4 text-gray-700 text-lg">
                        <button type="submit" class="px-6 py-4 bg-indigo-600 border border-transparent rounded-r-xl font-semibold text-white uppercase tracking-wider hover:bg-indigo-700 transition duration-200">
                            Buscar Clima
                        </button>
                    </div>
                </form>

                @if ($api_error)
                    <div class="p-4 mb-8 text-lg text-red-700 bg-red-100 border-l-4 border-red-500 rounded-lg" role="alert">
                        {{ $api_error }}
                    </div>
                @elseif (empty($current) && $cityName)
                    <p class="text-center text-xl text-gray-500 mt-10">
                        Ingresa el nombre de una ciudad para comenzar a consultar el clima.
                    </p>
                @elseif (!empty($current))
                    <h3 class="text-4xl font-extrabold text-gray-900 mb-2 border-b pb-2">
                        Clima en {{ $current['name'] }}, {{ $current['sys']['country'] }}
                    </h3>
                    <p class="text-sm text-gray-500 mb-8">
                        Última actualización: {{ \Carbon\Carbon::now()->format('H:i') }}
                    </p>

                    <div class="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-10">
                        
                        <div class="lg:col-span-2 flex items-center p-8 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-xl shadow-lg">
                            <div>
                                @php $icon = $current['weather'][0]['icon']; @endphp
                                <img src="https://openweathermap.org/img/wn/{{ $icon }}@4x.png" 
                                     alt="Icono Clima" class="w-24 h-24 float-left mr-4">
                            </div>
                            <div>
                                <p class="text-8xl font-black">
                                    {{ round($current['main']['temp']) }}°C
                                </p>
                                <p class="text-3xl font-semibold capitalize mt-1">
                                    {{ $current['weather'][0]['description'] }}
                                </p>
                                <p class="text-lg opacity-75">Sensación Térmica: {{ round($current['main']['feels_like']) }}°C</p>
                            </div>
                        </div>

                        <div class="p-6 bg-gray-50 border border-gray-200 rounded-xl shadow-md space-y-2">
                            <h4 class="text-lg font-bold text-gray-700 mb-3 border-b pb-2">Detalles Adicionales</h4>
                            <div class="flex justify-between"><span class="font-medium">Viento:</span> <span class="text-gray-600">{{ $current['wind']['speed'] }} m/s</span></div>
                            <div class="flex justify-between"><span class="font-medium">Humedad:</span> <span class="text-gray-600">{{ $current['main']['humidity'] }}%</span></div>
                            <div class="flex justify-between"><span class="font-medium">Presión:</span> <span class="text-gray-600">{{ $current['main']['pressure'] }} hPa</span></div>
                            <div class="flex justify-between"><span class="font-medium">Visibilidad:</span> <span class="text-gray-600">{{ number_format($current['visibility'] / 1000, 1) }} km</span></div>
                        </div>

                        <div class="p-6 bg-gray-50 border border-gray-200 rounded-xl shadow-md space-y-2">
                            <h4 class="text-lg font-bold text-gray-700 mb-3 border-b pb-2">Ubicación y Tiempo</h4>
                            <div class="flex justify-between"><span class="font-medium">Latitud:</span> <span class="text-gray-600">{{ $current['coord']['lat'] }}</span></div>
                            <div class="flex justify-between"><span class="font-medium">Longitud:</span> <span class="text-gray-600">{{ $current['coord']['lon'] }}</span></div>
                            <div class="flex justify-between"><span class="font-medium">Amanecer:</span> <span class="text-gray-600">{{ \Carbon\Carbon::createFromTimestamp($current['sys']['sunrise'])->setTimezone(isset($current['timezone']) ? $current['timezone'] : 'UTC')->format('H:i') }}</span></div>
                            <div class="flex justify-between"><span class="font-medium">Atardecer:</span> <span class="text-gray-600">{{ \Carbon\Carbon::createFromTimestamp($current['sys']['sunset'])->setTimezone(isset($current['timezone']) ? $current['timezone'] : 'UTC')->format('H:i') }}</span></div>
                        </div>
                    </div>

                    <h3 class="text-2xl font-bold text-gray-800 mb-4 border-b pb-2">Pronóstico de 5 Días</h3>
                    @if (!empty($forecast) && isset($forecast['list']))
                        @php
                            // Agrupamos la lista de 3 horas por día, tomando el primer registro como resumen diario
                            $dailyForecasts = collect($forecast['list'])->groupBy(function ($item) {
                                return \Carbon\Carbon::parse($item['dt_txt'])->format('Y-m-d');
                            })->take(5);
                        @endphp
                        
                        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                            @foreach ($dailyForecasts as $date => $hourlyData)
                                <div class="p-4 border border-gray-200 rounded-xl text-center shadow-md hover:shadow-lg transition duration-150">
                                    <h4 class="font-bold text-lg mb-1 text-indigo-600">{{ \Carbon\Carbon::parse($date)->locale('es')->dayName }}</h4>
                                    <p class="text-sm text-gray-500 mb-2">{{ \Carbon\Carbon::parse($date)->format('d M') }}</p>
                                    
                                    @php $daySummary = $hourlyData->first(); @endphp
                                    <img src="https://openweathermap.org/img/wn/{{ $daySummary['weather'][0]['icon'] }}@2x.png" 
                                         alt="{{ $daySummary['weather'][0]['description'] }}" class="mx-auto w-16 h-16">
                                    
                                    <p class="text-xl font-extrabold text-red-600 mt-1">{{ round($daySummary['main']['temp_max']) }}°C</p>
                                    <p class="text-xs text-gray-700 capitalize">{{ $daySummary['weather'][0]['description'] }}</p>
                                </div>
                            @endforeach
                        </div>
                    @else
                        <p class="text-gray-500">No se pudo obtener el pronóstico extendido.</p>
                    @endif
                @endif
            </div>
        </div>
    </div>
</x-app-layout>