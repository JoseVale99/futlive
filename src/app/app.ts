import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { StatusFilterComponent } from './features/matches/status-filter/status-filter';
import { MatchListComponent } from './features/matches/match-list/match-list';
import { ThemeToggleComponent } from './shared/components/theme-toggle/theme-toggle';
import { MatchService } from './core/services/match-service';
import { ThemeService } from './core/services/theme-service';
import { MatchStatus } from './core/models/match-model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [StatusFilterComponent, MatchListComponent, ThemeToggleComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy {
  protected readonly matchService = inject(MatchService);
  // Inject to ensure ThemeService initializes on bootstrap
  protected readonly themeService = inject(ThemeService);

  ngOnInit() {
    // Iniciar con partidos en vivo por defecto
    this.matchService.setStatus('live');
  }

  onStatusChange(status: MatchStatus) {
    this.matchService.setStatus(status);
  }

  ngOnDestroy() {
    this.matchService.stopPolling();
  }
}
