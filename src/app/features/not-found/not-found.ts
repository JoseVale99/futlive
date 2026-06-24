import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-linear-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 px-4">
      <div class="text-center max-w-md">
        <div class="relative inline-block mb-6 motion-safe:animate-fade-in">
          <span class="text-[120px] font-black text-gray-200 dark:text-gray-800 leading-none select-none">404</span>
          <span class="absolute inset-0 flex items-center justify-center text-5xl animate-bounce">⚽</span>
        </div>
        <h1 class="text-2xl font-black text-gray-900 dark:text-white mb-2 motion-safe:animate-fade-in">¡Fuera de juego!</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-8 motion-safe:animate-fade-in">La página que buscas no existe o fue movida a otra cancha.</p>
        <a routerLink="/" class="inline-flex items-center gap-2 px-6 py-3 bg-linear-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95 transition-transform motion-safe:animate-fade-in">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
          </svg>
          Volver al inicio
        </a>
      </div>
    </div>
  `,
})
export class NotFoundComponent {}
