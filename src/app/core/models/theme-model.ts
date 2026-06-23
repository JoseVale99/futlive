export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'nexatv-theme';

export const THEME_CYCLE_ORDER: readonly ThemePreference[] = ['light', 'dark', 'system'] as const;

export const THEME_ICONS: Record<ThemePreference, 'sun' | 'moon' | 'monitor'> = {
  light: 'sun',
  dark: 'moon',
  system: 'monitor',
};

export const THEME_ARIA_LABELS: Record<ThemePreference, string> = {
  light: 'Cambiar a modo oscuro',
  dark: 'Cambiar a modo sistema',
  system: 'Cambiar a modo claro',
};
