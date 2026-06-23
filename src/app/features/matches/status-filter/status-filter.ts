import { Component, input, output } from '@angular/core';
import { MatchStatus } from '../../../core/models/match-model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-status-filter',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex justify-center mb-6">
      <div class="relative p-1.5 bg-gradient-to-r from-gray-200 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-2xl shadow-inner w-full max-w-lg">
        <div class="flex">
          <button
            (click)="selectStatus('live')"
            [class.bg-white]="activeStatus() === 'live'"
            [class.dark:bg-gray-900]="activeStatus() === 'live'"
            [class.shadow-lg]="activeStatus() === 'live'"
            [class.text-blue-600]="activeStatus() === 'live'"
            [class.dark:text-blue-400]="activeStatus() === 'live'"
            [class.text-gray-500]="activeStatus() !== 'live'"
            [class.dark:text-gray-400]="activeStatus() !== 'live'"
            class="relative flex-1 py-3 px-5 text-sm font-bold rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 min-h-[48px] flex items-center justify-center gap-2"
          >
            <span *ngIf="activeStatus() === 'live'" class="relative flex h-2 w-2">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            En Vivo
          </button>
          <button
            (click)="selectStatus('scheduled')"
            [class.bg-white]="activeStatus() === 'scheduled'"
            [class.dark:bg-gray-900]="activeStatus() === 'scheduled'"
            [class.shadow-lg]="activeStatus() === 'scheduled'"
            [class.text-blue-600]="activeStatus() === 'scheduled'"
            [class.dark:text-blue-400]="activeStatus() === 'scheduled'"
            [class.text-gray-500]="activeStatus() !== 'scheduled'"
            [class.dark:text-gray-400]="activeStatus() !== 'scheduled'"
            class="flex-1 py-3 px-5 text-sm font-bold rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 min-h-[48px] flex items-center justify-center"
          >
            Programados
          </button>
          <button
            (click)="selectStatus('finished')"
            [class.bg-white]="activeStatus() === 'finished'"
            [class.dark:bg-gray-900]="activeStatus() === 'finished'"
            [class.shadow-lg]="activeStatus() === 'finished'"
            [class.text-blue-600]="activeStatus() === 'finished'"
            [class.dark:text-blue-400]="activeStatus() === 'finished'"
            [class.text-gray-500]="activeStatus() !== 'finished'"
            [class.dark:text-gray-400]="activeStatus() !== 'finished'"
            class="flex-1 py-3 px-5 text-sm font-bold rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 min-h-[48px] flex items-center justify-center"
          >
            Finalizados
          </button>
        </div>
      </div>
    </div>
  `
})
export class StatusFilterComponent {
  activeStatus = input.required<MatchStatus>();
  statusChange = output<MatchStatus>();

  selectStatus(status: MatchStatus) {
    this.statusChange.emit(status);
  }
}
