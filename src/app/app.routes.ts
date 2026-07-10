import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home-view').then(m => m.HomeViewComponent)
  },
  {
    path: 'stream/:matchId',
    loadComponent: () => import('./features/streaming/streaming-view/streaming-view').then(m => m.StreamingViewComponent)
  },
  {
    path: 'posiciones',
    loadComponent: () => import('./features/standings/standings-view/standings-view').then(m => m.StandingsViewComponent)
  },
  {
    path: 'estadisticas',
    loadComponent: () => import('./features/scorers/scorers-view').then(m => m.ScorersViewComponent)
  },
  {
    path: 'ligas',
    loadComponent: () => import('./features/leagues/leagues-landing').then(m => m.LeaguesLandingComponent)
  },
  {
    path: 'ligas/:slug',
    loadComponent: () => import('./features/leagues/league-detail').then(m => m.LeagueDetailComponent)
  },
  {
    path: '**',
    loadComponent: () => import('./features/not-found/not-found').then(m => m.NotFoundComponent)
  }
];
