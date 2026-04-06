import type { PlaybackIntegrityResult } from '../services/player';

export function summarizeBrokenEpisodes(results: PlaybackIntegrityResult[]): {
  brokenCount: number;
  missingFileCount: number;
  emptyFileCount: number;
  missingPathCount: number;
} {
  return results.reduce(
    (summary, result) => {
      if (result.ok) return summary;
      summary.brokenCount += 1;
      if (result.code === 'missing_file') summary.missingFileCount += 1;
      if (result.code === 'empty_file') summary.emptyFileCount += 1;
      if (result.code === 'missing_path') summary.missingPathCount += 1;
      return summary;
    },
    {
      brokenCount: 0,
      missingFileCount: 0,
      emptyFileCount: 0,
      missingPathCount: 0,
    }
  );
}
