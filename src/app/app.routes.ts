import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'stream/:matchId',
    loadComponent: () => import('./features/streaming/streaming-view/streaming-view').then(m => m.StreamingViewComponent)
  },
  {
    path: 'posiciones',
    loadComponent: () => import('./features/standings/standings-view/standings-view').then(m => m.StandingsViewComponent)
  }
];
