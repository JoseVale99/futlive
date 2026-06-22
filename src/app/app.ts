import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { StatusFilterComponent } from './features/matches/status-filter/status-filter';
import { MatchListComponent } from './features/matches/match-list/match-list';
import { MatchService } from './core/services/match-service';
import { MatchStatus } from './core/models/match-model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [StatusFilterComponent, MatchListComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy {
  protected readonly matchService = inject(MatchService);

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
