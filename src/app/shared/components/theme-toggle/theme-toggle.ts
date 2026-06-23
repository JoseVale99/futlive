import { Component, computed, inject } from '@angular/core';
import { ThemeService } from '../../../core/services/theme-service';
import { THEME_ARIA_LABELS, ResolvedTheme, ThemePreference } from '../../../core/models/theme-model';

const getAnnouncementText = (theme: ThemePreference, resolved: ResolvedTheme): string => {
  switch (theme) {
    case 'light':
      return 'Modo claro activado';
    case 'dark':
      return 'Modo oscuro activado';
    case 'system':
      return `Modo sistema activado (${resolved === 'dark' ? 'oscuro' : 'claro'})`;
  }
};

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  template: `
    <button
      (click)="themeService.cycleTheme()"
      [attr.aria-label]="ariaLabel()"
      class="relative min-w-[44px] min-h-[44px] flex items-center justify-center
             rounded-xl transition-colors duration-200
             hover:bg-gray-100 dark:hover:bg-white/10
             focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
             dark:focus:ring-offset-gray-900"
    >
      <!-- Sun icon (for light mode) -->
      @if (themeService.icon() === 'sun') {
        <svg class="w-6 h-6 text-gray-800 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      }

      <!-- Moon icon (for dark mode) -->
      @if (themeService.icon() === 'moon') {
        <svg class="w-6 h-6 text-gray-800 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      }

      <!-- Monitor icon (for system mode) -->
      @if (themeService.icon() === 'monitor') {
        <svg class="w-6 h-6 text-gray-800 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      }
    </button>

    <span class="sr-only" aria-live="polite">{{ announcement() }}</span>
  `
})
export class ThemeToggleComponent {
  protected readonly themeService = inject(ThemeService);

  protected readonly ariaLabel = computed(() => {
    return THEME_ARIA_LABELS[this.themeService.preference()];
  });

  protected readonly announcement = computed(() => {
    return getAnnouncementText(
      this.themeService.preference(),
      this.themeService.resolvedTheme()
    );
  });
}
