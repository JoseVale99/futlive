import { Component, input, computed } from '@angular/core';
import { FormResult } from '../../../core/models/standings-model';
import { parseFormString } from '../../../shared/utils/standings-util';

@Component({
  selector: 'app-form-indicator',
  standalone: true,
  template: `
    <div class="flex gap-1">
      @for (result of results(); track $index) {
        <span
          [class]="'w-2 h-2 rounded-full ' + getDotClass(result)"
          [title]="result === 'W' ? 'Ganado' : result === 'D' ? 'Empatado' : 'Perdido'"
        ></span>
      }
    </div>
  `
})
export class FormIndicatorComponent {
  form = input<string | null>(null);

  results = computed(() => parseFormString(this.form()));

  getDotClass(result: FormResult): string {
    switch (result) {
      case 'W': return 'bg-green-500 shadow-xs shadow-green-500/50';
      case 'D': return 'bg-yellow-500 shadow-xs shadow-yellow-500/50';
      case 'L': return 'bg-red-500 shadow-xs shadow-red-500/50';
      default: return 'bg-gray-300';
    }
  }
}
