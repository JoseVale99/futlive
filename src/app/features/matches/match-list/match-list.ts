import { Component, inject, signal } from '@angular/core';
import { MatchService } from '../../../core/services/match-service';
import { MatchCardComponent } from '../match-card/match-card';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-match-list',
  standalone: true,
  imports: [CommonModule, MatchCardComponent],
  template: `
    <div class="max-w-2xl mx-auto px-4 pb-20 animate-fade-in">
      <!-- Loading State -->
      @if (matchService.loading() && matchService.matches().length === 0) {
        <div class="flex flex-col items-center justify-center py-20">
          <div class="motion-safe:animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p class="text-gray-500 font-medium">Cargando partidos...</p>
        </div>
      }

      <!-- Error State -->
      @if (matchService.error()) {
        <div class="bg-red-50 border border-red-100 rounded-2xl p-6 text-center my-8">
          <div class="bg-red-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 class="text-red-800 font-bold mb-1">¡Ups! Algo salió mal</h3>
          <p class="text-red-600 text-sm mb-4">{{ matchService.error() }}</p>
          <button 
            (click)="retry()"
            class="bg-red-600 text-white px-6 py-2 rounded-xl font-bold text-sm hover:bg-red-700 transition-colors"
          >
            Reintentar
          </button>
        </div>
      }

      <!-- Match List -->
      @if (!matchService.error() && matchService.matches().length > 0) {
        <div class="space-y-4">
          @for (match of matchService.matches(); track match.id; let index = $index) {
            <div 
              class="animate-fade-in"
              [style.animation-delay]="index < 20 ? index * 50 + 'ms' : '0ms'"
            >
              <app-match-card [match]="match" />
            </div>
          }
        </div>
      }

      <!-- Empty State - Status Specific -->
      @if (!matchService.loading() && !matchService.error() && matchService.matches().length === 0) {
        <div class="text-center py-20">
          <div class="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg class="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          
          @switch (matchService.activeStatus()) {
            @case ('live') {
              <h3 class="text-gray-900 font-bold text-xl mb-2">No hay partidos en vivo</h3>
              <p class="text-gray-500">No hay partidos jugándose en este momento.</p>
            }
            @case ('scheduled') {
              <h3 class="text-gray-900 font-bold text-xl mb-2">No hay partidos programados</h3>
              <p class="text-gray-500">No hay partidos programados para hoy.</p>
            }
            @case ('finished') {
              <h3 class="text-gray-900 font-bold text-xl mb-2">No hay partidos finalizados</h3>
              <p class="text-gray-500">No hay partidos que hayan terminado.</p>
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
