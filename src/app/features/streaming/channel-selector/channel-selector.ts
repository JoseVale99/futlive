import { Component, input, output, computed, signal } from '@angular/core';
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
  if (s === 'futbollibrex') return 'FX';
  if (s === 'futbol-libre') return 'FL';
  if (s === 'lacancha') return 'LC';
  return '';
}

/** Tailwind classes for the source badge */
export function sourceBadgeClasses(stream: MatchStream): string {
  const s = stream.source?.toLowerCase() ?? '';
  const base = 'text-[10px] font-bold px-1.5 py-0.5 rounded tabular-nums';
  if (s === 'balondeportes') return `${base} bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300`;
  if (s === 'futbollibrex') return `${base} bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300`;
  if (s === 'futbol-libre') return `${base} bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300`;
  if (s === 'lacancha') return `${base} bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300`;
  return `${base} bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300`;
}

/** Strip redundant (BD)/(FL)/(LC)/(FX) suffix — duplicates the source badge */
export function cleanStreamName(name: string): string {
  return name.replace(/\s*\((?:BD|FL|LC|FX)\)\s*$/i, '').trim();
}

/** Tailwind class for the colored left-border on the section header */
export function sectionBorderClass(sourceKey: string): string {
  const k = sourceKey.toLowerCase();
  if (k === 'balondeportes') return 'border-blue-500';
  if (k === 'futbollibrex') return 'border-amber-500';
  if (k === 'lacancha') return 'border-emerald-500';
  if (k === 'futbol-libre') return 'border-red-500';
  return 'border-gray-500';
}

/** Tailwind class for the tab's accent text color */
export function sourceTextColor(sourceKey: string): string {
  const k = sourceKey.toLowerCase();
  if (k === 'balondeportes') return 'text-blue-600 dark:text-blue-400';
  if (k === 'futbollibrex') return 'text-amber-600 dark:text-amber-400';
  if (k === 'lacancha') return 'text-emerald-600 dark:text-emerald-400';
  if (k === 'futbol-libre') return 'text-red-600 dark:text-red-400';
  return 'text-gray-600 dark:text-gray-400';
}

/** Tailwind classes for the colored source monogram square */
export function sourceMonogramClasses(stream: MatchStream): string {
  const s = stream.source?.toLowerCase() ?? '';
  if (s === 'balondeportes') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300';
  if (s === 'futbollibrex') return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
  if (s === 'futbol-libre') return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
  if (s === 'lacancha') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';
  return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
}

/** Tailwind classes for source's solid background fill (active tab indicator) */
export function sourceBgFill(sourceKey: string): string {
  const k = sourceKey.toLowerCase();
  if (k === 'balondeportes') return 'bg-blue-500';
  if (k === 'futbollibrex') return 'bg-amber-500';
  if (k === 'lacancha') return 'bg-emerald-500';
  if (k === 'futbol-libre') return 'bg-red-500';
  return 'bg-gray-500';
}

/** Pure function: groups streams by source provider for visual clustering */
export function groupStreamsBySource(streams: MatchStream[]): StreamGroup[] {
  const ORDER = ['futbollibrex', 'lacancha', 'futbol-libre'];
  const buckets = new Map<string, MatchStream[]>();
  for (const s of streams) {
    const key = s.source?.toLowerCase() || 'other';
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(s);
  }
  const groups: StreamGroup[] = [];
  ORDER.forEach((key, idx) => {
    const list = buckets.get(key);
    if (list && list.length > 0) {
      groups.push({
        sourceKey: key,
        category: `${idx + 1}`,
        streams: list,
      });
    }
  });
  for (const [key, list] of buckets) {
    if (!ORDER.includes(key)) {
      const n = ORDER.length + groups.length - ORDER.filter(k => buckets.has(k)).length;
      groups.push({ sourceKey: key, category: `${n}`, streams: list });
    }
  }
  return groups;
}

@Component({
  selector: 'app-channel-selector',
  standalone: true,
  template: `
    @if (streams().length > 0) {
      <!-- "En vivo" del stream activo -->
      @if (active()) {
        <div class="mb-3 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 flex items-center gap-2">
          <span class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-green-600 dark:text-green-400 tabular-nums">
            <span class="relative flex w-2 h-2">
              <span class="absolute inline-flex w-full h-full rounded-full bg-green-500 opacity-75 animate-ping"></span>
              <span class="relative inline-flex w-2 h-2 rounded-full bg-green-500"></span>
            </span>
            En vivo
          </span>
          <span class="text-sm font-semibold text-gray-900 dark:text-white truncate flex-1 min-w-0">
            {{ cleanStreamName(active()!.embed_name) }}
          </span>
          <span [class]="sourceBadgeClasses(active()!)">{{ sourceLabel(active()!) }}</span>
        </div>
      }

      <!-- Tabs por fuente -->
      <div class="flex gap-1.5 mb-3 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1 snap-x snap-mandatory">
        @for (group of groupedStreams(); track group.sourceKey) {
          <button
            type="button"
            (click)="selectTab(group.sourceKey)"
            [class]="effectiveTab() === group.sourceKey
              ? 'shrink-0 snap-start flex flex-col items-start gap-1 min-w-[88px] px-3 py-2 rounded-xl bg-white dark:bg-gray-900 shadow-sm border border-current/30 ' + sourceTextColor(group.sourceKey)
              : 'shrink-0 snap-start flex flex-col items-start gap-1 min-w-[88px] px-3 py-2 rounded-xl bg-gray-100/60 dark:bg-gray-800/60 text-gray-600 dark:text-gray-400 border border-transparent hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors'"
          >
            <span class="flex items-center gap-1.5">
              <span [class]="'w-1.5 h-1.5 rounded-full ' + sourceBgFill(group.sourceKey)"></span>
              <span class="text-xs font-bold whitespace-nowrap">Opción {{ group.category }}</span>
            </span>
            <span class="text-[10px] font-medium tabular-nums opacity-80 whitespace-nowrap">
              {{ sourceLabelForKey(group.sourceKey) }} · {{ group.streams.length }}
            </span>
          </button>
        }
      </div>

      <!-- Cards del tab activo -->
      <div [class]="needsScroll()
        ? 'max-h-[320px] overflow-y-auto pl-1 pr-1.5 space-y-2'
        : 'pl-1 pr-1 space-y-2'">
        @for (stream of currentTabStreams(); track stream.id) {
          <button
            type="button"
            (click)="channelSelected.emit(stream)"
            [title]="cleanStreamName(stream.embed_name)"
            [class]="active()?.embed_url === stream.embed_url
              ? 'group relative w-full flex items-center gap-3 pl-5 pr-3 py-2.5 rounded-xl bg-gradient-to-r from-green-500/15 via-emerald-500/10 to-transparent dark:from-green-500/20 dark:via-emerald-500/10 dark:to-transparent border border-green-500/40 dark:border-green-400/40 border-l-[4px] border-l-green-500 dark:border-l-green-400 shadow-md shadow-green-500/10'
              : 'group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-white dark:hover:bg-gray-800 hover:shadow-sm hover:-translate-y-px transition-all'"
          >
            <!-- Acento izquierdo: barra extra solo cuando NO hay border-l visible por rounded corners extremos -->
            @if (active()?.embed_url === stream.embed_url) {
              <span class="absolute left-[3px] top-1/2 -translate-y-1/2 h-7 w-[3px] rounded-full bg-green-500 dark:bg-green-400 pointer-events-none"></span>
            }
            <!-- Monograma de fuente -->
            @if (sourceLabel(stream)) {
              <span [class]="'shrink-0 w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm shadow-sm ' + sourceMonogramClasses(stream)">
                {{ sourceLabel(stream) }}
              </span>
            } @else {
              <span class="shrink-0 w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-700"></span>
            }

            <!-- Nombre -->
            <div class="flex-1 min-w-0 text-left">
              <div class="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                {{ cleanStreamName(stream.embed_name) }}
              </div>
            </div>

            <!-- Quality + estado activo -->
            @if (active()?.embed_url === stream.embed_url) {
              <span [class]="classifyStreamQuality(stream.embed_name) === 'HD'
                ? 'shrink-0 text-[10px] font-bold px-2 py-0.5 rounded tabular-nums bg-green-500 text-white'
                : 'shrink-0 text-[10px] font-bold px-2 py-0.5 rounded tabular-nums bg-emerald-500 text-white'"
              >
                {{ classifyStreamQuality(stream.embed_name) }}
              </span>
              <svg class="shrink-0 w-4 h-4 text-green-600 dark:text-green-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>
            } @else {
              <span [class]="classifyStreamQuality(stream.embed_name) === 'HD'
                ? 'shrink-0 text-[10px] font-bold px-2 py-0.5 rounded tabular-nums bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                : 'shrink-0 text-[10px] font-bold px-2 py-0.5 rounded tabular-nums bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'"
              >
                {{ classifyStreamQuality(stream.embed_name) }}
              </span>
              <svg class="shrink-0 w-3.5 h-3.5 text-gray-300 dark:text-gray-600 group-hover:text-gray-400 transition-colors" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>
            }
          </button>
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

  /** User-clicked tab. null = follow the sticky rule from `active()`. */
  private readonly currentTab = signal<string | null>(null);

  readonly groupedStreams = computed(() => groupStreamsBySource(this.streams()));
  readonly needsScroll = computed(() => this.streams().length > 20);

  /** Sticky tab: chosen tab → else Opción 1 (first group). */
  readonly effectiveTab = computed(() => {
    const chosen = this.currentTab();
    if (chosen !== null) return chosen;
    return this.groupedStreams()[0]?.sourceKey ?? '';
  });

  /** Streams for the active tab, HD-first. */
  readonly currentTabStreams = computed(() => {
    const tab = this.effectiveTab();
    const filtered = this.streams().filter(s => s.source?.toLowerCase() === tab.toLowerCase());
    const hd = filtered.filter(s => classifyStreamQuality(s.embed_name) === 'HD');
    const sd = filtered.filter(s => classifyStreamQuality(s.embed_name) !== 'HD');
    return [...hd, ...sd];
  });

  selectTab(sourceKey: string): void {
    this.currentTab.set(sourceKey);
  }

  classifyStreamQuality = classifyStreamQuality;
  sourceLabel = sourceLabel;
  sourceBadgeClasses = sourceBadgeClasses;
  cleanStreamName = cleanStreamName;
  sectionBorderClass = sectionBorderClass;
  sourceTextColor = sourceTextColor;
  sourceMonogramClasses = sourceMonogramClasses;
  sourceBgFill = sourceBgFill;

  sourceLabelForKey(key: string): string {
    return sourceLabel({ source: key } as MatchStream);
  }
}
