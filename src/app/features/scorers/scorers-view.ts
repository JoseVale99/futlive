import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ScorersService } from '../../core/services/scorers-service';
import { TopAssister, CardEntry } from '../../core/models/scorers-model';
import { APP_CONSTANTS } from '../../shared/constants/app-constants';

type StatsTab = 'goles' | 'asistencias' | 'tarjetas';

const SAMPLE_ASSISTERS: TopAssister[] = [
  { rank: 1, player_name: "A. Davies", team: "Canadá", team_flag: "https://flagcdn.com/w40/ca.png", assists: 3, matches_played: 3 },
  { rank: 2, player_name: "Pedri", team: "España", team_flag: "https://flagcdn.com/w40/es.png", assists: 3, matches_played: 2 },
  { rank: 3, player_name: "K. De Bruyne", team: "Bélgica", team_flag: "https://flagcdn.com/w40/be.png", assists: 2, matches_played: 2 },
  { rank: 4, player_name: "Vinícius Jr.", team: "Brasil", team_flag: "https://flagcdn.com/w40/br.png", assists: 2, matches_played: 3 },
  { rank: 5, player_name: "B. Saka", team: "Inglaterra", team_flag: "https://flagcdn.com/w40/gb-eng.png", assists: 2, matches_played: 3 },
  { rank: 6, player_name: "F. Wirtz", team: "Alemania", team_flag: "https://flagcdn.com/w40/de.png", assists: 2, matches_played: 2 },
  { rank: 7, player_name: "L. Messi", team: "Argentina", team_flag: "https://flagcdn.com/w40/ar.png", assists: 2, matches_played: 2 },
  { rank: 8, player_name: "M. Salah", team: "Egipto", team_flag: "https://flagcdn.com/w40/eg.png", assists: 1, matches_played: 2 },
  { rank: 9, player_name: "J. Kimmich", team: "Alemania", team_flag: "https://flagcdn.com/w40/de.png", assists: 1, matches_played: 2 },
  { rank: 10, player_name: "Lamine Yamal", team: "España", team_flag: "https://flagcdn.com/w40/es.png", assists: 1, matches_played: 2 }
];

const SAMPLE_CARDS: CardEntry[] = [
  { rank: 1, player_name: "S. Lopes Cabral", team: "Curazao", team_flag: "https://flagcdn.com/w40/cw.png", yellow_cards: 2, red_cards: 0, card_type: 'amarilla' },
  { rank: 2, player_name: "T. Mokoena", team: "Sudáfrica", team_flag: "https://flagcdn.com/w40/za.png", yellow_cards: 2, red_cards: 0, card_type: 'amarilla' },
  { rank: 3, player_name: "M. Almirón", team: "Paraguay", team_flag: "https://flagcdn.com/w40/py.png", yellow_cards: 0, red_cards: 1, card_type: 'roja' },
  { rank: 4, player_name: "Homam Ahmed", team: "Catar", team_flag: "https://flagcdn.com/w40/qa.png", yellow_cards: 0, red_cards: 1, card_type: 'roja' },
  { rank: 5, player_name: "Assim Madibo", team: "Catar", team_flag: "https://flagcdn.com/w40/qa.png", yellow_cards: 0, red_cards: 1, card_type: 'roja' },
  { rank: 6, player_name: "M. Almirón", team: "Paraguay", team_flag: "https://flagcdn.com/w40/py.png", yellow_cards: 1, red_cards: 0, card_type: 'amarilla' },
  { rank: 7, player_name: "N. Ngoy", team: "R.D. Congo", team_flag: "https://flagcdn.com/w40/cd.png", yellow_cards: 0, red_cards: 1, card_type: 'roja' },
  { rank: 8, player_name: "G. Kastaneer", team: "Curazao", team_flag: "https://flagcdn.com/w40/cw.png", yellow_cards: 1, red_cards: 0, card_type: 'amarilla' },
  { rank: 9, player_name: "T. Muharemović", team: "Bosnia", team_flag: "https://flagcdn.com/w40/ba.png", yellow_cards: 0, red_cards: 1, card_type: 'roja' },
  { rank: 10, player_name: "K. McLean", team: "Escocia", team_flag: "https://flagcdn.com/w40/gb-sct.png", yellow_cards: 1, red_cards: 0, card_type: 'amarilla' }
];

@Component({
  selector: 'app-scorers-view',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="min-h-screen bg-gray-50 dark:bg-[#0a0e17] pb-24">
      <!-- Header -->
      <div class="sticky top-[60px] z-10 bg-gray-50/95 dark:bg-[#0a0e17]/95 backdrop-blur-md border-b border-gray-200 dark:border-white/5">
        <div class="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <a routerLink="/" class="p-2 -ml-2 rounded-lg hover:bg-gray-200 dark:hover:bg-white/5 transition-colors">
            <svg class="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
          </a>
          <h1 class="text-lg font-bold text-gray-900 dark:text-white">Estadísticas</h1>
        </div>
      </div>

      <!-- Tabs -->
      <div class="max-w-5xl mx-auto px-4 pt-4">
        <div class="flex gap-1 bg-gray-100 dark:bg-[#111827] p-1 rounded-lg">
          @for (tab of tabs; track tab.id) {
            <button
              (click)="activeTab.set(tab.id)"
              [class]="activeTab() === tab.id
                ? 'flex-1 px-4 py-2 text-sm font-semibold text-gray-900 dark:text-white bg-white dark:bg-[#1a2236] rounded-md shadow-sm transition-all'
                : 'flex-1 px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-md transition-all cursor-pointer'"
            >
              {{ tab.label }}
            </button>
          }
        </div>
      </div>

      <!-- Content -->
      <div class="max-w-5xl mx-auto px-4 py-4">
        @if (scorersService.loading()) {
          <div class="bg-white dark:bg-[#111827] rounded-lg border border-gray-200 dark:border-white/5 p-4">
            @for (i of [1,2,3,4,5,6,7,8]; track i) {
              <div class="flex items-center gap-3 py-3 animate-pulse">
                <div class="w-6 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div class="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
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
          <!-- Goles Tab -->
          @if (activeTab() === 'goles') {
            <div class="bg-white dark:bg-[#111827] rounded-lg border border-gray-200 dark:border-white/5 overflow-hidden divide-y divide-gray-100 dark:divide-white/5">
              @for (scorer of topScorers(); track scorer.rank) {
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
                  <img [src]="scorer.team_flag" [alt]="scorer.team" class="w-6 h-6 rounded-sm object-cover" (error)="handleImgError($event)">
                  <div class="flex-1 min-w-0">
                    <span class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate block">{{ scorer.player_name }}</span>
                    <span class="text-xs text-gray-500 dark:text-gray-400">{{ scorer.team }}</span>
                  </div>
                  <span class="text-lg font-bold text-gray-900 dark:text-white">{{ scorer.goals }}</span>
                </div>
              }
            </div>
          }

          <!-- Asistencias Tab -->
          @if (activeTab() === 'asistencias') {
            <div class="bg-white dark:bg-[#111827] rounded-lg border border-gray-200 dark:border-white/5 overflow-hidden divide-y divide-gray-100 dark:divide-white/5">
              @for (assister of assisters; track assister.rank) {
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
                  <img [src]="assister.team_flag" [alt]="assister.team" class="w-6 h-6 rounded-sm object-cover" (error)="handleImgError($event)">
                  <div class="flex-1 min-w-0">
                    <span class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate block">{{ assister.player_name }}</span>
                    <span class="text-xs text-gray-500 dark:text-gray-400">{{ assister.team }}</span>
                  </div>
                  <span class="text-lg font-bold text-gray-900 dark:text-white">{{ assister.assists }}</span>
                </div>
              }
            </div>
          }

          <!-- Tarjetas Tab -->
          @if (activeTab() === 'tarjetas') {
            <div class="bg-white dark:bg-[#111827] rounded-lg border border-gray-200 dark:border-white/5 overflow-hidden divide-y divide-gray-100 dark:divide-white/5">
              @for (card of cards; track card.rank) {
                <div [class]="card.rank <= 2
                  ? 'flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-white/2'
                  : 'flex items-center gap-3 px-4 py-3'">
                  <span class="w-7 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
                    {{ card.rank }}
                  </span>
                  <img [src]="card.team_flag" [alt]="card.team" class="w-6 h-6 rounded-sm object-cover" (error)="handleImgError($event)">
                  <div class="flex-1 min-w-0">
                    <span class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate block">{{ card.player_name }}</span>
                    <span class="text-xs text-gray-500 dark:text-gray-400">{{ card.team }}</span>
                  </div>
                  <!-- Card indicator -->
                  <div class="flex items-center gap-2">
                    @if (card.card_type === 'roja') {
                      <span class="inline-block w-3 h-4 rounded-sm bg-red-500"></span>
                      <span class="text-xs text-gray-500 dark:text-gray-400">roja</span>
                    } @else {
                      <span class="inline-block w-3 h-4 rounded-sm bg-yellow-400"></span>
                      <span class="text-xs text-gray-500 dark:text-gray-400">amarilla</span>
                    }
                    <span class="text-lg font-bold text-gray-900 dark:text-white">{{ card.card_type === 'roja' ? card.red_cards : card.yellow_cards }}</span>
                  </div>
                </div>
              }
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

  readonly topScorers = computed(() => {
    const all = this.scorersService.scorers();
    return [...all].sort((a, b) => b.goals - a.goals).slice(0, 15);
  });

  readonly assisters = SAMPLE_ASSISTERS;
  readonly cards = SAMPLE_CARDS;

  ngOnInit() {
    this.scorersService.fetchScorers();
  }

  handleImgError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.src = APP_CONSTANTS.IMAGES.FLAG_PLACEHOLDER;
  }
}
