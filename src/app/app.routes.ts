import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: '/ligas/worldcup'
  },
  {
    path: 'posiciones',
    redirectTo: '/ligas/worldcup'
  },
  {
    path: 'estadisticas',
    redirectTo: '/ligas/worldcup'
  },
  {
    path: 'stream/:matchId',
    loadComponent: () => import('./features/streaming/streaming-view/streaming-view').then(m => m.StreamingViewComponent)
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
