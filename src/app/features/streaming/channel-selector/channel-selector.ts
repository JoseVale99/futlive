import { Component, input, output, computed } from '@angular/core';
import { MatchStream } from '../../../core/models/stream-model';

export interface StreamGroup {
  category: string;
  sourceKey: string;
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

/** Pure function: short label for a stream's source provider */
export function sourceLabel(stream: MatchStream): string {
  const s = stream.source?.toLowerCase() ?? '';
  if (s === 'balondeportes') return 'BD';
  if (s === 'futbol-libre') return 'FL';
  if (s === 'lacancha') return 'LC';
  return '';
}

/** Tailwind classes for the source badge */
export function sourceBadgeClasses(stream: MatchStream): string {
  const s = stream.source?.toLowerCase() ?? '';
  const base = 'text-[10px] font-bold px-1.5 py-0.5 rounded tabular-nums';
  if (s === 'balondeportes') return `${base} bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300`;
  if (s === 'futbol-libre') return `${base} bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300`;
  if (s === 'lacancha') return `${base} bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300`;
  return `${base} bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300`;
}

/** Strip redundant (BD)/(FL)/(LC) suffix — duplicates the source badge */
export function cleanStreamName(name: string): string {
  return name.replace(/\s*\((?:BD|FL|LC)\)\s*$/i, '').trim();
}

/** Tailwind class for the colored left-border on the section header */
export function sectionBorderClass(sourceKey: string): string {
  const k = sourceKey.toLowerCase();
  if (k === 'balondeportes') return 'border-blue-500';
  if (k === 'lacancha') return 'border-emerald-500';
  if (k === 'futbol-libre') return 'border-red-500';
  return 'border-gray-500';
}

/** Pure function: groups streams by source provider for visual clustering */
export function groupStreamsBySource(streams: MatchStream[]): StreamGroup[] {
  const ORDER = ['balondeportes', 'lacancha', 'futbol-libre'];
  const buckets = new Map<string, MatchStream[]>();
  for (const s of streams) {
    const key = s.source?.toLowerCase() || 'other';
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(s);
  }
  const groups: StreamGroup[] = [];
  for (const key of ORDER) {
    const list = buckets.get(key);
    if (list && list.length > 0) {
      groups.push({
        sourceKey: key,
        category: `${sourceLabel({ source: key } as MatchStream)} · ${list.length}`,
        streams: list,
      });
    }
  }
  for (const [key, list] of buckets) {
    if (!ORDER.includes(key)) {
      groups.push({ sourceKey: key, category: `${key} · ${list.length}`, streams: list });
    }
  }
  return groups;
}

@Component({
  selector: 'app-channel-selector',
  standalone: true,
  template: `
    @if (streams().length > 0) {
      <div [class]="needsScroll() ? 'max-h-[200px] overflow-y-auto space-y-3' : 'space-y-3'">
        @for (group of groupedStreams(); track group.category) {
          <div [class]="'pl-2 border-l-2 ' + sectionBorderClass(group.sourceKey)">
            <span class="text-xs h-3 uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold tabular-nums">
              {{ group.category }}
            </span>
            <div class="flex flex-wrap gap-2 mt-1">
              @for (stream of group.streams; track stream.id) {
                <button
                  type="button"
                  (click)="channelSelected.emit(stream)"
                  [title]="cleanStreamName(stream.embed_name)"
                  [class]="active()?.embed_url === stream.embed_url
                    ? 'inline-flex items-center gap-2 min-w-[80px] max-w-[200px] max-h-8 px-3 py-1 rounded-full border border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-sm font-medium transition-colors'
                    : 'inline-flex items-center gap-2 min-w-[80px] max-w-[200px] max-h-8 px-3 py-1 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300 dark:hover:border-blue-600 text-sm font-medium transition-colors'"
                >
                  <span class="truncate text-gray-800 dark:text-gray-100 text-xs flex-1 min-w-0">
                    {{ cleanStreamName(stream.embed_name) }}
                  </span>
                  @if (sourceLabel(stream)) {
                    <span [class]="sourceBadgeClasses(stream)" title="Origen: {{ stream.source }}">
                      {{ sourceLabel(stream) }}
                    </span>
                  }
                  <span [class]="classifyStreamQuality(stream.embed_name) === 'HD'
                    ? 'text-[10px] font-bold px-1.5 py-0.5 rounded tabular-nums bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                    : 'text-[10px] font-bold px-1.5 py-0.5 rounded tabular-nums bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'"
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

  readonly groupedStreams = computed(() => groupStreamsBySource(this.streams()));
  readonly needsScroll = computed(() => this.streams().length > 20);

  classifyStreamQuality = classifyStreamQuality;
  sourceLabel = sourceLabel;
  sourceBadgeClasses = sourceBadgeClasses;
  cleanStreamName = cleanStreamName;
  sectionBorderClass = sectionBorderClass;
}
