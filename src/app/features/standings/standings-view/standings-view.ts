import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { StandingsService } from '../../../core/services/standings-service';
import { StandingsTableComponent } from '../standings-table/standings-table';
import { CommonModule } from '@angular/common';
import { Match } from '../../../core/models/match-model';
import { GroupStanding } from '../../../core/models/standings-model';
import { KnockoutMatch } from '../../../core/models/bracket-model';
import { formatKickoffTime } from '../../../shared/utils/match-format-util';
import { translateTeamName } from '../../../shared/utils/team-name-util';

type TabId = 'grupos' | 'terceros' | 'cruces';

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
  selector: 'app-standings-view',
  standalone: true,
  imports: [CommonModule, StandingsTableComponent],
  template: `
    <div class="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 pb-24">
      <div class="bg-gray-50 dark:bg-[#0a0e17] border-b border-gray-200 dark:border-white/5">
        <div class="max-w-7xl mx-auto px-4">
          <nav class="flex gap-1">
            <button (click)="activeTab.set('grupos')" [class]="activeTab() === 'grupos' ? 'px-5 py-3 text-sm font-semibold text-gray-900 dark:text-white border-b-2 border-blue-500' : 'px-5 py-3 text-sm font-medium text-gray-500 dark:text-gray-400 border-b-2 border-transparent'">
              <span class="material-symbols-outlined text-sm align-middle mr-1">groups</span> Grupos
            </button>
            <button (click)="activeTab.set('terceros')" [class]="activeTab() === 'terceros' ? 'px-5 py-3 text-sm font-semibold text-gray-900 dark:text-white border-b-2 border-blue-500' : 'px-5 py-3 text-sm font-medium text-gray-500 dark:text-gray-400 border-b-2 border-transparent'">
              <span class="material-symbols-outlined text-sm align-middle mr-1">format_list_numbered</span> Mejores Terceros
            </button>
            <button (click)="activeTab.set('cruces')" [class]="activeTab() === 'cruces' ? 'px-5 py-3 text-sm font-semibold text-gray-900 dark:text-white border-b-2 border-blue-500' : 'px-5 py-3 text-sm font-medium text-gray-500 dark:text-gray-400 border-b-2 border-transparent'">
              <span class="material-symbols-outlined text-sm align-middle mr-1">account_tree</span> Fase Final
            </button>
          </nav>
        </div>
      </div>

      <div class="mx-auto px-4 py-8" [class]="activeTab() === 'cruces' ? 'max-w-[1600px]' : 'max-w-4xl'">
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
        } @else if (activeTab() === 'grupos') {
          @for (group of standingsService.groupedStandings() | keyvalue; track group.key) {
            @if (group.key !== 'best-thirds') {
              <app-standings-table [groupName]="group.key" [standings]="group.value" />
              @if (getUpcomingForGroup(group.key).length > 0) {
                <div class="mb-8 -mt-4 px-2">
                  <h4 class="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2 px-3">Próximos enfrentamientos</h4>
                  <div class="space-y-2">
                    @for (match of getUpcomingForGroup(group.key); track match.id) {
                      <div class="flex items-center gap-3 px-3 py-2.5 bg-white dark:bg-gray-800/40 rounded-xl border border-gray-100 dark:border-gray-700/30">
                        <div class="flex items-center gap-2 flex-1 min-w-0 justify-end">
                          <span class="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{{ match.home_team }}</span>
                          <img [src]="match.home_flag" [alt]="match.home_team" class="w-5 h-5 rounded-sm object-cover shrink-0">
                        </div>
                        <div class="flex flex-col items-center shrink-0">
                          <span class="text-[10px] font-bold text-gray-400 dark:text-gray-500">vs</span>
                          <span class="text-[9px] text-gray-400 dark:text-gray-500">{{ formatMatchDate(match.kickoff_at) }}</span>
                        </div>
                        <div class="flex items-center gap-2 flex-1 min-w-0">
                          <img [src]="match.away_flag" [alt]="match.away_team" class="w-5 h-5 rounded-sm object-cover shrink-0">
                          <span class="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{{ match.away_team }}</span>
                        </div>
                      </div>
                    }
                  </div>
                </div>
              }
            }
          }
        } @else if (activeTab() === 'terceros') {
          <div class="mb-4">
            <div class="bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-700/20 rounded-2xl p-4">
              <p class="text-xs text-amber-700 dark:text-amber-300 font-medium">Los <strong>8 mejores terceros</strong> de los 12 grupos clasifican a los 16vos de Final. Se ordenan por puntos, diferencia de goles y goles a favor.</p>
            </div>
          </div>
          @if (getBestThirds().length > 0) {
            <app-standings-table [groupName]="'Mejores Terceros'" [standings]="getBestThirds()" [qualifyCount]="8" />
          } @else {
            <div class="text-center py-12 text-gray-500 dark:text-gray-400 text-sm">Datos no disponibles aún</div>
          }
        } @else {
          <!-- BRACKET ÁRBOL SIMÉTRICO -->
          <div class="bg-white dark:bg-[#0a0e17] rounded-2xl p-5 sm:p-8 border border-gray-200 dark:border-gray-800 shadow-lg">
            <div class="flex items-center justify-center gap-2 mb-8">
              <span class="material-symbols-outlined text-amber-500 dark:text-amber-400 text-xl">trophy</span>
              <span class="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest">Bracket Fase Final — Proyección en vivo</span>
            </div>

            <div class="overflow-x-auto pb-3">
              <div class="min-w-[1400px] grid grid-cols-[1.2fr_1fr_1fr_0.8fr_1fr_1fr_1.2fr] gap-x-3 items-stretch">
                <!-- HEADERS -->
                <div class="text-center pb-4 border-b border-gray-200 dark:border-gray-700/50"><span class="text-xs font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">16vos de Final</span></div>
                <div class="text-center pb-4 border-b border-gray-200 dark:border-gray-700/50"><span class="text-xs font-black uppercase tracking-widest text-cyan-600 dark:text-cyan-400">Octavos</span></div>
                <div class="text-center pb-4 border-b border-gray-200 dark:border-gray-700/50"><span class="text-xs font-black uppercase tracking-widest text-violet-600 dark:text-violet-400">Cuartos</span></div>
                <div class="text-center pb-4 border-b border-gray-200 dark:border-gray-700/50"><span class="text-xs font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">Semis · Final</span></div>
                <div class="text-center pb-4 border-b border-gray-200 dark:border-gray-700/50"><span class="text-xs font-black uppercase tracking-widest text-violet-600 dark:text-violet-400">Cuartos</span></div>
                <div class="text-center pb-4 border-b border-gray-200 dark:border-gray-700/50"><span class="text-xs font-black uppercase tracking-widest text-cyan-600 dark:text-cyan-400">Octavos</span></div>
                <div class="text-center pb-4 border-b border-gray-200 dark:border-gray-700/50"><span class="text-xs font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">16vos de Final</span></div>

                <!-- LEFT R32 (8 matches) -->
                <div class="space-y-2 pt-4">
                  @for (m of leftBracket(); track m.matchNum) {
                    <div class="bg-gray-50 dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700/60 overflow-hidden hover:border-blue-500/40 transition-colors">
                      <div class="flex items-center gap-2 px-3 py-2 border-b border-gray-100 dark:border-gray-700/40">
                        @if (m.team1Flag) { <img [src]="m.team1Flag" class="w-5 h-5 rounded object-cover shrink-0"> } @else { <div class="w-5 h-5 rounded bg-gray-200 dark:bg-gray-700 shrink-0"></div> }
                        <span class="text-xs font-bold text-gray-900 dark:text-white truncate flex-1">{{ m.team1Name }}</span>
                        <span class="text-[9px] text-gray-400 shrink-0">{{ m.team1Label }}</span>
                      </div>
                      <div class="flex items-center gap-2 px-3 py-2">
                        @if (m.team2Flag) { <img [src]="m.team2Flag" class="w-5 h-5 rounded object-cover shrink-0"> } @else { <div class="w-5 h-5 rounded bg-gray-200 dark:bg-gray-700 shrink-0"></div> }
                        <span class="text-xs font-bold text-gray-900 dark:text-white truncate flex-1">{{ m.team2Name }}</span>
                        <span class="text-[9px] text-gray-400 shrink-0">{{ m.team2Label }}</span>
                      </div>
                    </div>
                  }
                </div>

                <!-- LEFT OCTAVOS (4 slots) -->
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

                <!-- LEFT CUARTOS (2 slots) -->
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

                <!-- CENTER: 1 SEMI arriba + FINAL centro + 1 SEMI abajo -->
                <div class="flex flex-col items-center justify-center gap-5 pt-4">
                  <!-- SF1 -->
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
                  <!-- FINAL -->
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
                  <!-- SF2 -->
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

                <!-- RIGHT CUARTOS (2 slots) -->
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

                <!-- RIGHT OCTAVOS (4 slots) -->
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

                <!-- RIGHT R32 (8 matches) -->
                <div class="space-y-2 pt-4">
                  @for (m of rightBracket(); track m.matchNum) {
                    <div class="bg-gray-50 dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700/60 overflow-hidden hover:border-blue-500/40 transition-colors">
                      <div class="flex items-center gap-2 px-3 py-2 border-b border-gray-100 dark:border-gray-700/40">
                        @if (m.team1Flag) { <img [src]="m.team1Flag" class="w-5 h-5 rounded object-cover shrink-0"> } @else { <div class="w-5 h-5 rounded bg-gray-200 dark:bg-gray-700 shrink-0"></div> }
                        <span class="text-xs font-bold text-gray-900 dark:text-white truncate flex-1">{{ m.team1Name }}</span>
                        <span class="text-[9px] text-gray-400 shrink-0">{{ m.team1Label }}</span>
                      </div>
                      <div class="flex items-center gap-2 px-3 py-2">
                        @if (m.team2Flag) { <img [src]="m.team2Flag" class="w-5 h-5 rounded object-cover shrink-0"> } @else { <div class="w-5 h-5 rounded bg-gray-200 dark:bg-gray-700 shrink-0"></div> }
                        <span class="text-xs font-bold text-gray-900 dark:text-white truncate flex-1">{{ m.team2Name }}</span>
                        <span class="text-[9px] text-gray-400 shrink-0">{{ m.team2Label }}</span>
                      </div>
                    </div>
                  }
                </div>
              </div>
            </div>

            <div class="mt-6 flex items-start gap-2 px-1 border-t border-gray-200 dark:border-gray-800 pt-4">
              <span class="material-symbols-outlined text-gray-600 text-sm shrink-0">info</span>
              <p class="text-[10px] text-gray-500">Los cruces se basan en el formato del torneo: 1° de grupo vs 2° de grupo según el cuadro oficial. Los 8 mejores terceros se distribuyen según tabla de combinaciones FIFA.</p>
            </div>
          </div>
        }
      </div>
    </div>
  `
})
export class StandingsViewComponent implements OnInit {
  readonly standingsService = inject(StandingsService);
  readonly activeTab = signal<TabId>('grupos');

  ngOnInit() {
    this.standingsService.fetchStandings();
  }

  private readonly BRACKET: { matchNum: number; date: string; team1: string; team2: string }[] = [
    // LEFT SIDE — alimenta SF1 (QF97: M89 vs M90, QF98: M93 vs M94)
    // Octavo M89 = W74 vs W77
    { matchNum: 74, date: 'Jun 29', team1: '1E', team2: '3ABCDF' },
    { matchNum: 77, date: 'Jun 30', team1: '1I', team2: '3CDFGH' },
    // Octavo M90 = W73 vs W75
    { matchNum: 73, date: 'Jun 28', team1: '2A', team2: '2B' },
    { matchNum: 75, date: 'Jun 29', team1: '1F', team2: '2C' },
    // Octavo M93 = W83 vs W84
    { matchNum: 83, date: 'Jul 2', team1: '2K', team2: '2L' },
    { matchNum: 84, date: 'Jul 2', team1: '1H', team2: '2J' },
    // Octavo M94 = W81 vs W82
    { matchNum: 81, date: 'Jul 1', team1: '1D', team2: '3BEFIJ' },
    { matchNum: 82, date: 'Jul 1', team1: '1G', team2: '3AEHIJ' },
    // RIGHT SIDE — alimenta SF2 (QF99: M91 vs M92, QF100: M95 vs M96)
    // Octavo M91 = W76 vs W78
    { matchNum: 76, date: 'Jun 29', team1: '1C', team2: '2F' },
    { matchNum: 78, date: 'Jun 30', team1: '2E', team2: '2I' },
    // Octavo M92 = W79 vs W80
    { matchNum: 79, date: 'Jun 30', team1: '1A', team2: '3CEFHI' },
    { matchNum: 80, date: 'Jul 1', team1: '1L', team2: '3EHIJK' },
    // Octavo M95 = W86 vs W88
    { matchNum: 86, date: 'Jul 3', team1: '1J', team2: '2H' },
    { matchNum: 88, date: 'Jul 3', team1: '2D', team2: '2G' },
    // Octavo M96 = W85 vs W87
    { matchNum: 85, date: 'Jul 2', team1: '1B', team2: '3EFGIJ' },
    { matchNum: 87, date: 'Jul 3', team1: '1K', team2: '3DEIJL' },
  ];

  readonly bracketMatches = computed((): BracketMatch[] => {
    const grouped = this.standingsService.groupedStandings();

    // Pre-calculate the assignment of thirds using FIFA combination table
    const thirdAssignment = this.assignThirdsToSlots(grouped);

    return this.BRACKET.map(b => ({
      matchNum: b.matchNum,
      date: b.date,
      ...this.resolveTeamWithAssignment(b.team1, grouped, thirdAssignment),
      ...this.resolveTeam2WithAssignment(b.team2, grouped, thirdAssignment),
    }));
  });

  readonly leftBracket = computed(() => this.bracketMatches().slice(0, 8));
  readonly rightBracket = computed(() => this.bracketMatches().slice(8, 16));

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
        home: match?.home ? { name: match.home.name, logo: match.home.logo, score: match.home.score } : null,
        away: match?.away ? { name: match.away.name, logo: match.away.logo, score: match.away.score } : null,
        winner: match?.winner ?? null,
        status: match?.status ?? 'STATUS_SCHEDULED',
      };
    });
  }

  /**
   * Assigns each qualifying 3rd-place team to a specific bracket slot.
   * Uses backtracking to find a valid assignment where all 8 slots are filled.
   */
  private assignThirdsToSlots(grouped: Map<string, GroupStanding[]>): Map<string, GroupStanding> {
    const assignment = new Map<string, GroupStanding>();

    let bestThirds = grouped.get('best-thirds') ?? [];
    if (bestThirds.length === 0) {
      bestThirds = this.calculateBestThirds(grouped);
    } else {
      bestThirds = bestThirds.slice(0, 8);
    }

    if (bestThirds.length === 0) return assignment;

    // Find which group each qualifying 3rd belongs to
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

    // Slot codes from BRACKET (order matters for bracket display)
    const slotCodes = ['3ABCDF', '3CDFGH', '3CEFHI', '3EHIJK', '3BEFIJ', '3AEHIJ', '3EFGIJ', '3DEIJL'];

    // Use backtracking to find valid assignment
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

  /**
   * Calcula los 8 mejores terceros a partir de los grupos reales.
   * Toma el 3° de cada grupo (rank index 2) y los ordena por puntos > GD > GF.
   */
  private calculateBestThirds(grouped: Map<string, GroupStanding[]>): GroupStanding[] {
    return this.calculateAllThirds(grouped).slice(0, 8);
  }

  /**
   * Calcula todos los 12 terceros ordenados para mostrar en tabla.
   */
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

  getUpcomingForGroup(groupName: string): Match[] {
    return this.standingsService.upcomingByGroup().get(groupName) ?? [];
  }

  getBestThirds(): GroupStanding[] {
    const grouped = this.standingsService.groupedStandings();
    const fromDb = grouped.get('best-thirds') ?? [];
    if (fromDb.length > 0) return fromDb;
    // Fallback: calculate all 12 thirds (not just 8) for the table display
    return this.calculateAllThirds(grouped);
  }

  formatMatchDate(kickoffAt: string): string {
    const date = new Date(kickoffAt);
    const day = date.getDate();
    const month = date.toLocaleDateString('es', { month: 'short' });
    const time = formatKickoffTime(kickoffAt);
    return `${day} ${month} · ${time}`;
  }
}
