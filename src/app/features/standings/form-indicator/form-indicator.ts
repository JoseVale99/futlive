import { Component, input } from '@angular/core';
import { parseFormString } from '../../shared/utils/standings-util';

@Component({
  selector: 'app-form-indicator',
  standalone: true,
  template: `
    @if (results().length > 0) {
      <div class="flex gap-1.5">
        @for (result of results(); track $index) {
          <div [class]="getDotClass(result)" class="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow-sm">
            {{ result }}
          </div>
        }
      </div>
    }
  `
})
export class FormIndicatorComponent {
  form = input<string | null>(null);

  results = () => parseFormString(this.form());

  getDotClass(result: string): string {
    switch (result) {
      case 'W': return 'bg-gradient-to-br from-green-500 to-green-600';
      case 'D': return 'bg-gradient-to-br from-yellow-500 to-yellow-600';
      case 'L': return 'bg-gradient-to-br from-red-500 to-red-600';
      default: return 'bg-gray-300 dark:bg-gray-600';
    }
  }
}
