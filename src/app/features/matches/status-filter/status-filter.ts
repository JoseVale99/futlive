import { Component, input, output } from '@angular/core';
import { MatchStatus } from '../../../core/models/match-model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-status-filter',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex justify-center mb-6">
      <div class="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl shadow-inner w-full max-w-md">
        <button
          (click)="selectStatus('live')"
          [class.bg-white]="activeStatus() === 'live'"
          [class.dark:bg-gray-700]="activeStatus() === 'live'"
          [class.shadow-sm]="activeStatus() === 'live'"
          [class.text-blue-600]="activeStatus() === 'live'"
          [class.dark:text-blue-500]="activeStatus() === 'live'"
          [class.text-gray-500]="activeStatus() !== 'live'"
          [class.dark:text-gray-400]="activeStatus() !== 'live'"
          class="flex-1 py-2.5 px-4 text-sm font-semibold rounded-lg transition-all duration-200 focus:outline-none min-h-[44px]"
        >
          En Vivo
        </button>
        <button
          (click)="selectStatus('scheduled')"
          [class.bg-white]="activeStatus() === 'scheduled'"
          [class.dark:bg-gray-700]="activeStatus() === 'scheduled'"
          [class.shadow-sm]="activeStatus() === 'scheduled'"
          [class.text-blue-600]="activeStatus() === 'scheduled'"
          [class.dark:text-blue-500]="activeStatus() === 'scheduled'"
          [class.text-gray-500]="activeStatus() !== 'scheduled'"
          [class.dark:text-gray-400]="activeStatus() !== 'scheduled'"
          class="flex-1 py-2.5 px-4 text-sm font-semibold rounded-lg transition-all duration-200 focus:outline-none min-h-[44px]"
        >
          Programados
        </button>
        <button
          (click)="selectStatus('finished')"
          [class.bg-white]="activeStatus() === 'finished'"
          [class.dark:bg-gray-700]="activeStatus() === 'finished'"
          [class.shadow-sm]="activeStatus() === 'finished'"
          [class.text-blue-600]="activeStatus() === 'finished'"
          [class.dark:text-blue-500]="activeStatus() === 'finished'"
          [class.text-gray-500]="activeStatus() !== 'finished'"
          [class.dark:text-gray-400]="activeStatus() !== 'finished'"
          class="flex-1 py-2.5 px-4 text-sm font-semibold rounded-lg transition-all duration-200 focus:outline-none min-h-[44px]"
        >
          Finalizados
        </button>
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
