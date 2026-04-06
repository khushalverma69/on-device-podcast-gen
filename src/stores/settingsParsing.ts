import type { ThemeMode } from '../constants/theme';
import type { ScriptLength } from '../types';

export function parseScriptLength(value?: string | null): ScriptLength {
  if (value === 'short' || value === 'normal' || value === 'long') return value;
  return 'normal';
}

export function parseNumber(value?: string | null): number | undefined {
  if (value == null) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export function parseThemeMode(value?: string | null): ThemeMode {
  return value === 'dark' ? 'dark' : 'light';
}

export function parseBoolean(value?: string | null, fallback = false): boolean {
  if (value == null) return fallback;
  return value === 'true';
}
