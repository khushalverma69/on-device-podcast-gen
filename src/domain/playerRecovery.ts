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

export function getNextQueuedEpisodeId(
  queueEpisodeIds: string[],
  queueIndex: number,
  availableEpisodeIds: string[],
): string | null {
  if (queueIndex < 0) return null;
  const available = new Set(availableEpisodeIds);
  for (let index = queueIndex + 1; index < queueEpisodeIds.length; index += 1) {
    const episodeId = queueEpisodeIds[index];
    if (available.has(episodeId)) return episodeId;
  }
  return null;
}

export function getCompletedPosition(position: number, duration?: number): number {
  if (duration && duration > 0) return Math.round(duration);
  return Math.max(0, Math.round(position));
}
