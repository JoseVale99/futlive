import { Component, inject, OnInit, signal, HostListener } from '@angular/core';
import { RouterModule, Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';
import { ThemeToggleComponent } from './shared/components/theme-toggle/theme-toggle';
import { LoadingBarComponent } from './shared/components/loading-bar/loading-bar';
import { ThemeService } from './core/services/theme-service';
import { LoadingService } from './core/services/loading-service';

interface NavLink {
  path: string;
  label: string;
  iconActive: string;
  iconInactive: string;
}

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

  readonly headerHidden = signal(false);
  readonly currentUrl = signal('/');
  private lastScrollY = 0;

  @HostListener('window:scroll')
  onScroll() {
    const currentY = window.scrollY;
    if (currentY > 60 && currentY > this.lastScrollY) {
      this.headerHidden.set(true);
    } else {
      this.headerHidden.set(false);
    }
    this.lastScrollY = currentY;
  }

  readonly links: NavLink[] = [
    {
      path: '/',
      label: 'Inicio',
      iconActive: 'M5 4h14a1 1 0 0 1 1 1v2a4 4 0 0 1-3 3.87V12a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5v-1.13A4 4 0 0 1 3 7V5a1 1 0 0 1 1-1zm2 4a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V6H7zm5 11a3 3 0 0 0 3-3v-1H9v1a3 3 0 0 0 3 3zm-3 1h6v2H9z',
      iconInactive: 'M5 4h14a1 1 0 0 1 1 1v2a4 4 0 0 1-3 3.87V12a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5v-1.13A4 4 0 0 1 3 7V5a1 1 0 0 1 1-1z',
    },
    {
      path: '/ligas',
      label: 'Ligas',
      iconActive: 'M3 3h18v18H3V3zm2 2v14h14V5H5zm2 2h10v2H7V7zm0 4h10v2H7v-2zm0 4h7v2H7v-2z',
      iconInactive: 'M3 21h18M5 21V10l7-4 7 4v11M9 21v-6h6v6M3 10h18',
    },
  ];

  isActive(path: string): boolean {
    const url = this.currentUrl();
    if (path === '/') return url === '/' || url.startsWith('/ligas/worldcup');
    if (path === '/ligas') return (url === '/ligas' || url.startsWith('/ligas/')) && !url.startsWith('/ligas/worldcup');
    return url === path || url.startsWith(path + '/');
  }

  ngOnInit() {
    this.currentUrl.set(this.router.url);
    this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        this.loadingService.setRouteLoading(true);
        this.currentUrl.set(event.url);
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