type EpisodeRef = { id: string };

export function pickRestorableEpisodeId(
  episodes: EpisodeRef[],
  lastEpisodeId: string | undefined,
  playableEpisodeIds: string[],
): string | null {
  const playableSet = new Set(playableEpisodeIds);
  if (lastEpisodeId && playableSet.has(lastEpisodeId) && episodes.some((episode) => episode.id === lastEpisodeId)) {
    return lastEpisodeId;
  }

  for (const episode of episodes) {
    if (playableSet.has(episode.id)) return episode.id;
  }

  return null;
}

export function filterEpisodeMap<T>(
  input: Record<string, T> | undefined,
  allowedEpisodeIds: string[],
): Record<string, T> {
  if (!input) return {};
  const allowed = new Set(allowedEpisodeIds);
  return Object.fromEntries(
    Object.entries(input).filter(([episodeId]) => allowed.has(episodeId))
  );
}

export function filterEpisodeIds(ids: string[] | undefined, allowedEpisodeIds: string[]): string[] {
  if (!ids?.length) return [];
  const allowed = new Set(allowedEpisodeIds);
  return Array.from(new Set(ids.filter((id) => allowed.has(id))));
}
