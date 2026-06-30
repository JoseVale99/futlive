import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0a0e17] px-4">
      <div class="text-center max-w-sm">
        <!-- Cancha mini con balón -->
        <div class="relative w-48 h-48 mx-auto mb-8 motion-safe:animate-fade-in">
          <!-- Campo -->
          <div class="absolute inset-4 rounded-xl border-2 border-green-500/30 bg-green-900/10"></div>
          <div class="absolute left-4 right-4 top-1/2 h-px bg-green-500/30"></div>
          <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full border-2 border-green-500/30"></div>
          <!-- 404 -->
          <div class="absolute inset-0 flex items-center justify-center">
            <span class="text-6xl font-black text-gray-200 dark:text-gray-700 select-none">404</span>
          </div>
          <!-- Balón animado -->
          <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 animate-bounce">
            <div class="w-12 h-12 bg-white dark:bg-gray-200 rounded-full shadow-lg flex items-center justify-center">
              <svg class="w-8 h-8 text-gray-800" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 3.3l1.35-.95c1.82.56 3.37 1.76 4.38 3.34l-.39 1.34-1.35.46L13 7.45V5.3zm-3.35-.95L11 5.3v2.15L7.01 9.49l-1.35-.46-.39-1.34c1.01-1.58 2.56-2.78 4.38-3.34zM7.08 17.11l-1.14.1C4.73 15.81 4 13.99 4 12c0-.12.01-.23.02-.35l1-.73 1.38.48 1.46 4.34-.78 1.37zm7.42 2.48c-.79.26-1.63.41-2.5.41s-1.71-.15-2.5-.41l-.69-1.49.64-1.1h5.11l.64 1.11-.7 1.48zM14.27 15H9.73l-1.35-4.02L12 8.44l3.63 2.54L14.27 15zm3.79 2.21l-1.14-.1-.78-1.37 1.46-4.34 1.38-.48 1 .73c.01.12.02.23.02.35 0 1.99-.73 3.81-1.94 5.21z"/>
              </svg>
            </div>
          </div>
        </div>

        <h1 class="text-2xl font-black text-gray-900 dark:text-white mb-2 motion-safe:animate-fade-in">
          ¡Fuera de juego!
        </h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-8 motion-safe:animate-fade-in leading-relaxed">
          Esta página no existe o el partido ya terminó y fue retirado del calendario.
        </p>
        <a routerLink="/" class="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-green-600/20 hover:shadow-green-600/30 transition-all hover:scale-105 active:scale-95 motion-safe:animate-fade-in">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
          </svg>
          Ir a partidos en vivo
        </a>
      </div>
    </div>
  `,
})
export class NotFoundComponent {}
