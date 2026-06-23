import { Component, input, output } from '@angular/core';
import { MatchStream } from '../../core/models/stream-model';

@Component({
  selector: 'app-channel-selector',
  standalone: true,
  template: `
    @if (streams().length > 0) {
      <div class="w-full">
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-3 font-semibold">Selecciona un canal:</p>
        <div class="flex flex-wrap gap-2">
          @for (stream of streams(); track stream.id) {
            <button
              type="button"
              (click)="channelSelected.emit(stream)"
              [class]="active()?.id === stream.id
                ? 'px-4 py-2 rounded-xl font-semibold bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/25 scale-105'
                : 'px-4 py-2 rounded-xl font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all'"
            >
              📺 {{ stream.embed_name }}
            </button>
          }
        </div>
      </div>
    }
  `
})
export class ChannelSelectorComponent {
  streams = input<MatchStream[]>([]);
  active = input<MatchStream | null>(null);
  channelSelected = output<MatchStream>();
}
