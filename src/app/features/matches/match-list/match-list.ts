import { Component, inject, signal } from '@angular/core';
import { MatchService } from '../../../core/services/match-service';
import { MatchCardComponent } from '../match-card/match-card';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-match-list',
  standalone: true,
  imports: [CommonModule, MatchCardComponent],
  template: `
    <div class="animate-fade-in">
      <!-- Loading State -->
      @if (matchService.loading() && matchService.matches().length === 0) {
        <div class="flex flex-col items-center justify-center py-24">
          <div class="relative">
            <div class="absolute inset-0 bg-blue-500/20 rounded-full blur-xl"></div>
            <div class="relative motion-safe:animate-spin rounded-full h-14 w-14 border-4 border-gray-200 dark:border-gray-700 border-b-blue-600 dark:border-b-blue-500"></div>
          </div>
          <p class="text-gray-600 dark:text-gray-300 font-semibold mt-6 text-lg">Cargando partidos...</p>
        </div>
      }

      <!-- Error State -->
      @if (matchService.error()) {
        <div class="bg-linear-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border border-red-100 dark:border-red-800/50 rounded-3xl p-8 text-center my-8">
          <div class="relative inline-flex items-center justify-center mb-6">
            <div class="absolute inset-0 bg-red-500/20 rounded-full blur-xl"></div>
            <div class="relative bg-red-100 dark:bg-red-900/50 w-16 h-16 rounded-full flex items-center justify-center border border-red-200 dark:border-red-800/50">
              <svg class="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <h3 class="text-gray-900 dark:text-white font-extrabold text-xl mb-2">¡Ups! Algo salió mal</h3>
          <p class="text-red-600 dark:text-red-400 text-sm mb-6 max-w-sm mx-auto">{{ matchService.error() }}</p>
          <button
            (click)="retry()"
            class="bg-linear-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white px-8 py-3.5 rounded-2xl font-bold text-sm transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            Reintentar
          </button>
        </div>
      }

      <!-- Match List -->
      @if (!matchService.error() && matchService.matches().length > 0) {
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl mx-auto">
          @for (match of matchService.matches(); track match.id; let index = $index) {
            <div
              class="motion-safe:animate-slide-up"
              [style.animation-delay]="index < 20 ? index * 60 + 'ms' : '0ms'"
            >
              <app-match-card [match]="match" />
            </div>
          }
        </div>
      }

      <!-- Empty State - Status Specific -->
      @if (!matchService.loading() && !matchService.error() && matchService.matches().length === 0) {
        <div class="text-center py-24">
          <div class="relative inline-flex items-center justify-center mb-8">
            <div class="absolute inset-0 bg-gray-200 dark:bg-gray-700/50 rounded-full blur-2xl"></div>
            <div class="relative bg-gray-100 dark:bg-gray-800 w-24 h-24 rounded-full flex items-center justify-center border border-gray-200 dark:border-gray-700">
              <svg class="w-12 h-12 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>

          @switch (matchService.activeStatus()) {
            @case ('live') {
              <h3 class="text-gray-900 dark:text-white font-extrabold text-2xl mb-3">No hay partidos en vivo</h3>
              <p class="text-gray-500 dark:text-gray-400 text-lg max-w-md mx-auto">No hay partidos jugándose en este momento. ¡Vuelve pronto!</p>
            }
            @case ('scheduled') {
              <h3 class="text-gray-900 dark:text-white font-extrabold text-2xl mb-3">No hay partidos programados</h3>
              <p class="text-gray-500 dark:text-gray-400 text-lg max-w-md mx-auto">No hay partidos programados para hoy. ¡Consulta más tarde!</p>
            }
            @case ('finished') {
              <h3 class="text-gray-900 dark:text-white font-extrabold text-2xl mb-3">No hay partidos finalizados</h3>
              <p class="text-gray-500 dark:text-gray-400 text-lg max-w-md mx-auto">No hay partidos que hayan terminado hoy.</p>
            }
          }
        </div>
      }
    </div>
  `
})
export class MatchListComponent {
  protected readonly matchService = inject(MatchService);

  retry() {
    this.matchService.setStatus(this.matchService.activeStatus());
  }
}
