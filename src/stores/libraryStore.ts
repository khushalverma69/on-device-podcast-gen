import { create } from 'zustand';

import { clearEpisodes, deleteEpisode, getAllEpisodes, insertEpisode } from '../db/schema';
import { usePlayerStore } from './playerStore';
import type { Episode } from '../types';

type LibraryStoreState = {
  episodes: Episode[];
  loadEpisodes: () => Promise<void>;
  addEpisode: (episode: Episode) => Promise<void>;
  removeEpisode: (id: string) => Promise<void>;
  clearLibrary: () => Promise<void>;
};

export const useLibraryStore = create<LibraryStoreState>((set) => ({
  episodes: [],
  loadEpisodes: async () => {
    const episodes = await getAllEpisodes();
    set({ episodes });
    await usePlayerStore.getState().restoreFromLibrary(episodes);
  },
  addEpisode: async (episode) => {
    await insertEpisode(episode);
    const nextEpisodes = [episode, ...get().episodes.filter((item) => item.id !== episode.id)];
    set({ episodes: nextEpisodes });
    await usePlayerStore.getState().restoreFromLibrary(nextEpisodes);
  },
  removeEpisode: async (id) => {
    await deleteEpisode(id);
    const nextEpisodes = get().episodes.filter((item) => item.id !== id);
    set({ episodes: nextEpisodes });
    await usePlayerStore.getState().restoreFromLibrary(nextEpisodes);
  },
  clearLibrary: async () => {
    await clearEpisodes();
    set({ episodes: [] });
    await usePlayerStore.getState().restoreFromLibrary([]);
  },
}));
