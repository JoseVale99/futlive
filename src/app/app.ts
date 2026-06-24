import { Component, inject, OnInit } from '@angular/core';
import { RouterModule, Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';
import { ThemeToggleComponent } from './shared/components/theme-toggle/theme-toggle';
import { LoadingBarComponent } from './shared/components/loading-bar/loading-bar';
import { ThemeService } from './core/services/theme-service';
import { LoadingService } from './core/services/loading-service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule, ThemeToggleComponent, LoadingBarComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  protected readonly themeService = inject(ThemeService);
  private readonly router = inject(Router);
  private readonly loadingService = inject(LoadingService);

  ngOnInit() {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        this.loadingService.setRouteLoading(true);
      } else if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      ) {
        this.loadingService.setRouteLoading(false);
      }
    });
  }
}
