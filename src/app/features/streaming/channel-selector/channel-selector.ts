import { Component, input, output, computed } from '@angular/core';
import { MatchStream } from '../../../core/models/stream-model';

export interface StreamGroup {
  category: string;
  streams: MatchStream[];
}

/** Pure function: classifies a stream as HD or SD based on embed_name */
export function classifyStreamQuality(embedName: string): 'HD' | 'SD' {
  const lower = embedName.toLowerCase();
  return lower.includes('hd') ||
    lower.includes('4k') ||
    lower.includes('hevc') ||
    lower.includes('1080') ||
    lower.includes('720')
    ? 'HD'
    : 'SD';
}

/** Pure function: groups streams by quality category */
export function groupStreamsByQuality(streams: MatchStream[]): StreamGroup[] {
  const hd: MatchStream[] = [];
  const sd: MatchStream[] = [];

  for (const stream of streams) {
    if (classifyStreamQuality(stream.embed_name) === 'HD') {
      hd.push(stream);
    } else {
      sd.push(stream);
    }
  }

  const groups: StreamGroup[] = [];
  if (hd.length > 0) groups.push({ category: 'HD', streams: hd });
  if (sd.length > 0) groups.push({ category: 'SD', streams: sd });
  return groups;
}

@Component({
  selector: 'app-channel-selector',
  standalone: true,
  template: `
    @if (streams().length > 0) {
      <div [class]="needsScroll() ? 'max-h-[200px] overflow-y-auto space-y-3' : 'space-y-3'">
        @for (group of groupedStreams(); track group.category) {
          <div>
            <span class="text-xs h-3 uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold">
              {{ group.category }}
            </span>
            <div class="flex flex-wrap gap-2 mt-1">
              @for (stream of group.streams; track stream.id) {
                <button
                  type="button"
                  (click)="channelSelected.emit(stream)"
                  [class]="active()?.embed_url === stream.embed_url
                    ? 'inline-flex items-center gap-2 max-h-8 px-3 py-1 rounded-full border border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-sm font-medium transition-colors'
                    : 'inline-flex items-center gap-2 max-h-8 px-3 py-1 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-600 text-sm font-medium transition-colors'"
                >
                  <span class="truncate text-gray-800 dark:text-gray-100 text-xs">
                    {{ stream.embed_name }}
                  </span>
                  <span [class]="classifyStreamQuality(stream.embed_name) === 'HD'
                    ? 'text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                    : 'text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'"
                  >
                    {{ classifyStreamQuality(stream.embed_name) }}
                  </span>
                </button>
              }
            </div>
          </div>
        }
      </div>
    } @else {
      <div class="text-center py-8 text-gray-500 dark:text-gray-400">
        <svg class="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
        </svg>
        <p class="text-sm">No hay canales disponibles</p>
      </div>
    }
  `,
})
export class ChannelSelectorComponent {
  streams = input<MatchStream[]>([]);
  active = input<MatchStream | null>(null);
  channelSelected = output<MatchStream>();

  readonly groupedStreams = computed(() => groupStreamsByQuality(this.streams()));
  readonly needsScroll = computed(() => this.streams().length > 20);

  classifyStreamQuality = classifyStreamQuality;
}
