import { create } from 'zustand';
import * as FileSystem from 'expo-file-system/legacy';

import type { ScriptLength } from '../types';
import { setThemeMode as applyThemeMode, type ThemeMode } from '../constants/theme';

const STORE_FILE = (FileSystem.documentDirectory ?? '') + 'settings-store.json';

async function readStore(): Promise<Record<string, string>> {
  try {
    const info = await FileSystem.getInfoAsync(STORE_FILE);
    if (!info.exists) return {};
    const content = await FileSystem.readAsStringAsync(STORE_FILE);
    return JSON.parse(content);
  } catch {
    return {};
  }
}

async function writeStore(data: Record<string, string>): Promise<void> {
  try {
    await FileSystem.writeAsStringAsync(STORE_FILE, JSON.stringify(data));
  } catch (e) {
    console.warn('[settingsStore] write error', e);
  }
}

async function getItem(k: string): Promise<string | null> {
  const store = await readStore();
  return store[k] ?? null;
}

async function setItem(k: string, value: string): Promise<void> {
  const store = await readStore();
  store[k] = value;
  await writeStore(store);
}

async function removeItem(k: string): Promise<void> {
  const store = await readStore();
  delete store[k];
  await writeStore(store);
}

const PREFIX = 'private-podcast.settings.';
const key = (name: string) => `${PREFIX}${name}`;

function parseScriptLength(value?: string | null): ScriptLength {
  if (value === 'short' || value === 'normal' || value === 'long') return value;
  return 'normal';
}

function parseNumber(value?: string | null): number | undefined {
  if (value == null) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

type SettingsStoreState = {
  preferredModelId?: string;
  host1VoiceId?: string;
  host2VoiceId?: string;
  scriptLength: ScriptLength;
  pauseMs: number;
  themeMode: ThemeMode;
  hydrate: () => Promise<void>;
  setPreferredModelId: (value?: string) => Promise<void>;
  setHost1VoiceId: (value?: string) => Promise<void>;
  setHost2VoiceId: (value?: string) => Promise<void>;
  setScriptLength: (value: ScriptLength) => Promise<void>;
  setPauseMs: (value: number) => Promise<void>;
  setThemeMode: (value: ThemeMode) => Promise<void>;
};

export const useSettingsStore = create<SettingsStoreState>((set) => ({
  preferredModelId: undefined,
  host1VoiceId:     undefined,
  host2VoiceId:     undefined,
  scriptLength:     'normal',
  pauseMs:          400,
  themeMode:        'light',

  hydrate: async () => {
    const [preferredModelId, host1VoiceId, host2VoiceId, scriptLengthRaw, pauseRaw, themeModeRaw] =
      await Promise.all([
        getItem(key('preferredModelId')),
        getItem(key('host1VoiceId')),
        getItem(key('host2VoiceId')),
        getItem(key('scriptLength')),
        getItem(key('pauseMs')),
        getItem(key('themeMode')),
      ]);
    const pauseParsed = parseNumber(pauseRaw);
    const themeMode: ThemeMode = themeModeRaw === 'dark' ? 'dark' : 'light';
    set({
      preferredModelId: preferredModelId ?? undefined,
      host1VoiceId:     host1VoiceId ?? undefined,
      host2VoiceId:     host2VoiceId ?? undefined,
      scriptLength:     parseScriptLength(scriptLengthRaw),
      pauseMs:          pauseParsed != null ? Math.max(0, Math.round(pauseParsed)) : 400,
      themeMode,
    });
    applyThemeMode(themeMode);
  },

  setPreferredModelId: async (value) => {
    if (value) await setItem(key('preferredModelId'), value);
    else await removeItem(key('preferredModelId'));
    set({ preferredModelId: value });
  },

  setHost1VoiceId: async (value) => {
    if (value) await setItem(key('host1VoiceId'), value);
    else await removeItem(key('host1VoiceId'));
    set({ host1VoiceId: value });
  },

  setHost2VoiceId: async (value) => {
    if (value) await setItem(key('host2VoiceId'), value);
    else await removeItem(key('host2VoiceId'));
    set({ host2VoiceId: value });
  },

  setScriptLength: async (value) => {
    await setItem(key('scriptLength'), value);
    set({ scriptLength: value });
  },

  setPauseMs: async (value) => {
    const normalized = Number.isFinite(value) ? Math.max(0, Math.round(value)) : 400;
    await setItem(key('pauseMs'), String(normalized));
    set({ pauseMs: normalized });
  },

  setThemeMode: async (value) => {
    const normalized: ThemeMode = value === 'dark' ? 'dark' : 'light';
    await setItem(key('themeMode'), normalized);
    applyThemeMode(normalized);
    set({ themeMode: normalized });
  },
}));
