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

type PlayerState = {
  currentEpisode:   Episode | null;
  isPlaying:        boolean;
  positionSeconds:  number;
  durationSeconds:  number;
  speed:            number;
  resumeByEpisode:  Record<string, number>;
  bookmarks:        Record<string, number[]>;
  play:             (episodeId: string) => Promise<void>;
  pause:            () => Promise<void>;
  setSpeed:         (speed: number) => Promise<void>;
  seekBy:           (offset: number) => Promise<void>;
  syncProgress:     () => Promise<void>;
  setProgress:      (position: number, duration: number) => void;
  setEpisode:       (episode: Episode) => void;
  addBookmark:      () => void;
};

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      currentEpisode:  null,
      isPlaying:       false,
      positionSeconds: 0,
      durationSeconds: 0,
      speed:           1,
      resumeByEpisode: {},
      bookmarks:       {},

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
          positionSeconds: state.resumeByEpisode[episode.id] ?? 0,
          durationSeconds: episode.durationSeconds ?? 0,
          isPlaying: false,
        })),

      addBookmark: () =>
        set((state) => {
          const id = state.currentEpisode?.id;
          if (!id) return state;
          const current = state.bookmarks[id] ?? [];
          const next = [...current, Math.round(state.positionSeconds)].sort((a, b) => a - b);
          return { bookmarks: { ...state.bookmarks, [id]: Array.from(new Set(next)) } } as any;
        }),
    }),
    {
      name: 'private-podcast-player-state',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        speed: state.speed,
        resumeByEpisode: state.resumeByEpisode,
        bookmarks: state.bookmarks,
      }),
    }
  )
);
