import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="min-h-[80vh] flex items-center justify-center bg-gray-50 dark:bg-[#0a0e17] px-4">
      <div class="text-center max-w-md motion-safe:animate-fade-in">
        <!-- Cancha visual -->
        <div class="relative w-56 h-56 mx-auto mb-10">
          <div class="absolute inset-0 rounded-2xl bg-gradient-to-b from-green-900/20 to-green-800/5 border border-green-500/20 backdrop-blur-sm"></div>
          <div class="absolute inset-5 rounded-xl border border-green-500/25"></div>
          <div class="absolute left-5 right-5 top-1/2 h-px bg-green-500/25"></div>
          <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full border border-green-500/25"></div>
          <div class="absolute top-5 left-1/2 -translate-x-1/2 w-20 h-8 border border-green-500/20 border-t-0 rounded-b-lg"></div>
          <div class="absolute bottom-5 left-1/2 -translate-x-1/2 w-20 h-8 border border-green-500/20 border-b-0 rounded-t-lg"></div>

          <!-- 404 grande -->
          <div class="absolute inset-0 flex items-center justify-center">
            <span class="text-7xl font-black text-gray-200/80 dark:text-gray-700/80 select-none tracking-tight">
              4<span class="inline-block motion-safe:animate-bounce">⚽</span>4
            </span>
          </div>
        </div>

        <h1 class="text-3xl font-black text-gray-900 dark:text-white mb-3">
          ¡Fuera de juego!
        </h1>
        <p class="text-base text-gray-500 dark:text-gray-400 mb-10 leading-relaxed max-w-xs mx-auto">
          Esta página no existe o el partido ya terminó y fue retirado del calendario.
        </p>

        <div class="flex flex-col sm:flex-row items-center justify-center gap-3">
          <a routerLink="/" class="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-green-600/20 hover:shadow-green-600/30 transition-all hover:scale-105 active:scale-95">
            <span class="material-symbols-outlined text-lg">sports_soccer</span>
            Ir a partidos en vivo
          </a>
          <a routerLink="/posiciones" class="inline-flex items-center gap-2 px-6 py-3 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl font-semibold text-sm transition-colors">
            <span class="material-symbols-outlined text-lg">leaderboard</span>
            Ver posiciones
          </a>
        </div>
      </div>
    </div>
  `,
})
export class NotFoundComponent {}
