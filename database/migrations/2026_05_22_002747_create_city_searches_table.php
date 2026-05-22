<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('city_searches', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')
                ->constrained()
                ->onDelete('cascade');

            $table->string('city');

            $table->string('country')->nullable();

            $table->float('temperature')->nullable();

            $table->text('weather_description')->nullable();

            $table->timestamp('searched_at');

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('city_searches');
    }
};