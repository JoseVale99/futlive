import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { StandingsService } from '../../core/services/standings-service';
import { GroupStanding } from '../../core/models/standings-model';
import { formatKickoffTime } from '../../shared/utils/match-format-util';
import { translateTeamName } from '../../shared/utils/team-name-util';

interface KnockoutSlot {
  matchNum: number;
  date: string;
  from1: number;
  from2: number;
  home: { name: string; logo: string; score: number | null } | null;
  away: { name: string; logo: string; score: number | null } | null;
  winner: 'home' | 'away' | null;
  status: string;
}

interface BracketMatch {
  matchNum: number;
  date: string;
  team1Label: string;
  team1Name: string;
  team1Flag: string;
  team2Label: string;
  team2Name: string;
  team2Flag: string;
}

@Component({
  selector: 'app-bracket',
  standalone: true,
  template: `
    @if (standingsService.loading()) {
      <div class="space-y-8">
        @for (i of [1,2,3]; track i) {
          <div class="bg-white dark:bg-gray-800/60 rounded-2xl h-96 animate-pulse border border-gray-100 dark:border-gray-800"></div>
        }
      </div>
    } @else if (standingsService.error()) {
      <div class="text-center py-20 bg-white dark:bg-gray-800/60 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xl">
        <h3 class="text-xl font-black text-gray-900 dark:text-white mb-2">¡Ups! Algo salió mal</h3>
        <p class="text-gray-500 dark:text-gray-400 font-medium mb-8">{{ standingsService.error() }}</p>
        <button (click)="standingsService.fetchStandings()" class="px-8 py-3 bg-linear-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-black">Reintentar</button>
      </div>
    } @else {
      <div [class]="bracketFullscreen() ? 'fixed inset-0 z-50 bg-white dark:bg-[#0a0e17] p-4 overflow-auto' : 'bg-white dark:bg-[#111827] rounded-2xl p-5 sm:p-8 border border-gray-200 dark:border-gray-800 shadow-lg'">
        <div class="flex items-center justify-center gap-2 mb-8">
          <span class="material-symbols-outlined text-amber-500 dark:text-amber-400 text-xl">trophy</span>
          <span class="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest">Bracket Fase Final — Datos en vivo ESPN</span>
          <button (click)="bracketFullscreen.set(!bracketFullscreen())" class="lg:hidden ml-auto p-2 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors" [attr.aria-label]="bracketFullscreen() ? 'Salir de pantalla completa' : 'Ver en pantalla completa'">
            <span class="material-symbols-outlined text-lg text-gray-600 dark:text-gray-300">{{ bracketFullscreen() ? 'fullscreen_exit' : 'fullscreen' }}</span>
          </button>
        </div>

        <div class="overflow-x-auto pb-3">
          <div class="min-w-[1400px] grid grid-cols-[1.2fr_1fr_1fr_0.8fr_1fr_1fr_1.2fr] gap-x-3 items-stretch">
            <div class="text-center pb-4 border-b border-gray-200 dark:border-gray-700/50"><span class="text-xs font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">16vos de Final</span></div>
            <div class="text-center pb-4 border-b border-gray-200 dark:border-gray-700/50"><span class="text-xs font-black uppercase tracking-widest text-cyan-600 dark:text-cyan-400">Octavos</span></div>
            <div class="text-center pb-4 border-b border-gray-200 dark:border-gray-700/50"><span class="text-xs font-black uppercase tracking-widest text-violet-600 dark:text-violet-400">Cuartos</span></div>
            <div class="text-center pb-4 border-b border-gray-200 dark:border-gray-700/50"><span class="text-xs font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">Semis · Final</span></div>
            <div class="text-center pb-4 border-b border-gray-200 dark:border-gray-700/50"><span class="text-xs font-black uppercase tracking-widest text-violet-600 dark:text-violet-400">Cuartos</span></div>
            <div class="text-center pb-4 border-b border-gray-200 dark:border-gray-700/50"><span class="text-xs font-black uppercase tracking-widest text-cyan-600 dark:text-cyan-400">Octavos</span></div>
            <div class="text-center pb-4 border-b border-gray-200 dark:border-gray-700/50"><span class="text-xs font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">16vos de Final</span></div>

            <div class="space-y-2 pt-4">
              @for (m of leftBracket(); track m.matchNum) {
                <div class="bg-gray-50 dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700/60 overflow-hidden hover:border-blue-500/40 transition-colors">
                  <div class="flex items-center gap-2 px-3 py-2 border-b border-gray-100 dark:border-gray-700/40">
                    @if (m.home && m.home.logo) { <img [src]="m.home.logo" class="w-5 h-5 rounded object-cover shrink-0"> } @else { <div class="w-5 h-5 rounded bg-gray-200 dark:bg-gray-700 shrink-0"></div> }
                    <span class="text-xs font-bold text-gray-900 dark:text-white truncate flex-1" [class.opacity-50]="m.winner === 'away'">{{ m.home?.name || 'TBD' }}</span>
                    @if (m.home?.score != null) { <span class="text-xs font-bold text-gray-600 dark:text-gray-300">{{ m.home.score }}</span> }
                  </div>
                  <div class="flex items-center gap-2 px-3 py-2">
                    @if (m.away && m.away.logo) { <img [src]="m.away.logo" class="w-5 h-5 rounded object-cover shrink-0"> } @else { <div class="w-5 h-5 rounded bg-gray-200 dark:bg-gray-700 shrink-0"></div> }
                    <span class="text-xs font-bold text-gray-900 dark:text-white truncate flex-1" [class.opacity-50]="m.winner === 'home'">{{ m.away?.name || 'TBD' }}</span>
                    @if (m.away?.score != null) { <span class="text-xs font-bold text-gray-600 dark:text-gray-300">{{ m.away.score }}</span> }
                  </div>
                </div>
              }
            </div>

            <div class="flex flex-col justify-around pt-4">
              @for (r of leftR16(); track r.matchNum) {
                <div class="bg-cyan-50/50 dark:bg-gray-800/60 rounded-xl border border-cyan-300/40 dark:border-cyan-500/20 px-3 py-3 overflow-hidden">
                  <span class="text-[9px] font-bold text-cyan-600 dark:text-cyan-400 block text-center mb-1">M{{ r.matchNum }} · {{ r.date }}</span>
                  @if (r.home && r.home.name !== 'TBD') {
                    <div class="flex items-center gap-1.5 py-0.5" [class.font-black]="r.winner === 'home'">
                      @if (r.home.logo) { <img [src]="r.home.logo" class="w-4 h-4 rounded object-cover shrink-0"> }
                      <span class="text-[10px] text-gray-900 dark:text-white truncate flex-1">{{ r.home.name }}</span>
                      @if (r.home.score != null) { <span class="text-[10px] font-bold text-gray-600 dark:text-gray-300">{{ r.home.score }}</span> }
                    </div>
                    <div class="flex items-center gap-1.5 py-0.5" [class.font-black]="r.winner === 'away'">
                      @if (r.away!.logo) { <img [src]="r.away!.logo" class="w-4 h-4 rounded object-cover shrink-0"> }
                      <span class="text-[10px] text-gray-900 dark:text-white truncate flex-1">{{ r.away!.name }}</span>
                      @if (r.away!.score != null) { <span class="text-[10px] font-bold text-gray-600 dark:text-gray-300">{{ r.away!.score }}</span> }
                    </div>
                  } @else {
                    <p class="text-[9px] text-gray-500 text-center">W(M{{ r.from1 }}) vs W(M{{ r.from2 }})</p>
                  }
                </div>
              }
            </div>

            <div class="flex flex-col justify-around pt-4">
              @for (qf of leftQF(); track qf.matchNum) {
                <div class="bg-violet-50/50 dark:bg-gray-800/60 rounded-xl border border-violet-300/40 dark:border-violet-500/20 px-3 py-4 overflow-hidden">
                  <span class="text-[9px] font-bold text-violet-600 dark:text-violet-400 block text-center mb-1">M{{ qf.matchNum }} · {{ qf.date }}</span>
                  @if (qf.home && qf.home.name !== 'TBD') {
                    <div class="flex items-center gap-1.5 py-0.5" [class.font-black]="qf.winner === 'home'">
                      @if (qf.home.logo) { <img [src]="qf.home.logo" class="w-4 h-4 rounded object-cover shrink-0"> }
                      <span class="text-[10px] text-gray-900 dark:text-white truncate flex-1">{{ qf.home.name }}</span>
                      @if (qf.home.score != null) { <span class="text-[10px] font-bold text-gray-600 dark:text-gray-300">{{ qf.home.score }}</span> }
                    </div>
                    <div class="flex items-center gap-1.5 py-0.5" [class.font-black]="qf.winner === 'away'">
                      @if (qf.away!.logo) { <img [src]="qf.away!.logo" class="w-4 h-4 rounded object-cover shrink-0"> }
                      <span class="text-[10px] text-gray-900 dark:text-white truncate flex-1">{{ qf.away!.name }}</span>
                      @if (qf.away!.score != null) { <span class="text-[10px] font-bold text-gray-600 dark:text-gray-300">{{ qf.away!.score }}</span> }
                    </div>
                  } @else {
                    <p class="text-[9px] text-gray-500 text-center">W(M{{ qf.from1 }}) vs W(M{{ qf.from2 }})</p>
                  }
                </div>
              }
            </div>

            <div class="flex flex-col items-center justify-center gap-5 pt-4">
              <div class="bg-emerald-50/50 dark:bg-gray-800/60 rounded-xl border border-emerald-300/40 dark:border-emerald-500/20 px-4 py-3 w-full overflow-hidden">
                <span class="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 block text-center mb-1">SF1 · 14 Jul · Dallas</span>
                @if (semiFinal1().home && semiFinal1().home!.name !== 'TBD') {
                  <div class="flex items-center gap-1.5 py-0.5" [class.font-black]="semiFinal1().winner === 'home'">
                    @if (semiFinal1().home!.logo) { <img [src]="semiFinal1().home!.logo" class="w-4 h-4 rounded object-cover shrink-0"> }
                    <span class="text-[10px] text-gray-900 dark:text-white truncate flex-1">{{ semiFinal1().home!.name }}</span>
                    @if (semiFinal1().home!.score != null) { <span class="text-[10px] font-bold">{{ semiFinal1().home!.score }}</span> }
                  </div>
                  <div class="flex items-center gap-1.5 py-0.5" [class.font-black]="semiFinal1().winner === 'away'">
                    @if (semiFinal1().away!.logo) { <img [src]="semiFinal1().away!.logo" class="w-4 h-4 rounded object-cover shrink-0"> }
                    <span class="text-[10px] text-gray-900 dark:text-white truncate flex-1">{{ semiFinal1().away!.name }}</span>
                    @if (semiFinal1().away!.score != null) { <span class="text-[10px] font-bold">{{ semiFinal1().away!.score }}</span> }
                  </div>
                } @else {
                  <p class="text-[9px] text-gray-500 text-center">W(M97) vs W(M98)</p>
                }
              </div>
              <div class="bg-linear-to-b from-amber-900/30 to-yellow-900/20 rounded-2xl border border-amber-500/30 px-5 py-5 text-center w-full shadow-lg shadow-amber-500/5">
                <span class="text-4xl">🏆</span>
                <p class="text-sm font-black text-amber-400 mt-2">GRAN FINAL</p>
                <p class="text-[10px] text-amber-500/70 mt-1">19 Jul · MetLife Stadium</p>
                @if (finalMatch().home && finalMatch().home!.name !== 'TBD') {
                  <div class="mt-3 pt-2 border-t border-amber-600/20 space-y-1">
                    <div class="flex items-center justify-center gap-2" [class.font-black]="finalMatch().winner === 'home'">
                      @if (finalMatch().home!.logo) { <img [src]="finalMatch().home!.logo" class="w-5 h-5 rounded object-cover"> }
                      <span class="text-xs text-white">{{ finalMatch().home!.name }}</span>
                      @if (finalMatch().home!.score != null) { <span class="text-xs font-bold text-amber-300">{{ finalMatch().home!.score }}</span> }
                    </div>
                    <span class="text-[9px] text-gray-500">vs</span>
                    <div class="flex items-center justify-center gap-2" [class.font-black]="finalMatch().winner === 'away'">
                      @if (finalMatch().away!.logo) { <img [src]="finalMatch().away!.logo" class="w-5 h-5 rounded object-cover"> }
                      <span class="text-xs text-white">{{ finalMatch().away!.name }}</span>
                      @if (finalMatch().away!.score != null) { <span class="text-xs font-bold text-amber-300">{{ finalMatch().away!.score }}</span> }
                    </div>
                  </div>
                } @else {
                  <div class="mt-3 pt-3 border-t border-amber-600/20">
                    <p class="text-xs font-bold text-gray-400">Campeón 2026</p>
                    <p class="text-[10px] text-gray-500">Por definir</p>
                  </div>
                }
              </div>
              <div class="bg-emerald-50/50 dark:bg-gray-800/60 rounded-xl border border-emerald-300/40 dark:border-emerald-500/20 px-4 py-3 w-full overflow-hidden">
                <span class="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 block text-center mb-1">SF2 · 15 Jul · Atlanta</span>
                @if (semiFinal2().home && semiFinal2().home!.name !== 'TBD') {
                  <div class="flex items-center gap-1.5 py-0.5" [class.font-black]="semiFinal2().winner === 'home'">
                    @if (semiFinal2().home!.logo) { <img [src]="semiFinal2().home!.logo" class="w-4 h-4 rounded object-cover shrink-0"> }
                    <span class="text-[10px] text-gray-900 dark:text-white truncate flex-1">{{ semiFinal2().home!.name }}</span>
                    @if (semiFinal2().home!.score != null) { <span class="text-[10px] font-bold">{{ semiFinal2().home!.score }}</span> }
                  </div>
                  <div class="flex items-center gap-1.5 py-0.5" [class.font-black]="semiFinal2().winner === 'away'">
                    @if (semiFinal2().away!.logo) { <img [src]="semiFinal2().away!.logo" class="w-4 h-4 rounded object-cover shrink-0"> }
                    <span class="text-[10px] text-gray-900 dark:text-white truncate flex-1">{{ semiFinal2().away!.name }}</span>
                    @if (semiFinal2().away!.score != null) { <span class="text-[10px] font-bold">{{ semiFinal2().away!.score }}</span> }
                  </div>
                } @else {
                  <p class="text-[9px] text-gray-500 text-center">W(M99) vs W(M100)</p>
                }
              </div>
            </div>

            <div class="flex flex-col justify-around pt-4">
              @for (qf of rightQF(); track qf.matchNum) {
                <div class="bg-violet-50/50 dark:bg-gray-800/60 rounded-xl border border-violet-300/40 dark:border-violet-500/20 px-3 py-4 overflow-hidden">
                  <span class="text-[9px] font-bold text-violet-600 dark:text-violet-400 block text-center mb-1">M{{ qf.matchNum }} · {{ qf.date }}</span>
                  @if (qf.home && qf.home.name !== 'TBD') {
                    <div class="flex items-center gap-1.5 py-0.5" [class.font-black]="qf.winner === 'home'">
                      @if (qf.home.logo) { <img [src]="qf.home.logo" class="w-4 h-4 rounded object-cover shrink-0"> }
                      <span class="text-[10px] text-gray-900 dark:text-white truncate flex-1">{{ qf.home.name }}</span>
                      @if (qf.home.score != null) { <span class="text-[10px] font-bold text-gray-600 dark:text-gray-300">{{ qf.home.score }}</span> }
                    </div>
                    <div class="flex items-center gap-1.5 py-0.5" [class.font-black]="qf.winner === 'away'">
                      @if (qf.away!.logo) { <img [src]="qf.away!.logo" class="w-4 h-4 rounded object-cover shrink-0"> }
                      <span class="text-[10px] text-gray-900 dark:text-white truncate flex-1">{{ qf.away!.name }}</span>
                      @if (qf.away!.score != null) { <span class="text-[10px] font-bold text-gray-600 dark:text-gray-300">{{ qf.away!.score }}</span> }
                    </div>
                  } @else {
                    <p class="text-[9px] text-gray-500 text-center">W(M{{ qf.from1 }}) vs W(M{{ qf.from2 }})</p>
                  }
                </div>
              }
            </div>

            <div class="flex flex-col justify-around pt-4">
              @for (r of rightR16(); track r.matchNum) {
                <div class="bg-cyan-50/50 dark:bg-gray-800/60 rounded-xl border border-cyan-300/40 dark:border-cyan-500/20 px-3 py-3 overflow-hidden">
                  <span class="text-[9px] font-bold text-cyan-600 dark:text-cyan-400 block text-center mb-1">M{{ r.matchNum }} · {{ r.date }}</span>
                  @if (r.home && r.home.name !== 'TBD') {
                    <div class="flex items-center gap-1.5 py-0.5" [class.font-black]="r.winner === 'home'">
                      @if (r.home.logo) { <img [src]="r.home.logo" class="w-4 h-4 rounded object-cover shrink-0"> }
                      <span class="text-[10px] text-gray-900 dark:text-white truncate flex-1">{{ r.home.name }}</span>
                      @if (r.home.score != null) { <span class="text-[10px] font-bold text-gray-600 dark:text-gray-300">{{ r.home.score }}</span> }
                    </div>
                    <div class="flex items-center gap-1.5 py-0.5" [class.font-black]="r.winner === 'away'">
                      @if (r.away!.logo) { <img [src]="r.away!.logo" class="w-4 h-4 rounded object-cover shrink-0"> }
                      <span class="text-[10px] text-gray-900 dark:text-white truncate flex-1">{{ r.away!.name }}</span>
                      @if (r.away!.score != null) { <span class="text-[10px] font-bold text-gray-600 dark:text-gray-300">{{ r.away!.score }}</span> }
                    </div>
                  } @else {
                    <p class="text-[9px] text-gray-500 text-center">W(M{{ r.from1 }}) vs W(M{{ r.from2 }})</p>
                  }
                </div>
              }
            </div>

            <div class="space-y-2 pt-4">
              @for (m of rightBracket(); track m.matchNum) {
                <div class="bg-gray-50 dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700/60 overflow-hidden hover:border-blue-500/40 transition-colors">
                  <div class="flex items-center gap-2 px-3 py-2 border-b border-gray-100 dark:border-gray-700/40">
                    @if (m.home && m.home.logo) { <img [src]="m.home.logo" class="w-5 h-5 rounded object-cover shrink-0"> } @else { <div class="w-5 h-5 rounded bg-gray-200 dark:bg-gray-700 shrink-0"></div> }
                    <span class="text-xs font-bold text-gray-900 dark:text-white truncate flex-1" [class.opacity-50]="m.winner === 'away'">{{ m.home?.name || 'TBD' }}</span>
                    @if (m.home?.score != null) { <span class="text-xs font-bold text-gray-600 dark:text-gray-300">{{ m.home.score }}</span> }
                  </div>
                  <div class="flex items-center gap-2 px-3 py-2">
                    @if (m.away && m.away.logo) { <img [src]="m.away.logo" class="w-5 h-5 rounded object-cover shrink-0"> } @else { <div class="w-5 h-5 rounded bg-gray-200 dark:bg-gray-700 shrink-0"></div> }
                    <span class="text-xs font-bold text-gray-900 dark:text-white truncate flex-1" [class.opacity-50]="m.winner === 'home'">{{ m.away?.name || 'TBD' }}</span>
                    @if (m.away?.score != null) { <span class="text-xs font-bold text-gray-600 dark:text-gray-300">{{ m.away.score }}</span> }
                  </div>
                </div>
              }
            </div>
          </div>
        </div>

        <div class="mt-6 flex items-start gap-2 px-1 border-t border-gray-200 dark:border-gray-800 pt-4">
          <span class="material-symbols-outlined text-gray-600 text-sm shrink-0">info</span>
          <p class="text-[10px] text-gray-500">Datos del bracket directamente de ESPN. Los cruces se actualizan conforme avanzan los partidos.</p>
        </div>
      </div>
    }
  `
})
export class BracketComponent implements OnInit {
  readonly standingsService = inject(StandingsService);
  readonly bracketFullscreen = signal(false);

  ngOnInit() {
    this.standingsService.fetchStandings();
  }

  private readonly BRACKET: { matchNum: number; date: string; team1: string; team2: string }[] = [
    { matchNum: 74, date: 'Jun 29', team1: '1E', team2: '3ABCDF' },
    { matchNum: 77, date: 'Jun 30', team1: '1I', team2: '3CDFGH' },
    { matchNum: 73, date: 'Jun 28', team1: '2A', team2: '2B' },
    { matchNum: 75, date: 'Jun 29', team1: '1F', team2: '2C' },
    { matchNum: 83, date: 'Jul 2', team1: '2K', team2: '2L' },
    { matchNum: 84, date: 'Jul 2', team1: '1H', team2: '2J' },
    { matchNum: 81, date: 'Jul 1', team1: '1D', team2: '3BEFIJ' },
    { matchNum: 82, date: 'Jul 1', team1: '1G', team2: '3AEHIJ' },
    { matchNum: 76, date: 'Jun 29', team1: '1C', team2: '2F' },
    { matchNum: 78, date: 'Jun 30', team1: '2E', team2: '2I' },
    { matchNum: 79, date: 'Jun 30', team1: '1A', team2: '3CEFHI' },
    { matchNum: 80, date: 'Jul 1', team1: '1L', team2: '3EHIJK' },
    { matchNum: 86, date: 'Jul 3', team1: '1J', team2: '2H' },
    { matchNum: 88, date: 'Jul 3', team1: '2D', team2: '2G' },
    { matchNum: 85, date: 'Jul 2', team1: '1B', team2: '3EFGIJ' },
    { matchNum: 87, date: 'Jul 3', team1: '1K', team2: '3DEIJL' },
  ];

  readonly bracketMatches = computed((): BracketMatch[] => {
    const grouped = this.standingsService.groupedStandings();
    const thirdAssignment = this.assignThirdsToSlots(grouped);

    return this.BRACKET.map(b => ({
      matchNum: b.matchNum,
      date: b.date,
      ...this.resolveTeamWithAssignment(b.team1, grouped, thirdAssignment),
      ...this.resolveTeam2WithAssignment(b.team2, grouped, thirdAssignment),
    }));
  });

  readonly leftBracket = computed((): KnockoutSlot[] => {
    const koMap = this.standingsService.knockoutByMatchNum();
    const matchNums = [74, 77, 73, 75, 83, 84, 81, 82];
    return matchNums.map(num => {
      const match = koMap.get(num);
      return {
        matchNum: num,
        date: match?.date ? this.formatMatchDate(match.date) : '',
        from1: 0,
        from2: 0,
        home: match?.home ? { name: translateTeamName(match.home.name), logo: match.home.logo, score: match.home.score } : null,
        away: match?.away ? { name: translateTeamName(match.away.name), logo: match.away.logo, score: match.away.score } : null,
        winner: match?.winner ?? null,
        status: match?.status ?? 'STATUS_SCHEDULED',
      };
    });
  });

  readonly rightBracket = computed((): KnockoutSlot[] => {
    const koMap = this.standingsService.knockoutByMatchNum();
    const matchNums = [76, 78, 79, 80, 86, 88, 85, 87];
    return matchNums.map(num => {
      const match = koMap.get(num);
      return {
        matchNum: num,
        date: match?.date ? this.formatMatchDate(match.date) : '',
        from1: 0,
        from2: 0,
        home: match?.home ? { name: translateTeamName(match.home.name), logo: match.home.logo, score: match.home.score } : null,
        away: match?.away ? { name: translateTeamName(match.away.name), logo: match.away.logo, score: match.away.score } : null,
        winner: match?.winner ?? null,
        status: match?.status ?? 'STATUS_SCHEDULED',
      };
    });
  });

  readonly leftR16 = computed((): KnockoutSlot[] => this.resolveKnockoutSlots([
    { matchNum: 89, date: '4 Jul', from1: 74, from2: 77 },
    { matchNum: 90, date: '4 Jul', from1: 73, from2: 75 },
    { matchNum: 93, date: '6 Jul', from1: 83, from2: 84 },
    { matchNum: 94, date: '6 Jul', from1: 81, from2: 82 },
  ]));

  readonly rightR16 = computed((): KnockoutSlot[] => this.resolveKnockoutSlots([
    { matchNum: 91, date: '5 Jul', from1: 76, from2: 78 },
    { matchNum: 92, date: '5 Jul', from1: 79, from2: 80 },
    { matchNum: 95, date: '7 Jul', from1: 86, from2: 88 },
    { matchNum: 96, date: '7 Jul', from1: 85, from2: 87 },
  ]));

  readonly leftQF = computed((): KnockoutSlot[] => this.resolveKnockoutSlots([
    { matchNum: 97, date: '9 Jul', from1: 89, from2: 90 },
    { matchNum: 98, date: '10 Jul', from1: 93, from2: 94 },
  ]));

  readonly rightQF = computed((): KnockoutSlot[] => this.resolveKnockoutSlots([
    { matchNum: 99, date: '11 Jul', from1: 91, from2: 92 },
    { matchNum: 100, date: '11 Jul', from1: 95, from2: 96 },
  ]));

  readonly semiFinal1 = computed((): KnockoutSlot => this.resolveKnockoutSlots([
    { matchNum: 101, date: '14 Jul', from1: 97, from2: 98 },
  ])[0]);

  readonly semiFinal2 = computed((): KnockoutSlot => this.resolveKnockoutSlots([
    { matchNum: 102, date: '15 Jul', from1: 99, from2: 100 },
  ])[0]);

  readonly finalMatch = computed((): KnockoutSlot => this.resolveKnockoutSlots([
    { matchNum: 104, date: '19 Jul', from1: 101, from2: 102 },
  ])[0]);

  private resolveKnockoutSlots(slots: { matchNum: number; date: string; from1: number; from2: number }[]): KnockoutSlot[] {
    const koMap = this.standingsService.knockoutByMatchNum();
    return slots.map(s => {
      const match = koMap.get(s.matchNum);
      return {
        ...s,
        home: match?.home ? { name: translateTeamName(match.home.name), logo: match.home.logo, score: match.home.score } : null,
        away: match?.away ? { name: translateTeamName(match.away.name), logo: match.away.logo, score: match.away.score } : null,
        winner: match?.winner ?? null,
        status: match?.status ?? 'STATUS_SCHEDULED',
      };
    });
  }

  private assignThirdsToSlots(grouped: Map<string, GroupStanding[]>): Map<string, GroupStanding> {
    const assignment = new Map<string, GroupStanding>();

    let bestThirds = grouped.get('best-thirds') ?? [];
    if (bestThirds.length === 0) {
      bestThirds = this.calculateBestThirds(grouped);
    } else {
      bestThirds = bestThirds.slice(0, 8);
    }

    if (bestThirds.length === 0) return assignment;

    const thirdToGroup = new Map<string, string>();
    for (const third of bestThirds) {
      for (const [groupName, teams] of grouped) {
        if (!groupName.startsWith('Group ')) continue;
        if (teams.length >= 3 && teams[2].team === third.team) {
          thirdToGroup.set(third.team, groupName.replace('Group ', ''));
          break;
        }
      }
    }

    const slotCodes = ['3ABCDF', '3CDFGH', '3CEFHI', '3EHIJK', '3BEFIJ', '3AEHIJ', '3EFGIJ', '3DEIJL'];

    this.backtrackAssign(slotCodes, 0, bestThirds, thirdToGroup, new Set(), assignment);

    return assignment;
  }

  private backtrackAssign(
    slots: string[],
    idx: number,
    thirds: GroupStanding[],
    thirdToGroup: Map<string, string>,
    used: Set<string>,
    assignment: Map<string, GroupStanding>
  ): boolean {
    if (idx === slots.length) return true;

    const slot = slots[idx];
    const eligibleGroups = slot.slice(1).split('');

    for (const third of thirds) {
      if (used.has(third.team)) continue;
      const group = thirdToGroup.get(third.team);
      if (!group || !eligibleGroups.includes(group)) continue;

      used.add(third.team);
      assignment.set(slot, third);

      if (this.backtrackAssign(slots, idx + 1, thirds, thirdToGroup, used, assignment)) {
        return true;
      }

      used.delete(third.team);
      assignment.delete(slot);
    }
    return false;
  }

  private resolveTeamWithAssignment(code: string, grouped: Map<string, GroupStanding[]>, thirdAssignment: Map<string, GroupStanding>): { team1Label: string; team1Name: string; team1Flag: string } {
    const info = this.resolveSlotFinal(code, grouped, thirdAssignment);
    return { team1Label: info.label, team1Name: info.name, team1Flag: info.flag };
  }

  private resolveTeam2WithAssignment(code: string, grouped: Map<string, GroupStanding[]>, thirdAssignment: Map<string, GroupStanding>): { team2Label: string; team2Name: string; team2Flag: string } {
    const info = this.resolveSlotFinal(code, grouped, thirdAssignment);
    return { team2Label: info.label, team2Name: info.name, team2Flag: info.flag };
  }

  private resolveSlotFinal(code: string, grouped: Map<string, GroupStanding[]>, thirdAssignment: Map<string, GroupStanding>): { label: string; name: string; flag: string } {
    if (code.startsWith('3')) {
      const groups = code.slice(1).split('');
      const label = `3° ${groups.join('/')}`;
      const assigned = thirdAssignment.get(code);
      if (assigned) {
        return { label, name: translateTeamName(assigned.team), flag: assigned.team_logo || '' };
      }
      return { label, name: 'Por definir', flag: '' };
    }

    const rank = parseInt(code[0]);
    const groupLetter = code[1];
    const groupName = `Group ${groupLetter}`;
    const groupTeams = grouped.get(groupName) ?? [];
    const team = groupTeams[rank - 1];
    const label = rank === 1 ? `1° Grupo ${groupLetter}` : `2° Grupo ${groupLetter}`;

    if (team) {
      return { label, name: translateTeamName(team.team), flag: team.team_logo || '' };
    }
    return { label, name: 'Por definir', flag: '' };
  }

  private calculateBestThirds(grouped: Map<string, GroupStanding[]>): GroupStanding[] {
    return this.calculateAllThirds(grouped).slice(0, 8);
  }

  private calculateAllThirds(grouped: Map<string, GroupStanding[]>): GroupStanding[] {
    const thirds: GroupStanding[] = [];
    for (const [groupName, teams] of grouped) {
      if (groupName === 'best-thirds') continue;
      if (!groupName.startsWith('Group ')) continue;
      if (teams.length >= 3) {
        thirds.push(teams[2]);
      }
    }
    thirds.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.gd !== a.gd) return b.gd - a.gd;
      return b.gf - a.gf;
    });
    return thirds;
  }

  private formatMatchDate(kickoffAt: string): string {
    const date = new Date(kickoffAt);
    const day = date.getDate();
    const month = date.toLocaleDateString('es', { month: 'short' });
    const time = formatKickoffTime(kickoffAt);
    return `${day} ${month} · ${time}`;
  }
}