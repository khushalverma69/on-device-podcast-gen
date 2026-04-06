export type ThemeMode = 'light' | 'dark';

type ThemeTokens = {
  background: string;
  surface: string;
  card: string;
  groupBg: string;
  primary: string;
  primaryLight: string;
  primaryGlow: string;
  primaryMid: string;
  teal: string;
  tealLight: string;
  mint: string;
  mintLight: string;
  coral: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;
  divider: string;
  border: string;
  host1: string;
  host1Bg: string;
  host2: string;
  host2Bg: string;
  shadowColor: string;
  shadowPrimary: string;
};

const lightTheme: ThemeTokens = {
  background: '#F2F2F7',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  groupBg: '#F2F2F7',
  primary: '#6366F1',
  primaryLight: 'rgba(99,102,241,0.12)',
  primaryGlow: 'rgba(99,102,241,0.35)',
  primaryMid: 'rgba(99,102,241,0.25)',
  teal: '#0EA5E9',
  tealLight: 'rgba(14,165,233,0.12)',
  mint: '#34C759',
  mintLight: 'rgba(52,199,89,0.12)',
  coral: '#FF3B30',
  textPrimary: '#1C1C1E',
  textSecondary: '#8E8E93',
  textTertiary: '#C7C7CC',
  textInverse: '#FFFFFF',
  divider: '#E5E5EA',
  border: '#D1D1D6',
  host1: '#6366F1',
  host1Bg: 'rgba(99,102,241,0.10)',
  host2: '#0EA5E9',
  host2Bg: 'rgba(14,165,233,0.10)',
  shadowColor: '#000000',
  shadowPrimary: '#6366F1',
};

const darkTheme: ThemeTokens = {
  background: '#0B0B10',
  surface: '#16161D',
  card: '#16161D',
  groupBg: '#0B0B10',
  primary: '#7C83FF',
  primaryLight: 'rgba(124,131,255,0.18)',
  primaryGlow: 'rgba(124,131,255,0.45)',
  primaryMid: 'rgba(124,131,255,0.30)',
  teal: '#3DB7F5',
  tealLight: 'rgba(61,183,245,0.20)',
  mint: '#44D680',
  mintLight: 'rgba(68,214,128,0.20)',
  coral: '#FF5E57',
  textPrimary: '#F7F7FA',
  textSecondary: '#A4A4B2',
  textTertiary: '#6E6E78',
  textInverse: '#FFFFFF',
  divider: '#262630',
  border: '#2F2F3A',
  host1: '#7C83FF',
  host1Bg: 'rgba(124,131,255,0.20)',
  host2: '#3DB7F5',
  host2Bg: 'rgba(61,183,245,0.20)',
  shadowColor: '#000000',
  shadowPrimary: '#7C83FF',
};

let activeMode: ThemeMode = 'light';

export function setThemeMode(mode: ThemeMode): void {
  activeMode = mode;
}

export function getThemeMode(): ThemeMode {
  return activeMode;
}

export function getTheme(): ThemeTokens {
  return activeMode === 'dark' ? darkTheme : lightTheme;
}

export const theme: ThemeTokens = new Proxy(lightTheme, {
  get: (_target, prop: keyof ThemeTokens) => getTheme()[prop],
}) as ThemeTokens;
