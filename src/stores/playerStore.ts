import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  getPlaybackSnapshot,
  pausePlayback,
  playEpisode,
  seekBy as seekByPlayback,
  setPlaybackSpeed,
} from '../services/player';

interface Episode {
  id:              string;
  title:           string;
  mp3Path?:        string;
  durationSeconds?: number;
  modelUsed?:      string;
  turns?:          number;
  scriptJson?:     string;
  createdAt?:      number;
}

export type EpisodeBookmark = {
  id: string;
  seconds: number;
  label: string;
};

function normalizeBookmarks(
  raw: Record<string, EpisodeBookmark[] | number[] | undefined> | undefined
): Record<string, EpisodeBookmark[]> {
  if (!raw) return {};
  const out: Record<string, EpisodeBookmark[]> = {};
  for (const [episodeId, bookmarks] of Object.entries(raw)) {
    const list = bookmarks ?? [];
    out[episodeId] = list
      .map((bookmark, index) => {
        if (typeof bookmark === 'number') {
          const seconds = Math.max(0, Math.round(bookmark));
          return {
            id: `legacy-${episodeId}-${index}-${seconds}`,
            seconds,
            label: `At ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`,
          } satisfies EpisodeBookmark;
        }
        if (!bookmark || typeof bookmark !== 'object') return null;
        const seconds = Math.max(0, Math.round((bookmark as EpisodeBookmark).seconds ?? 0));
        const label = String((bookmark as EpisodeBookmark).label || '').trim()
          || `At ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
        return {
          id: String((bookmark as EpisodeBookmark).id || `bm-${episodeId}-${index}-${seconds}`),
          seconds,
          label,
        } satisfies EpisodeBookmark;
      })
      .filter((item): item is EpisodeBookmark => Boolean(item))
      .sort((a, b) => a.seconds - b.seconds);
  }
  return out;
}

type PlayerState = {
  currentEpisode:   Episode | null;
  isPlaying:        boolean;
  positionSeconds:  number;
  durationSeconds:  number;
  speed:            number;
  lastEpisodeId?:   string;
  resumeByEpisode:  Record<string, number>;
  bookmarks:        Record<string, EpisodeBookmark[]>;
  queueEpisodeIds:  string[];
  queueIndex:       number;
  play:             (episodeId: string) => Promise<void>;
  pause:            () => Promise<void>;
  setSpeed:         (speed: number) => Promise<void>;
  seekBy:           (offset: number) => Promise<void>;
  syncProgress:     () => Promise<void>;
  setProgress:      (position: number, duration: number) => void;
  setEpisode:       (episode: Episode) => void;
  addBookmark:      () => void;
  renameBookmark:   (bookmarkId: string, label: string) => void;
  deleteBookmark:   (bookmarkId: string) => void;
  setQueue:         (episodeIds: string[], currentEpisodeId?: string) => void;
  playNextInQueue:  () => string | null;
  playPrevInQueue:  () => string | null;
};

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      currentEpisode:  null,
      isPlaying:       false,
      positionSeconds: 0,
      durationSeconds: 0,
      speed:           1,
      lastEpisodeId:   undefined,
      resumeByEpisode: {},
      bookmarks:       {},
      queueEpisodeIds: [],
      queueIndex:      -1,

      play: async (episodeId: string) => {
        const { currentEpisode } = get();
        if (!currentEpisode || currentEpisode.id !== episodeId) {
          return;
        }

        try {
          await playEpisode(currentEpisode);
          const snap = await getPlaybackSnapshot();
          set({
            isPlaying: snap.isPlaying,
            positionSeconds: snap.position,
            durationSeconds: snap.duration > 0 ? snap.duration : (currentEpisode.durationSeconds ?? 0),
          });
        } catch (e) {
          console.warn('[playerStore] play failed', e);
          set({ isPlaying: false });
        }
      },

      pause: async () => {
        try {
          await pausePlayback();
        } catch (e) {
          console.warn('[playerStore] pause failed', e);
        }
        set({ isPlaying: false });
      },

      setSpeed: async (speed) => {
        set({ speed });
        try {
          await setPlaybackSpeed(speed);
        } catch (e) {
          console.warn('[playerStore] setSpeed failed', e);
        }
      },

      seekBy: async (offset) => {
        try {
          await seekByPlayback(offset);
          const snap = await getPlaybackSnapshot();
          const episodeId = get().currentEpisode?.id;
          set((state) => ({
            positionSeconds: snap.position,
            durationSeconds: snap.duration,
            isPlaying: snap.isPlaying,
            resumeByEpisode: episodeId
              ? { ...state.resumeByEpisode, [episodeId]: snap.position }
              : state.resumeByEpisode,
          }));
        } catch (e) {
          console.warn('[playerStore] seek failed', e);
        }
      },

      syncProgress: async () => {
        try {
          const snap = await getPlaybackSnapshot();
          const episodeId = get().currentEpisode?.id;
          set((state) => ({
            positionSeconds: snap.position,
            durationSeconds: snap.duration,
            isPlaying: snap.isPlaying,
            resumeByEpisode: episodeId
              ? { ...state.resumeByEpisode, [episodeId]: snap.position }
              : state.resumeByEpisode,
          }));
        } catch {
          // ignore when player isn't initialized yet
        }
      },

      setProgress: (position, duration) =>
        set({ positionSeconds: position, durationSeconds: duration }),

      setEpisode: (episode) =>
        set((state) => ({
          currentEpisode: episode,
          lastEpisodeId: episode.id,
          queueIndex: state.queueEpisodeIds.findIndex((id) => id === episode.id),
          positionSeconds: state.resumeByEpisode[episode.id] ?? 0,
          durationSeconds: episode.durationSeconds ?? 0,
          isPlaying: false,
        })),

      addBookmark: () =>
        set((state) => {
          const id = state.currentEpisode?.id;
          if (!id) return state;
          const current = normalizeBookmarks(state.bookmarks)[id] ?? [];
          const seconds = Math.round(state.positionSeconds);
          if (current.some((bookmark) => bookmark.seconds === seconds)) return state;
          const next = [
            ...current,
            {
              id: `bm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
              seconds,
              label: `At ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`,
            },
          ].sort((a, b) => a.seconds - b.seconds);
          return { bookmarks: { ...state.bookmarks, [id]: next } } as any;
        }),

      renameBookmark: (bookmarkId, label) =>
        set((state) => {
          const episodeId = state.currentEpisode?.id;
          if (!episodeId) return state;
          const nextLabel = label.trim();
          if (!nextLabel) return state;
          const current = normalizeBookmarks(state.bookmarks)[episodeId] ?? [];
          return {
            bookmarks: {
              ...state.bookmarks,
              [episodeId]: current.map((bookmark) =>
                bookmark.id === bookmarkId ? { ...bookmark, label: nextLabel } : bookmark
              ),
            },
          } as any;
        }),

      deleteBookmark: (bookmarkId) =>
        set((state) => {
          const episodeId = state.currentEpisode?.id;
          if (!episodeId) return state;
          const current = normalizeBookmarks(state.bookmarks)[episodeId] ?? [];
          return {
            bookmarks: {
              ...state.bookmarks,
              [episodeId]: current.filter((bookmark) => bookmark.id !== bookmarkId),
            },
          } as any;
        }),

      setQueue: (episodeIds, currentEpisodeId) =>
        set(() => {
          const queue = Array.from(new Set(episodeIds.filter(Boolean)));
          const queueIndex =
            currentEpisodeId != null ? queue.findIndex((id) => id === currentEpisodeId) : -1;
          return { queueEpisodeIds: queue, queueIndex };
        }),

      playNextInQueue: () => {
        const state = get();
        if (state.queueIndex < 0) return null;
        const nextIndex = state.queueIndex + 1;
        const nextId = state.queueEpisodeIds[nextIndex];
        if (!nextId) return null;
        set({ queueIndex: nextIndex, lastEpisodeId: nextId });
        return nextId;
      },

      playPrevInQueue: () => {
        const state = get();
        if (state.queueIndex <= 0) return null;
        const prevIndex = state.queueIndex - 1;
        const prevId = state.queueEpisodeIds[prevIndex];
        if (!prevId) return null;
        set({ queueIndex: prevIndex, lastEpisodeId: prevId });
        return prevId;
      },
    }),
    {
      name: 'private-podcast-player-state',
      storage: createJSONStorage(() => AsyncStorage),
      merge: (persistedState, currentState) => {
        const persisted = (persistedState as Partial<PlayerState>) ?? {};
        return {
          ...currentState,
          ...persisted,
          bookmarks: normalizeBookmarks((persisted as any).bookmarks),
        } as PlayerState;
      },
      partialize: (state) => ({
        speed: state.speed,
        lastEpisodeId: state.lastEpisodeId,
        resumeByEpisode: state.resumeByEpisode,
        bookmarks: state.bookmarks,
        queueEpisodeIds: state.queueEpisodeIds,
        queueIndex: state.queueIndex,
      }),
    }
  )
);
