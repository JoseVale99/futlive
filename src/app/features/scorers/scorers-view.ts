import { Component, inject, OnInit, signal, computed, linkedSignal } from '@angular/core';
import { ScorersService } from '../../core/services/scorers-service';
import { APP_CONSTANTS } from '../../shared/constants/app-constants';

type StatsTab = 'goles' | 'asistencias' | 'tarjetas';

const PAGE_SIZE = 10;

@Component({
  selector: 'app-scorers-view',
  standalone: true,
  imports: [],
  template: `
    <div class="min-h-screen bg-gray-50 dark:bg-[#0a0e17] pb-24">
      <!-- Tabs -->
      <div class="max-w-5xl mx-auto px-4 pt-4">
        <div class="flex gap-1 bg-gray-100 dark:bg-[#111827] p-1 rounded-lg">
          @for (tab of tabs; track tab.id) {
            <button
              (click)="switchTab(tab.id)"
              [class]="activeTab() === tab.id
                ? 'flex-1 px-4 py-2 text-sm font-semibold text-gray-900 dark:text-white bg-white dark:bg-[#1a2236] rounded-md shadow-sm transition-all'
                : 'flex-1 px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-md transition-all cursor-pointer'"
            >
              {{ tab.label }}
            </button>
          }
        </div>
      </div>

      <!-- Search + Content -->
      <div class="max-w-5xl mx-auto px-4 py-4">
        @if (scorersService.loading()) {
          <div class="bg-white dark:bg-[#111827] rounded-lg border border-gray-200 dark:border-white/5 p-4">
            @for (i of [1,2,3,4,5,6,7,8]; track i) {
              <div class="flex items-center gap-3 py-3 animate-pulse">
                <div class="w-6 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div class="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                <div class="w-5 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div class="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div class="w-8 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            }
          </div>
        } @else if (scorersService.error()) {
          <div class="text-center py-12 bg-white dark:bg-[#111827] rounded-lg border border-gray-200 dark:border-white/5">
            <p class="text-gray-500 dark:text-gray-400 text-sm mb-3">{{ scorersService.error() }}</p>
            <button (click)="scorersService.fetchScorers()" class="px-4 py-2 text-sm font-medium text-blue-500 hover:text-blue-600 border border-blue-500 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors cursor-pointer">
              Reintentar
            </button>
          </div>
        } @else {
          <!-- Search -->
          <div class="mb-4">
            <div class="relative">
              <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">search</span>
              <input
                type="text"
                [value]="searchQuery()"
                (input)="onSearch($event)"
                placeholder="Buscar jugador o equipo..."
                class="w-full pl-10 pr-4 py-2.5 text-sm bg-white dark:bg-[#111827] border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors"
              >
              @if (searchQuery()) {
                <button (click)="clearSearch()" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer">
                  <span class="material-symbols-outlined text-lg">close</span>
                </button>
              }
            </div>
          </div>

          <!-- Goles Tab -->
          @if (activeTab() === 'goles') {
            <div class="bg-white dark:bg-[#111827] rounded-lg border border-gray-200 dark:border-white/5 overflow-hidden divide-y divide-gray-100 dark:divide-white/5">
              @for (scorer of paginatedScorers(); track scorer.rank) {
                <div [class]="scorer.rank === 1
                  ? 'flex items-center gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-900/10 border-l-4 border-amber-400'
                  : scorer.rank <= 3
                    ? 'flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-white/2'
                    : 'flex items-center gap-3 px-4 py-3'">
                  <span [class]="scorer.rank === 1
                    ? 'w-7 text-center text-sm font-bold text-amber-600 dark:text-amber-400'
                    : scorer.rank <= 3
                      ? 'w-7 text-center text-sm font-bold text-gray-700 dark:text-gray-300'
                      : 'w-7 text-center text-sm font-medium text-gray-500 dark:text-gray-400'">
                    {{ scorer.rank }}
                  </span>
                  <img [src]="scorer.player_photo" [alt]="scorer.player_name" class="w-8 h-8 rounded-full object-cover" (error)="handleImgError($event)">
                  <img [src]="scorer.team_flag" [alt]="scorer.team" class="w-5 h-4 rounded-sm object-cover" (error)="handleImgError($event)">
                  <div class="flex-1 min-w-0">
                    <span class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate block">{{ scorer.player_name }}</span>
                    <span class="text-xs text-gray-500 dark:text-gray-400">{{ scorer.team }}</span>
                  </div>
                  <span class="text-lg font-bold text-gray-900 dark:text-white">{{ scorer.goals }}</span>
                </div>
              } @empty {
                <div class="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">Sin resultados</div>
              }
            </div>
          }

          <!-- Asistencias Tab -->
          @if (activeTab() === 'asistencias') {
            <div class="bg-white dark:bg-[#111827] rounded-lg border border-gray-200 dark:border-white/5 overflow-hidden divide-y divide-gray-100 dark:divide-white/5">
              @for (assister of paginatedAssisters(); track assister.rank) {
                <div [class]="assister.rank === 1
                  ? 'flex items-center gap-3 px-4 py-3 bg-blue-50 dark:bg-blue-900/10 border-l-4 border-blue-400'
                  : assister.rank <= 3
                    ? 'flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-white/2'
                    : 'flex items-center gap-3 px-4 py-3'">
                  <span [class]="assister.rank === 1
                    ? 'w-7 text-center text-sm font-bold text-blue-600 dark:text-blue-400'
                    : assister.rank <= 3
                      ? 'w-7 text-center text-sm font-bold text-gray-700 dark:text-gray-300'
                      : 'w-7 text-center text-sm font-medium text-gray-500 dark:text-gray-400'">
                    {{ assister.rank }}
                  </span>
                  <img [src]="assister.player_photo" [alt]="assister.player_name" class="w-8 h-8 rounded-full object-cover" (error)="handleImgError($event)">
                  <img [src]="assister.team_flag" [alt]="assister.team" class="w-5 h-4 rounded-sm object-cover" (error)="handleImgError($event)">
                  <div class="flex-1 min-w-0">
                    <span class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate block">{{ assister.player_name }}</span>
                    <span class="text-xs text-gray-500 dark:text-gray-400">{{ assister.team }}</span>
                  </div>
                  <span class="text-lg font-bold text-gray-900 dark:text-white">{{ assister.assists }}</span>
                </div>
              } @empty {
                <div class="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">Sin resultados</div>
              }
            </div>
          }

          <!-- Tarjetas Tab -->
          @if (activeTab() === 'tarjetas') {
            <div class="bg-white dark:bg-[#111827] rounded-lg border border-gray-200 dark:border-white/5 overflow-hidden divide-y divide-gray-100 dark:divide-white/5">
              @for (card of paginatedCards(); track card.rank) {
                <div [class]="card.rank <= 2
                  ? 'flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-white/2'
                  : 'flex items-center gap-3 px-4 py-3'">
                  <span class="w-7 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
                    {{ card.rank }}
                  </span>
                  <img [src]="card.player_photo" [alt]="card.player_name" class="w-8 h-8 rounded-full object-cover" (error)="handleImgError($event)">
                  <img [src]="card.team_flag" [alt]="card.team" class="w-5 h-4 rounded-sm object-cover" (error)="handleImgError($event)">
                  <div class="flex-1 min-w-0">
                    <span class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate block">{{ card.player_name }}</span>
                    <span class="text-xs text-gray-500 dark:text-gray-400">{{ card.team }}</span>
                  </div>
                  <div class="flex items-center gap-2">
                    @if (card.card_type === 'red') {
                      <span class="inline-block w-3 h-4 rounded-sm bg-red-500"></span>
                      <span class="text-xs text-gray-500 dark:text-gray-400">roja</span>
                    } @else {
                      <span class="inline-block w-3 h-4 rounded-sm bg-yellow-400"></span>
                      <span class="text-xs text-gray-500 dark:text-gray-400">amarilla</span>
                    }
                    <span class="text-lg font-bold text-gray-900 dark:text-white">{{ card.value }}</span>
                  </div>
                </div>
              } @empty {
                <div class="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">Sin resultados</div>
              }
            </div>
          }

          <!-- Pagination -->
          @if (totalPages() > 1) {
            <div class="flex items-center justify-between mt-4 px-1">
              <span class="text-xs text-gray-500 dark:text-gray-400">
                Mostrando {{ startIndex() + 1 }}–{{ endIndex() }} de {{ totalItems() }}
              </span>
              <div class="flex gap-1">
                <button
                  (click)="prevPage()"
                  [disabled]="currentPage() === 1"
                  [class]="currentPage() === 1
                    ? 'px-3 py-1.5 text-xs font-medium text-gray-300 dark:text-gray-600 bg-gray-100 dark:bg-gray-800 rounded-md cursor-not-allowed'
                    : 'px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors'"
                >
                  <span class="material-symbols-outlined text-sm">chevron_left</span>
                </button>
                @for (page of visiblePages(); track page) {
                  <button
                    (click)="goToPage(page)"
                    [class]="page === currentPage()
                      ? 'px-3 py-1.5 text-xs font-bold text-white bg-blue-600 rounded-md'
                      : 'px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors'"
                  >
                    {{ page }}
                  </button>
                }
                <button
                  (click)="nextPage()"
                  [disabled]="currentPage() === totalPages()"
                  [class]="currentPage() === totalPages()
                    ? 'px-3 py-1.5 text-xs font-medium text-gray-300 dark:text-gray-600 bg-gray-100 dark:bg-gray-800 rounded-md cursor-not-allowed'
                    : 'px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors'"
                >
                  <span class="material-symbols-outlined text-sm">chevron_right</span>
                </button>
              </div>
            </div>
          }

          <p class="text-xs text-gray-400 dark:text-gray-600 mt-4 text-center">Datos oficiales del torneo · se actualizan con cada partido</p>
        }
      </div>
    </div>
  `
})
export class ScorersViewComponent implements OnInit {
  readonly scorersService = inject(ScorersService);

  readonly tabs: { id: StatsTab; label: string }[] = [
    { id: 'goles', label: 'Goles' },
    { id: 'asistencias', label: 'Asistencias' },
    { id: 'tarjetas', label: 'Tarjetas' },
  ];

  readonly activeTab = signal<StatsTab>('goles');
  readonly searchQuery = signal('');
  readonly currentPage = signal(1);

  // Filtered data based on search
  readonly filteredScorers = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const data = this.scorersService.scorers();
    if (!q) return data;
    return data.filter(s => s.player_name.toLowerCase().includes(q) || s.team.toLowerCase().includes(q));
  });

  readonly filteredAssisters = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const data = this.scorersService.assisters();
    if (!q) return data;
    return data.filter(s => s.player_name.toLowerCase().includes(q) || s.team.toLowerCase().includes(q));
  });

  readonly filteredCards = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const data = this.scorersService.cards();
    if (!q) return data;
    return data.filter(s => s.player_name.toLowerCase().includes(q) || s.team.toLowerCase().includes(q));
  });

  // Total items for active tab
  readonly totalItems = computed(() => {
    switch (this.activeTab()) {
      case 'goles': return this.filteredScorers().length;
      case 'asistencias': return this.filteredAssisters().length;
      case 'tarjetas': return this.filteredCards().length;
    }
  });

  readonly totalPages = computed(() => Math.ceil(this.totalItems() / PAGE_SIZE) || 1);

  readonly startIndex = computed(() => (this.currentPage() - 1) * PAGE_SIZE);
  readonly endIndex = computed(() => Math.min(this.startIndex() + PAGE_SIZE, this.totalItems()));

  readonly visiblePages = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: number[] = [];
    const start = Math.max(1, current - 2);
    const end = Math.min(total, current + 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  });

  // Paginated slices
  readonly paginatedScorers = computed(() =>
    this.filteredScorers().slice(this.startIndex(), this.endIndex())
  );

  readonly paginatedAssisters = computed(() =>
    this.filteredAssisters().slice(this.startIndex(), this.endIndex())
  );

  readonly paginatedCards = computed(() =>
    this.filteredCards().slice(this.startIndex(), this.endIndex())
  );

  ngOnInit() {
    this.scorersService.fetchScorers();
  }

  switchTab(tab: StatsTab) {
    this.activeTab.set(tab);
    this.currentPage.set(1);
  }

  onSearch(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
    this.currentPage.set(1);
  }

  clearSearch() {
    this.searchQuery.set('');
    this.currentPage.set(1);
  }

  goToPage(page: number) {
    this.currentPage.set(page);
  }

  prevPage() {
    if (this.currentPage() > 1) this.currentPage.update(p => p - 1);
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) this.currentPage.update(p => p + 1);
  }

  handleImgError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.src = APP_CONSTANTS.IMAGES.FLAG_PLACEHOLDER;
  }
}
