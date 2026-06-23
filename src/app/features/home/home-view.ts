import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { StatusFilterComponent } from '../matches/status-filter/status-filter';
import { MatchListComponent } from '../matches/match-list/match-list';
import { MatchService } from '../../core/services/match-service';
import { MatchStatus } from '../../core/models/match-model';

@Component({
  selector: 'app-home-view',
  standalone: true,
  imports: [StatusFilterComponent, MatchListComponent],
  template: `
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <app-status-filter
        [activeStatus]="matchService.activeStatus()"
        (statusChange)="onStatusChange($event)"
      />
      <div class="mt-6">
        <app-match-list />
      </div>
    </div>
  `
})
export class HomeViewComponent implements OnInit, OnDestroy {
  protected readonly matchService = inject(MatchService);

  ngOnInit() {
    // Iniciar con partidos en vivo por defecto si no hay uno activo
    if (!this.matchService.activeStatus()) {
      this.matchService.setStatus('live');
    }
  }

  onStatusChange(status: MatchStatus) {
    this.matchService.setStatus(status);
  }

  ngOnDestroy() {
    this.matchService.stopPolling();
  }
}
