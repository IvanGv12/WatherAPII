<?php

use App\Http\Controllers\ProfileController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\FavoriteLocationController; // Mantener si decides usar el CRUD después
use App\Http\Controllers\WeatherController;
use Illuminate\Support\Facades\Auth; // Asegurar que Auth está disponible

/*
|--------------------------------------------------------------------------
| Rutas Web
|--------------------------------------------------------------------------
*/

// Ruta de Bienvenida
Route::get('/', function () {
    return view('welcome');
});

// 1. RUTA PRINCIPAL (DASHBOARD/CLIMA)
// 💡 CORRECCIÓN: Esta ruta está ahora FUERA del grupo 'auth', haciéndola pública.
Route::get('/dashboard', [WeatherController::class, 'showWeather'])->name('dashboard');


/*
|--------------------------------------------------------------------------
| Rutas Protegidas (Middleware 'auth')
|--------------------------------------------------------------------------
*/

Route::middleware(['auth', 'verified'])->group(function () {
    
    // 2. RUTAS DE PERFIL
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
    // 3. RUTAS DE PERFIL
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
    
    // 4. RUTAS DEL CRUD (Si las vas a usar)
    // Si la funcionalidad de CRUD de ubicaciones es secundaria a la búsqueda dinámica, mantenemos esto:
    // Route::resource('locations', FavoriteLocationController::class);

});

// Rutas de Autenticación
require __DIR__.'/auth.php';