import {
  Injectable,
  signal,
  computed,
  effect,
} from '@angular/core';
import {
  ThemePreference,
  ResolvedTheme,
  THEME_STORAGE_KEY,
  THEME_CYCLE_ORDER,
  THEME_ICONS,
} from '../models/theme-model';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  // --- Public Signals ---
  readonly preference = signal<ThemePreference>('system');
  readonly resolvedTheme = computed<ResolvedTheme>(() => {
    const pref = this.preference();
    if (pref === 'light' || pref === 'dark') {
      return pref;
    }
    return this.systemPrefersDark ? 'dark' : 'light';
  });
  readonly icon = computed(() => THEME_ICONS[this.preference()]);

  // --- Internal State ---
  private systemPrefersDark = false;
  private mediaQueryList: MediaQueryList | null = null;

  constructor() {
    // Initialize from localStorage
    this.loadPreference();

    // Setup media query listener for system preference
    this.setupSystemListener();

    // Effect to apply DOM class whenever resolved theme changes
    effect(() => {
      const theme = this.resolvedTheme();
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    });
  }

  // --- Public Methods ---
  cycleTheme() {
    const currentIndex = THEME_CYCLE_ORDER.indexOf(this.preference());
    const nextIndex = (currentIndex + 1) % THEME_CYCLE_ORDER.length;
    const nextPref = THEME_CYCLE_ORDER[nextIndex];
    this.setTheme(nextPref);
  }

  setTheme(pref: ThemePreference) {
    this.preference.set(pref);
    this.savePreference(pref);
  }

  // --- Helpers ---
  private loadPreference() {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        this.preference.set(stored);
      }
    } catch (e) {
      // If localStorage is unavailable, just use default 'system'
    }
  }

  private savePreference(pref: ThemePreference) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, pref);
    } catch (e) {
      // If localStorage is unavailable, do nothing
    }
  }

  private setupSystemListener() {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }

    this.mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)');
    this.systemPrefersDark = this.mediaQueryList.matches;

    // Listen for changes
    this.mediaQueryList.addEventListener('change', (e) => {
      this.systemPrefersDark = e.matches;
      // Preference is 'system' so it will re-compute resolved theme
    });
  }
}
