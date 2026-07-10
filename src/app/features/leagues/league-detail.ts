import { Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap, tap } from 'rxjs';
import { getLeague } from '../../shared/constants/leagues';
import { Match } from '../../core/models/match-model';
import { GroupStanding } from '../../core/models/standings-model';
import { LeagueDataService, ScorerRow } from '../../core/services/league-data-service';
import { BracketComponent } from '../bracket/bracket-view';
import { APP_CONSTANTS } from '../../shared/constants/app-constants';
import { translateTeamName } from '../../shared/utils/team-name-util';

type MatchTabId = 'live' | 'scheduled' | 'finished';
type LeagueTabId = 'matches' | 'standings' | 'scorers' | 'cruces';
type ScorerCategoryId = 'goals' | 'assists';

@Component({
  selector: 'app-league-detail',
  imports: [RouterLink, BracketComponent],
  template: `
    <div class="min-h-screen bg-gray-50 dark:bg-[#0a0e17] pb-24">
      @if (league(); as lg) {
        <!-- Header strip con branding de la liga -->
        <div class="relative overflow-hidden">
          <div [class]="'absolute inset-0 bg-linear-to-br ' + lg.accent + ' opacity-90'"></div>
          <div class="absolute inset-0 bg-black/10"></div>

          <div class="relative max-w-6xl mx-auto px-4 py-8">
            <a
              [routerLink]="['/ligas']"
              class="mb-4 inline-flex items-center gap-2 text-white/80 hover:text-white text-sm font-medium transition-colors cursor-pointer"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
              </svg>
              Todas las ligas
            </a>

            <div class="flex items-center gap-4">
              <div [class]="'shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center font-black text-white text-xl sm:text-2xl shadow-2xl bg-white/20 backdrop-blur-sm'">
                {{ lg.shortName.slice(0, 4) }}
              </div>
              <div class="min-w-0">
                <h1 class="text-2xl sm:text-3xl font-black text-white tracking-tight">{{ lg.name }}</h1>
                <p class="text-sm text-white/80">{{ lg.country }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Tabs con roles ARIA -->
        <div
          role="tablist"
          aria-label="Secciones de la liga"
          class="bg-gray-50 dark:bg-[#0a0e17] border-b border-gray-200 dark:border-white/5 sticky top-0 z-20 backdrop-blur-md"
        >
          <div class="max-w-6xl mx-auto px-4">
            <nav class="flex gap-1">
              <button
                type="button"
                role="tab"
                [id]="tabId('matches')"
                [attr.aria-selected]="activeTab() === 'matches'"
                [attr.aria-controls]="panelId('matches')"
                [attr.tabindex]="activeTab() === 'matches' ? 0 : -1"
                (click)="activeTab.set('matches')"
                (keydown)="onTabKey($event, 'matches')"
                [class.text-gray-900]="activeTab() === 'matches'"
                [class.dark:text-white]="activeTab() === 'matches'"
                [class.font-semibold]="activeTab() === 'matches'"
                [class.border-blue-500]="activeTab() === 'matches'"
                [class.text-gray-500]="activeTab() !== 'matches'"
                [class.dark:text-gray-400]="activeTab() !== 'matches'"
                [class.font-medium]="activeTab() !== 'matches'"
                [class.hover:text-gray-700]="activeTab() !== 'matches'"
                [class.dark:hover:text-gray-200]="activeTab() !== 'matches'"
                [class.cursor-pointer]="activeTab() !== 'matches'"
                class="relative px-5 py-3.5 text-sm border-b-2 border-transparent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                Partidos
              </button>
              <button
                type="button"
                role="tab"
                [id]="tabId('standings')"
                [attr.aria-selected]="activeTab() === 'standings'"
                [attr.aria-controls]="panelId('standings')"
                [attr.tabindex]="activeTab() === 'standings' ? 0 : -1"
                (click)="activeTab.set('standings')"
                (keydown)="onTabKey($event, 'standings')"
                [class.text-gray-900]="activeTab() === 'standings'"
                [class.dark:text-white]="activeTab() === 'standings'"
                [class.font-semibold]="activeTab() === 'standings'"
                [class.border-blue-500]="activeTab() === 'standings'"
                [class.text-gray-500]="activeTab() !== 'standings'"
                [class.dark:text-gray-400]="activeTab() !== 'standings'"
                [class.font-medium]="activeTab() !== 'standings'"
                [class.hover:text-gray-700]="activeTab() !== 'standings'"
                [class.dark:hover:text-gray-200]="activeTab() !== 'standings'"
                [class.cursor-pointer]="activeTab() !== 'standings'"
                class="relative px-5 py-3.5 text-sm border-b-2 border-transparent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                Posiciones
              </button>
              <button
                type="button"
                role="tab"
                [id]="tabId('scorers')"
                [attr.aria-selected]="activeTab() === 'scorers'"
                [attr.aria-controls]="panelId('scorers')"
                [attr.tabindex]="activeTab() === 'scorers' ? 0 : -1"
                (click)="activeTab.set('scorers')"
                (keydown)="onTabKey($event, 'scorers')"
                [class.text-gray-900]="activeTab() === 'scorers'"
                [class.dark:text-white]="activeTab() === 'scorers'"
                [class.font-semibold]="activeTab() === 'scorers'"
                [class.border-blue-500]="activeTab() === 'scorers'"
                [class.text-gray-500]="activeTab() !== 'scorers'"
                [class.dark:text-gray-400]="activeTab() !== 'scorers'"
                [class.font-medium]="activeTab() !== 'scorers'"
                [class.hover:text-gray-700]="activeTab() !== 'scorers'"
                [class.dark:hover:text-gray-200]="activeTab() !== 'scorers'"
                [class.cursor-pointer]="activeTab() !== 'scorers'"
                class="relative px-5 py-3.5 text-sm border-b-2 border-transparent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                Goleadores
              </button>
              @if (slug() === 'worldcup') {
                <button
                  type="button"
                  role="tab"
                  [id]="tabId('cruces')"
                  [attr.aria-selected]="activeTab() === 'cruces'"
                  [attr.aria-controls]="panelId('cruces')"
                  [attr.tabindex]="activeTab() === 'cruces' ? 0 : -1"
                  (click)="activeTab.set('cruces')"
                  (keydown)="onTabKey($event, 'cruces')"
                  [class.text-gray-900]="activeTab() === 'cruces'"
                  [class.dark:text-white]="activeTab() === 'cruces'"
                  [class.font-semibold]="activeTab() === 'cruces'"
                  [class.border-blue-500]="activeTab() === 'cruces'"
                  [class.text-gray-500]="activeTab() !== 'cruces'"
                  [class.dark:text-gray-400]="activeTab() !== 'cruces'"
                  [class.font-medium]="activeTab() !== 'cruces'"
                  [class.hover:text-gray-700]="activeTab() !== 'cruces'"
                  [class.dark:hover:text-gray-200]="activeTab() !== 'cruces'"
                  [class.cursor-pointer]="activeTab() !== 'cruces'"
                  class="relative px-5 py-3.5 text-sm border-b-2 border-transparent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  Cruces
                </button>
              }
            </nav>
          </div>
        </div>
      }

      <!-- Panels ARIA — uno solo activo a la vez. Cargan al activarse (lazy per-tab). -->
      <div class="max-w-6xl mx-auto px-4 py-6">
        @switch (activeTab()) {
          @case ('matches') {
            <section
              role="tabpanel"
              [id]="panelId('matches')"
              [attr.aria-labelledby]="tabId('matches')"
              [attr.tabindex]="0"
              class="focus:outline-none"
            >
              <!-- Sub-tabs de estado de partido -->
              <div class="flex gap-1 mb-4 bg-white dark:bg-[#111827] border border-gray-200 dark:border-white/5 rounded-lg p-1">
                @for (st of matchStatusTabs; track st.id) {
                  <button
                    type="button"
                    (click)="matchStatus.set(st.id)"
                    [class.flex-1]="true"
                    [class.px-3]="true"
                    [class.py-2]="true"
                    [class.text-xs]="true"
                    [class.rounded-md]="true"
                    [class.transition-all]="true"
                    [class.text-gray-900]="matchStatus() === st.id"
                    [class.dark:text-white]="matchStatus() === st.id"
                    [class.bg-gray-100]="matchStatus() === st.id"
                    [class.dark:bg-white/5]="matchStatus() === st.id"
                    [class.font-semibold]="matchStatus() === st.id"
                    [class.text-gray-500]="matchStatus() !== st.id"
                    [class.dark:text-gray-400]="matchStatus() !== st.id"
                    [class.font-medium]="matchStatus() !== st.id"
                    [class.hover:text-gray-700]="matchStatus() !== st.id"
                    [class.dark:hover:text-gray-200]="matchStatus() !== st.id"
                    [class.cursor-pointer]="matchStatus() !== st.id"
                  >
                    {{ st.label }}
                    @if (countByStatus()[st.id] > 0) {
                      <span class="ml-1 text-[10px] text-gray-400 dark:text-gray-500">({{ countByStatus()[st.id] }})</span>
                    }
                  </button>
                }
              </div>

              @if (matchesLoading()) {
                <div class="space-y-2">
                  @for (i of [1,2,3,4]; track i) {
                    <div class="bg-white dark:bg-[#111827] border border-gray-200 dark:border-white/5 rounded-lg p-4 animate-pulse">
                      <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700"></div>
                        <div class="flex-1 space-y-2">
                          <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                          <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                        </div>
                      </div>
                    </div>
                  }
                </div>
              } @else if (filteredMatches().length === 0) {
                <div class="text-center py-20">
                  <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <svg class="w-8 h-8 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                  </div>
                  <p class="text-gray-400 dark:text-gray-500 text-sm">No hay partidos en este estado</p>
                </div>
              } @else {
                <div class="space-y-2">
                  @for (match of filteredMatches(); track match.id) {
                    @if (match.status === 'live') {
                      <div class="relative rounded-xl border border-red-500/30 dark:border-red-500/20 bg-white dark:bg-[#111827] overflow-hidden shadow-lg shadow-red-500/5">
                        <div class="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-red-500 via-orange-500 to-yellow-500"></div>
                        <div class="p-4">
                          <div class="flex items-center justify-center gap-2 mb-3">
                            <span class="relative flex h-2 w-2">
                              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                              <span class="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                            </span>
                            <span class="text-[10px] font-bold text-red-500 uppercase tracking-wider">En vivo</span>
                            @if (match.time_elapsed != null) {
                              <span class="text-[10px] font-bold text-red-500">{{ match.time_elapsed }}'</span>
                            }
                          </div>
                          <button
                            type="button"
                            (click)="goToMatch(match)"
                            class="w-full flex items-center gap-3 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg"
                          >
                            <div class="flex flex-col items-center gap-1 flex-1 min-w-0">
                              <img [src]="match.home_flag" [alt]="t(match.home_team)" loading="lazy" (error)="handleImgError($event)" class="w-9 h-9 rounded-lg object-cover">
                              <span class="text-xs font-semibold text-gray-900 dark:text-white text-center truncate max-w-full">{{ t(match.home_team) }}</span>
                            </div>
                            <div class="flex items-center gap-2 shrink-0">
                              <span class="text-2xl font-black text-gray-900 dark:text-white tabular-nums">{{ match.home_score ?? 0 }}</span>
                              <span class="text-base text-gray-400 font-light">-</span>
                              <span class="text-2xl font-black text-gray-900 dark:text-white tabular-nums">{{ match.away_score ?? 0 }}</span>
                            </div>
                            <div class="flex flex-col items-center gap-1 flex-1 min-w-0">
                              <img [src]="match.away_flag" [alt]="t(match.away_team)" loading="lazy" (error)="handleImgError($event)" class="w-9 h-9 rounded-lg object-cover">
                              <span class="text-xs font-semibold text-gray-900 dark:text-white text-center truncate max-w-full">{{ t(match.away_team) }}</span>
                            </div>
                          </button>
                        </div>
                      </div>
                    } @else {
                      <button
                        type="button"
                        (click)="goToMatch(match)"
                        class="group w-full bg-white dark:bg-[#111827] hover:bg-gray-50 dark:hover:bg-[#1a2236] border border-gray-200 dark:border-white/5 hover:border-blue-300 dark:hover:border-blue-500/30 rounded-lg p-3.5 flex items-center gap-3 transition-all duration-200 cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                      >
                        <div class="w-12 text-center shrink-0">
                          @if (match.status === 'finished') {
                            <div class="text-[9px] font-bold text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded uppercase">Fin</div>
                          } @else {
                            <div class="text-[11px] font-bold text-gray-700 dark:text-gray-300">{{ formatTime(match.kickoff_at) }}</div>
                          }
                        </div>
                        <div class="flex-1 min-w-0 space-y-1">
                          <div class="flex items-center gap-2">
                            <img [src]="match.home_flag" [alt]="t(match.home_team)" loading="lazy" (error)="handleImgError($event)" class="w-4 h-4 rounded-sm object-cover shrink-0">
                            <span class="text-[13px] font-medium text-gray-900 dark:text-gray-100 truncate">{{ t(match.home_team) }}</span>
                            @if (match.status === 'finished') {
                              <span class="ml-auto text-sm font-bold text-gray-900 dark:text-white tabular-nums">{{ match.home_score }}</span>
                            }
                          </div>
                          <div class="flex items-center gap-2">
                            <img [src]="match.away_flag" [alt]="t(match.away_team)" loading="lazy" (error)="handleImgError($event)" class="w-4 h-4 rounded-sm object-cover shrink-0">
                            <span class="text-[13px] font-medium text-gray-900 dark:text-gray-100 truncate">{{ t(match.away_team) }}</span>
                            @if (match.status === 'finished') {
                              <span class="ml-auto text-sm font-bold text-gray-900 dark:text-white tabular-nums">{{ match.away_score }}</span>
                            }
                          </div>
                        </div>
                        <svg class="w-4 h-4 text-gray-400 dark:text-gray-600 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                        </svg>
                      </button>
                    }
                  }
                </div>
              }
            </section>
          }
          @case ('standings') {
            <section
              role="tabpanel"
              [id]="panelId('standings')"
              [attr.aria-labelledby]="tabId('standings')"
              [attr.tabindex]="0"
              class="focus:outline-none"
            >
              @if (standingsLoading()) {
                <div class="bg-white dark:bg-[#111827] border border-gray-200 dark:border-white/5 rounded-2xl p-4 animate-pulse">
                  @for (i of [1,2,3,4]; track i) {
                    <div class="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                  }
                </div>
              } @else if (standings().length === 0) {
                <div class="text-center py-20 bg-white dark:bg-[#111827] rounded-2xl border border-gray-200 dark:border-white/5">
                  <div class="w-14 h-14 mx-auto mb-3 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <span class="material-symbols-outlined text-gray-400 text-2xl">leaderboard</span>
                  </div>
                  <p class="text-gray-500 dark:text-gray-400 text-sm font-medium">Esta competición no tiene tabla de posiciones</p>
                  <p class="text-gray-400 dark:text-gray-500 text-xs mt-1">Las copas internacionales (Champions, Libertadores) se juegan por fases</p>
                </div>
              } @else {
                @for (group of groupedStandings(); track group.label) {
                  <div class="mb-4 bg-white dark:bg-[#111827] border border-gray-200 dark:border-white/5 rounded-2xl overflow-hidden">
                    @if (group.label) {
                      <div class="px-4 py-2.5 border-b border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/2">
                        <h3 class="text-xs font-black uppercase tracking-wider text-gray-600 dark:text-gray-400">{{ group.label }}</h3>
                      </div>
                    }
                    <div class="overflow-x-auto">
                      <table class="w-full text-sm">
                        <thead>
                          <tr class="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-white/5">
                            <th class="px-3 py-2 text-left w-8">#</th>
                            <th class="px-3 py-2 text-left">Equipo</th>
                            <th class="px-2 py-2 text-center w-9">PJ</th>
                            <th class="px-2 py-2 text-center w-9">G</th>
                            <th class="px-2 py-2 text-center w-9">E</th>
                            <th class="px-2 py-2 text-center w-9">P</th>
                            <th class="px-2 py-2 text-center w-9">GF</th>
                            <th class="px-2 py-2 text-center w-9">GC</th>
                            <th class="px-2 py-2 text-center w-9">DG</th>
                            <th class="px-3 py-2 text-center w-12 font-black">Pts</th>
                          </tr>
                        </thead>
                        <tbody>
                          @for (row of group.rows; track row.team_external_id) {
                            <tr class="border-b border-gray-50 dark:border-white/2 last:border-0 hover:bg-gray-50 dark:hover:bg-white/2 transition-colors">
                              <td class="px-3 py-2.5">
                                <span [class]="row.rank <= qualifyCutoff() ? 'inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-black' : 'text-xs font-bold text-gray-500 dark:text-gray-400'">
                                  {{ row.rank }}
                                </span>
                              </td>
                              <td class="px-3 py-2.5">
                                <div class="flex items-center gap-2 min-w-0">
                                  @if (row.team_logo) {
                                    <img [src]="row.team_logo" [alt]="row.team" loading="lazy" class="w-5 h-5 rounded object-cover shrink-0">
                                  }
                                  <span class="text-sm font-semibold text-gray-900 dark:text-white truncate">{{ t(row.team) }}</span>
                                </div>
                              </td>
                              <td class="px-2 py-2.5 text-center text-xs text-gray-600 dark:text-gray-400 tabular-nums">{{ row.played }}</td>
                              <td class="px-2 py-2.5 text-center text-xs text-gray-600 dark:text-gray-400 tabular-nums">{{ row.win }}</td>
                              <td class="px-2 py-2.5 text-center text-xs text-gray-600 dark:text-gray-400 tabular-nums">{{ row.draw }}</td>
                              <td class="px-2 py-2.5 text-center text-xs text-gray-600 dark:text-gray-400 tabular-nums">{{ row.lose }}</td>
                              <td class="px-2 py-2.5 text-center text-xs text-gray-600 dark:text-gray-400 tabular-nums">{{ row.gf }}</td>
                              <td class="px-2 py-2.5 text-center text-xs text-gray-600 dark:text-gray-400 tabular-nums">{{ row.ga }}</td>
                              <td class="px-2 py-2.5 text-center text-xs tabular-nums" [class.text-emerald-600]="row.gd > 0" [class.dark:text-emerald-400]="row.gd > 0" [class.font-semibold]="row.gd > 0" [class.text-red-500]="row.gd < 0" [class.text-gray-600]="row.gd === 0" [class.dark:text-gray-400]="row.gd === 0">
                                {{ row.gd > 0 ? '+' : '' }}{{ row.gd }}
                              </td>
                              <td class="px-3 py-2.5 text-center">
                                <span class="text-sm font-black text-gray-900 dark:text-white tabular-nums">{{ row.points }}</span>
                              </td>
                            </tr>
                          }
                        </tbody>
                      </table>
                    </div>
                  </div>
                }
              }
            </section>
          }
          @case ('scorers') {
            <section
              role="tabpanel"
              [id]="panelId('scorers')"
              [attr.aria-labelledby]="tabId('scorers')"
              [attr.tabindex]="0"
              class="focus:outline-none"
            >
              <!-- Sub-tabs Goles / Asistencias -->
              <div class="flex gap-1 mb-4 bg-white dark:bg-[#111827] border border-gray-200 dark:border-white/5 rounded-lg p-1">
                @for (st of scorerTabs; track st.id) {
                  <button
                    type="button"
                    (click)="scorerCategory.set(st.id)"
                    [class.flex-1]="true"
                    [class.px-3]="true"
                    [class.py-2]="true"
                    [class.text-xs]="true"
                    [class.rounded-md]="true"
                    [class.transition-all]="true"
                    [class.text-gray-900]="scorerCategory() === st.id"
                    [class.dark:text-white]="scorerCategory() === st.id"
                    [class.bg-gray-100]="scorerCategory() === st.id"
                    [class.dark:bg-white/5]="scorerCategory() === st.id"
                    [class.font-semibold]="scorerCategory() === st.id"
                    [class.text-gray-500]="scorerCategory() !== st.id"
                    [class.dark:text-gray-400]="scorerCategory() !== st.id"
                    [class.font-medium]="scorerCategory() !== st.id"
                    [class.hover:text-gray-700]="scorerCategory() !== st.id"
                    [class.dark:hover:text-gray-200]="scorerCategory() !== st.id"
                    [class.cursor-pointer]="scorerCategory() !== st.id"
                  >
                    {{ st.label }}
                    @if (scorerCountByCategory()[st.id] > 0) {
                      <span class="ml-1 text-[10px] text-gray-400 dark:text-gray-500">({{ scorerCountByCategory()[st.id] }})</span>
                    }
                  </button>
                }
              </div>

              @if (scorersLoading()) {
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  @for (i of [1,2,3,4,5,6]; track i) {
                    <div class="bg-white dark:bg-[#111827] border border-gray-200 dark:border-white/5 rounded-xl p-3 animate-pulse h-16"></div>
                  }
                </div>
              } @else if (filteredScorers().length === 0) {
                <div class="text-center py-20 bg-white dark:bg-[#111827] rounded-2xl border border-gray-200 dark:border-white/5">
                  <div class="w-14 h-14 mx-auto mb-3 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <span class="material-symbols-outlined text-gray-400 text-2xl">sports_soccer</span>
                  </div>
                  <p class="text-gray-500 dark:text-gray-400 text-sm font-medium">Sin datos de {{ scorerCategory() === 'goals' ? 'goleadores' : 'asistencias' }} todavía</p>
                  <p class="text-gray-400 dark:text-gray-500 text-xs mt-1">Los datos aparecen cuando arranca la temporada</p>
                </div>
              } @else {
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  @for (scorer of filteredScorers(); track scorer.category + '-' + scorer.rank + '-' + scorer.name) {
                    <div [class]="scorer.rank === 1
                      ? 'flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-700/30 rounded-xl border-l-4'
                      : 'flex items-center gap-3 p-3 bg-white dark:bg-[#111827] border border-gray-200 dark:border-white/5 rounded-xl'">
                      <span class="text-base font-black text-gray-400 dark:text-gray-500 tabular-nums w-6 text-center">{{ scorer.rank }}</span>
                      @if (scorer.teamFlag) {
                        <img [src]="scorer.teamFlag" [alt]="scorer.team" loading="lazy" (error)="handleImgError($event)" class="w-7 h-5 rounded-sm object-cover bg-gray-100 dark:bg-gray-800 shrink-0">
                      } @else {
                        <div class="w-7 h-5 rounded-sm bg-gray-200 dark:bg-gray-700 shrink-0"></div>
                      }
                      <div class="flex-1 min-w-0">
                        <p class="text-sm font-semibold text-gray-900 dark:text-white truncate">{{ scorer.name }}</p>
                        <p class="text-xs text-gray-500 dark:text-gray-400 truncate">{{ t(scorer.team) }}</p>
                      </div>
                      <div class="text-right shrink-0">
                        <p class="text-lg font-black text-gray-900 dark:text-white tabular-nums leading-none">{{ scorer.value }}</p>
                        <p class="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">{{ scorer.category === 'goals' ? 'goles' : 'asist.' }}</p>
                      </div>
                    </div>
                  }
                </div>
              }
            </section>
          }
          @case ('cruces') {
            <section
              role="tabpanel"
              [id]="panelId('cruces')"
              [attr.aria-labelledby]="tabId('cruces')"
              [attr.tabindex]="0"
              class="focus:outline-none"
            >
              <app-bracket />
            </section>
          }
        }
      </div>
    </div>
  `
})
export class LeagueDetailComponent {
  private readonly router = inject(Router);
  private readonly data = inject(LeagueDataService);

  /** Slug de la liga, hidratado desde el path param gracias a `withComponentInputBinding()`. */
  readonly slug = input.required<string>();

  /** Tracks si el primer valor del stream ya llegó — separa "cargando" de "vacío legítimo". */
  private readonly matchesLoaded = signal(false);
  private readonly standingsLoaded = signal(false);
  private readonly scorersLoaded = signal(false);

  /** Streams per-tab — `toSignal` los activa al navegar a la ruta, sin `ngOnInit`. */
  private readonly matches$ = toObservable(this.slug).pipe(
    switchMap(s => this.data.sources(s).matches$),
    tap(() => this.matchesLoaded.set(true))
  );
  private readonly standings$ = toObservable(this.slug).pipe(
    switchMap(s => this.data.sources(s).standings$),
    tap(() => this.standingsLoaded.set(true))
  );
  private readonly scorers$ = toObservable(this.slug).pipe(
    switchMap(s => this.data.sources(s).scorers$),
    tap(() => this.scorersLoaded.set(true))
  );

  readonly matches = toSignal(this.matches$, { initialValue: [] as Match[] });
  readonly standings = toSignal(this.standings$, { initialValue: [] as GroupStanding[] });
  readonly scorers = toSignal(this.scorers$, { initialValue: [] as ScorerRow[] });

  /** Cargando = stream aún no emitió su primer valor. Vacío = datos legítimamente vacíos. */
  readonly matchesLoading = computed(() => !this.matchesLoaded());
  readonly standingsLoading = computed(() => !this.standingsLoaded());
  readonly scorersLoading = computed(() => !this.scorersLoaded());

  readonly league = computed(() => getLeague(this.slug()));
  readonly t = translateTeamName;

  readonly matchStatusTabs: { id: MatchTabId; label: string }[] = [
    { id: 'live', label: 'En vivo' },
    { id: 'scheduled', label: 'Próximos' },
    { id: 'finished', label: 'Resultados' },
  ];

  readonly scorerTabs: { id: ScorerCategoryId; label: string }[] = [
    { id: 'goals', label: 'Goles' },
    { id: 'assists', label: 'Asistencias' },
  ];

  readonly activeTab = signal<LeagueTabId>('matches');
  readonly matchStatus = signal<MatchTabId>('live');
  readonly scorerCategory = signal<ScorerCategoryId>('goals');

  readonly filteredMatches = computed(() => {
    const status = this.matchStatus();
    return this.matches().filter(m => m.status === status);
  });

  readonly filteredScorers = computed(() => {
    const cat = this.scorerCategory();
    return this.scorers().filter(s => s.category === cat);
  });

  readonly scorerCountByCategory = computed(() => {
    const all = this.scorers();
    return {
      goals: all.filter(s => s.category === 'goals').length,
      assists: all.filter(s => s.category === 'assists').length,
    };
  });

  readonly countByStatus = computed(() => {
    const matches = this.matches();
    return {
      live: matches.filter(m => m.status === 'live').length,
      scheduled: matches.filter(m => m.status === 'scheduled').length,
      finished: matches.filter(m => m.status === 'finished').length,
    };
  });

  readonly groupedStandings = computed(() => {
    const all = this.standings();
    if (all.length === 0) return [];
    const byGroup = new Map<string, GroupStanding[]>();
    for (const s of all) {
      const key = s.group_name || '';
      const list = byGroup.get(key) ?? [];
      list.push(s);
      byGroup.set(key, list);
    }
    return Array.from(byGroup.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, rows]) => ({ label, rows: rows.sort((a, b) => a.rank - b.rank) }));
  });

  tabId(tab: LeagueTabId): string {
    return `tab-${this.slug()}-${tab}`;
  }

  panelId(tab: LeagueTabId): string {
    return `panel-${this.slug()}-${tab}`;
  }

  /** Arrow keys para navegar entre tabs (WAI-ARIA tabs pattern). */
  onTabKey(event: KeyboardEvent, current: LeagueTabId) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const order: LeagueTabId[] = ['matches', 'standings', 'scorers', 'cruces'];
    const idx = order.indexOf(current);
    const next = event.key === 'ArrowRight'
      ? order[(idx + 1) % order.length]
      : order[(idx - 1 + order.length) % order.length];
    this.activeTab.set(next);
    queueMicrotask(() => document.getElementById(this.tabId(next))?.focus());
  }

  qualifyCutoff(): number {
    return 4;
  }

  formatTime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
  }

  handleImgError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }

  goToMatch(match: Match) {
    this.router.navigate(['/stream', match.id]);
  }
}